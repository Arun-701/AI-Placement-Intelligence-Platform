const assert = require("assert");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "faculty-set-continuation-retest-integration-secret";

const Assessment = require("../models/Assessment");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const AssessmentResult = require("../models/AssessmentResult");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const ReattemptAssignment = require("../models/ReattemptAssignment");
const Student = require("../models/Student");
const facultyRoutes = require("../routes/facultyRoutes");
const facultyAssessmentRoutes = require("../routes/facultyAssessmentRoutes");
const adminAssessmentRoutes = require("../routes/adminAssessmentRoutes");

const run = async () => {
    const mongo = await MongoMemoryServer.create();
    let server;
    try {
        await mongoose.connect(mongo.getUri());
        const faculty = await Faculty.create({
            name: "Set Workflow Faculty",
            email: "set-workflow-faculty@example.test",
            password: "test-password",
            department: "IT",
            approvalStatus: "APPROVED"
        });
        const admin = await Admin.create({
            name: "Set Workflow Admin",
            email: "set-workflow-admin@example.test",
            password: "test-password"
        });
        const otherFaculty = await Faculty.create({
            name: "Other Workflow Faculty",
            email: "other-workflow-faculty@example.test",
            password: "test-password",
            department: "IT",
            approvalStatus: "APPROVED"
        });
        const students = await Student.create([
            { name: "Set One Student", email: "set-one@example.test", password: "test-password", studentId: "IT-SET-1", department: "IT", year: 1 },
            { name: "Set Two Student", email: "set-two@example.test", password: "test-password", studentId: "IT-SET-2", department: "IT", year: 2 },
            { name: "Set Three Student", email: "set-three@example.test", password: "test-password", studentId: "IT-SET-3", department: "IT", year: 3 },
        ]);
        const unlinkedItStudent = await Student.create({
            name: "Department Student Not Linked To Faculty",
            email: "unlinked-it@example.test",
            password: "test-password",
            studentId: "IT-UNLINKED",
            department: "IT",
            year: 4
        });
        const cancellationStudent = await Student.create({
            name: "Retest Cancellation Student",
            email: "retest-cancellation@example.test",
            password: "test-password",
            studentId: "IT-CANCEL",
            department: "IT",
            year: 4
        });
        faculty.assignedStudents = students.map((student) => student._id);
        await faculty.save();
        const outsideDepartmentStudent = await Student.create({
            name: "Outside Department Retest Student",
            email: "outside-retest@example.test",
            password: "test-password",
            studentId: "MATH-RETEST",
            department: "Mathematics",
            year: 1
        });
        faculty.assignedStudents.push(outsideDepartmentStudent._id);
        await faculty.save();
        const question = await QuestionBank.create({
            title: "Faculty retest question",
            subject: "IT",
            topic: "Networks",
            question: "Which protocol resolves domain names?",
            options: ["DNS", "FTP", "SSH", "SMTP"],
            correctAnswer: "DNS",
            questionType: "MCQ",
            createdBy: faculty._id
        });
        const assessment = await Assessment.create({
            title: "Three Set Faculty Assessment",
            assignedFaculty: faculty._id,
            questions: [question._id],
            questionSets: [1, 2, 3].map((setNumber) => ({
                setNumber,
                questions: [question._id]
            }))
        });
        const adminOverlapAssessment = await Assessment.create({
            title: "Three Set Admin Assessment",
            questions: [question._id],
            questionSets: [1, 2, 3].map((setNumber) => ({
                setNumber,
                questions: [question._id]
            }))
        });
        const facultyOverlapAssessment = await Assessment.create({
            title: "Three Set Faculty Overlap Assessment",
            assignedFaculty: faculty._id,
            questions: [question._id],
            questionSets: [1, 2, 3].map((setNumber) => ({
                setNumber,
                questions: [question._id]
            }))
        });

        const app = express();
        app.use(express.json());
        app.use("/api/faculty", facultyRoutes);
        app.use("/api/faculty/assessments", facultyAssessmentRoutes);
        app.use("/api/admin/assessments", adminAssessmentRoutes);
        server = await new Promise((resolve) => {
            const listener = app.listen(0, () => resolve(listener));
        });
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const facultyToken = jwt.sign({ id: faculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const adminToken = jwt.sign({ id: admin._id.toString(), role: "admin" }, process.env.JWT_SECRET);
        const otherFacultyToken = jwt.sign({ id: otherFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const headers = (token) => ({
            Authorization: ["Bearer", token].join(" "),
            "Content-Type": "application/json"
        });
        const expectedSetDates = [];
        const assignSet = async (setIndex, studentsForSet) => fetch(
            `${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`,
            {
                method: "POST",
                headers: headers(facultyToken),
                body: JSON.stringify((() => {
                    const startDate = new Date(Date.now() + 3_600_000);
                    const endDate = new Date(Date.now() + 7_200_000);
                    if (!expectedSetDates[setIndex]) expectedSetDates[setIndex] = { startDate, endDate };
                    return {
                        sets: [{
                            setIndex,
                            departments: ["IT"],
                            studentIds: studentsForSet.map((student) => student._id.toString()),
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString()
                        }]
                    };
                })())
            }
        );
        const assignOverlapSet = async (setIndex) => fetch(
            `${baseUrl}/api/faculty/assessments/${facultyOverlapAssessment._id}/assign-sets`,
            {
                method: "POST",
                headers: headers(facultyToken),
                body: JSON.stringify({
                    sets: [{
                        setIndex,
                        departments: ["IT"],
                        studentIds: [students[0]._id.toString(), students[1]._id.toString()],
                        startDate: new Date(Date.now() + 3_600_000).toISOString(),
                        endDate: new Date(Date.now() + 7_200_000).toISOString()
                    }]
                })
            }
        );

        const adminStartDate = new Date(Date.now() + 3_600_000);
        const adminEndDate = new Date(Date.now() + 7_200_000);
        const adminAssignmentResponse = await fetch(
            `${baseUrl}/api/admin/assessments/${adminOverlapAssessment._id}/assign-sets`,
            {
                method: "POST",
                headers: headers(adminToken),
                body: JSON.stringify({
                    sets: [0, 1, 2].map((setIndex) => ({
                        setIndex,
                        departments: ["IT"],
                        startDate: adminStartDate.toISOString(),
                        endDate: adminEndDate.toISOString()
                    }))
                })
            }
        );
        assert.strictEqual(adminAssignmentResponse.status, 200);
        const savedAdminAssessment = await Assessment.findById(adminOverlapAssessment._id).lean();
        assert.deepStrictEqual(
            savedAdminAssessment.setAssignments.map((assignment) => assignment.assignedStudents.length),
            [5, 5, 5]
        );
        const duplicateAdminSetResponse = await fetch(
            `${baseUrl}/api/admin/assessments/${adminOverlapAssessment._id}/assign-sets`,
            {
                method: "POST",
                headers: headers(adminToken),
                body: JSON.stringify({
                    sets: [{
                        setIndex: 1,
                        departments: ["IT"],
                        startDate: adminStartDate.toISOString(),
                        endDate: adminEndDate.toISOString()
                    }]
                })
            }
        );
        assert.strictEqual(duplicateAdminSetResponse.status, 409);
        for (const setIndex of [0, 1, 2]) {
            const overlapResponse = await assignOverlapSet(setIndex);
            assert.strictEqual(overlapResponse.status, 200);
        }
        const persistedFacultyOverlap = await Assessment.findById(facultyOverlapAssessment._id).lean();
        const expectedOverlapIds = [students[0]._id.toString(), students[1]._id.toString()].sort();
        assert.deepStrictEqual(
            persistedFacultyOverlap.setAssignments.map((assignment) => assignment.assignedStudents.map(String).sort()),
            [expectedOverlapIds, expectedOverlapIds, expectedOverlapIds]
        );

        const selectedSetStudents = [[students[0], students[1]], [unlinkedItStudent, cancellationStudent], [students[0]]];
        for (let setIndex = 0; setIndex < selectedSetStudents.length; setIndex += 1) {
            const response = await assignSet(setIndex, selectedSetStudents[setIndex]);
            assert.strictEqual(response.status, 200, `Set ${setIndex + 1} should be assignable after earlier sets`);
        }
        const duplicateResponse = await assignSet(1, [unlinkedItStudent]);
        assert.strictEqual(duplicateResponse.status, 409);
        assert.strictEqual(
            (await duplicateResponse.json()).message,
            "One or more selected question sets are already assigned"
        );
        const savedAssessment = await Assessment.findById(assessment._id).lean();
        assert.deepStrictEqual(
            savedAssessment.setAssignments.map((assignment) => Number(assignment.setIndex)).sort(),
            [0, 1, 2]
        );
        assert.strictEqual(savedAssessment.assignedStudents.length, 4);
        assert.deepStrictEqual(savedAssessment.questionSets.map((set) => set.departments), [["IT"], ["IT"], ["IT"]]);
        assert.deepStrictEqual(
            savedAssessment.setAssignments.map((assignment) => assignment.assignedStudents.length),
            [2, 2, 1]
        );
        const facultyStudentsResponse = await fetch(`${baseUrl}/api/faculty/students?department=Mathematics`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyStudentsResponse.status, 200);
        const facultyStudentsBody = await facultyStudentsResponse.json();
        assert.strictEqual(facultyStudentsBody.data.department, "IT");
        assert.strictEqual(facultyStudentsBody.data.students.length, 5);
        assert(facultyStudentsBody.data.students.every((student) => student.department === "IT"));
        const assignmentStudentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/students?department=Mathematics`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(assignmentStudentsResponse.status, 200);
        const assignmentStudentsBody = await assignmentStudentsResponse.json();
        assert.strictEqual(assignmentStudentsBody.data.students.length, 5);
        savedAssessment.setAssignments.forEach((assignment) => {
            const expectedDates = expectedSetDates[assignment.setIndex];
            assert.strictEqual(new Date(assignment.startDate).getTime(), expectedDates.startDate.getTime());
            assert.strictEqual(new Date(assignment.endDate).getTime(), expectedDates.endDate.getTime());
        });
        await Assessment.updateOne(
            { _id: assessment._id },
            { $pull: { assignedStudents: students[0]._id } }
        );
        const facultyAssessmentListResponse = await fetch(`${baseUrl}/api/faculty/assessments`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyAssessmentListResponse.status, 200);
        const facultyAssessmentList = await facultyAssessmentListResponse.json();
        const facultyListItem = facultyAssessmentList.data.find((item) => String(item._id) === assessment._id.toString());
        assert.strictEqual(facultyListItem.assignedCount, 4);
        assert.strictEqual(facultyListItem.setMetrics.assignedSetCount, 3);
        assert.strictEqual(facultyListItem.setMetrics.availableSetCount, 0);
        const adminAssessmentListResponse = await fetch(`${baseUrl}/api/admin/assessments`, {
            headers: headers(adminToken)
        });
        assert.strictEqual(adminAssessmentListResponse.status, 200);
        const adminAssessmentList = await adminAssessmentListResponse.json();
        const adminListItem = adminAssessmentList.data.find((item) => String(item._id) === assessment._id.toString());
        assert.strictEqual(adminListItem.assignedCount, facultyListItem.assignedCount);
        assert.deepStrictEqual(adminListItem.setMetrics, facultyListItem.setMetrics);
        await AssessmentResult.create([
            {
                student: unlinkedItStudent._id,
                assessment: assessment._id,
                questionSetIndex: 1,
                score: 5,
                totalMarks: 10,
                percentage: 50,
                completed: true,
                submittedAt: new Date()
            },
            {
                student: students[0]._id,
                assessment: assessment._id,
                questionSetIndex: 2,
                score: 8,
                totalMarks: 10,
                percentage: 80,
                completed: true,
                submittedAt: new Date()
            }
        ]);
        const resultsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/details`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(resultsResponse.status, 200);
        const resultsBody = await resultsResponse.json();
        assert.strictEqual(resultsBody.data.assessment.assignedCount, 4);
        assert.strictEqual(resultsBody.data.assessment.attendedCount, 2);
        assert.strictEqual(resultsBody.data.assessment.notAttendedCount, 2);
        assert.strictEqual(resultsBody.data.assessment.averagePercentage, 65);
        assert.deepStrictEqual(
            resultsBody.data.students.map((entry) => [entry.student.name, entry.setIndex, entry.result?.score ?? null]),
            [
                ["Set One Student", 0, null],
                ["Set Two Student", 0, null],
                ["Department Student Not Linked To Faculty", 1, 5],
                ["Retest Cancellation Student", 1, null],
                ["Set One Student", 2, 8]
            ]
        );
        const adminResultsResponse = await fetch(`${baseUrl}/api/admin/assessments/${assessment._id}/details`, {
            headers: headers(adminToken)
        });
        assert.strictEqual(adminResultsResponse.status, 200);
        const adminResultsBody = await adminResultsResponse.json();
        for (const key of [
            "statusLabel",
            "totalQuestions",
            "assignedCount",
            "attendedCount",
            "notAttendedCount",
            "averagePercentage",
            "highestPercentage",
            "lowestPercentage",
        ]) {
            assert.strictEqual(resultsBody.data.assessment[key], adminResultsBody.data.assessment[key], `${key} should match Admin results`);
        }
        const resultRows = (payload) => payload.data.students
            .map((entry) => [String(entry.student._id), entry.setIndex, entry.status, entry.result?.score ?? null])
            .sort((left, right) => `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`));
        assert.deepStrictEqual(resultRows(adminResultsBody), resultRows(resultsBody));
        const unauthorizedDepartmentResponse = await fetch(
            `${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`,
            {
                method: "POST",
                headers: headers(facultyToken),
                body: JSON.stringify({
                    sets: [{
                        setIndex: 0,
                        departments: ["Mathematics"],
                        studentIds: [outsideDepartmentStudent._id.toString()],
                        startDate: new Date(Date.now() + 3_600_000).toISOString(),
                        endDate: new Date(Date.now() + 7_200_000).toISOString()
                    }]
                })
            }
        );
        assert.strictEqual(unauthorizedDepartmentResponse.status, 403);
        assert.strictEqual(
            (await unauthorizedDepartmentResponse.json()).message,
            "You can only assign students from your assigned department"
        );
        const afterRejectedAssignment = await Assessment.findById(assessment._id).lean();
        assert.deepStrictEqual(afterRejectedAssignment.setAssignments.map((assignment) => assignment.assignedStudents.length), [2, 2, 1]);

        const retestStudent = students[1];
        const originalSetAssignment = savedAssessment.setAssignments.find((assignment) => assignment.setIndex === 0);
        const request = await AssessmentAttendanceRequest.create({
            student: retestStudent._id,
            assessment: assessment._id,
            originalAssignment: originalSetAssignment._id,
            originalAssignmentType: "set-assignment",
            setIndex: 0,
            status: "Requested"
        });
        const optionsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/reattempt-options`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({ studentIds: [retestStudent._id.toString()] })
        });
        assert.strictEqual(optionsResponse.status, 200);
        const optionsBody = await optionsResponse.json();
        assert.deepStrictEqual(optionsBody.data.availableSetIndexes, [1, 2]);

        const startDate = new Date(Date.now() + 10_800_000);
        const endDate = new Date(Date.now() + 14_400_000);
        const retestPayload = {
            studentIds: [retestStudent._id.toString()],
            setIndex: 1,
            departments: ["IT"],
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
        const retestResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-reattempt`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify(retestPayload)
        });
        assert.strictEqual(retestResponse.status, 201);
        const duplicateRetestResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-reattempt`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify(retestPayload)
        });
        assert.strictEqual(duplicateRetestResponse.status, 409);
        const savedRetest = await ReattemptAssignment.findOne({ assessment: assessment._id }).lean();
        assert.strictEqual(savedRetest.setIndex, 1);
        assert.deepStrictEqual(savedRetest.students.map(String), [retestStudent._id.toString()]);
        assert.strictEqual(new Date(savedRetest.startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(savedRetest.endDate).getTime(), endDate.getTime());
        assert.strictEqual((await AssessmentAttendanceRequest.findById(request._id).lean()).status, "Assigned");
        const refreshedResultsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/details`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(refreshedResultsResponse.status, 200);
        const refreshedResults = await refreshedResultsResponse.json();
        const retestResultRow = refreshedResults.data.students.find((entry) =>
            String(entry.student._id) === retestStudent._id.toString()
        );
        assert.strictEqual(retestResultRow.status, "Assigned");
        assert.strictEqual(retestResultRow.requestStatus, "Assigned");

        const cancellationAssignment = savedAssessment.setAssignments.find((assignment) => assignment.setIndex === 1);
        const cancellationRequest = await AssessmentAttendanceRequest.create({
            student: cancellationStudent._id,
            assessment: assessment._id,
            originalAssignment: cancellationAssignment._id,
            originalAssignmentType: "set-assignment",
            setIndex: 1,
            status: "Requested"
        });
        const cancellationResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/cancel-requests`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({ studentIds: [cancellationStudent._id.toString()] })
        });
        assert.strictEqual(cancellationResponse.status, 200);
        assert.strictEqual(
            (await AssessmentAttendanceRequest.findById(cancellationRequest._id).lean()).status,
            "Cancelled"
        );
        const cancelledResultsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/details`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(cancelledResultsResponse.status, 200);
        const cancelledResults = await cancelledResultsResponse.json();
        const cancelledResultRow = cancelledResults.data.students.find((entry) =>
            String(entry.student._id) === cancellationStudent._id.toString() && entry.setIndex === 1
        );
        assert.strictEqual(cancelledResultRow.status, "Cancelled");
        assert.strictEqual(cancelledResultRow.requestStatus, "Cancelled");

        await AssessmentAttendanceRequest.create({
            student: outsideDepartmentStudent._id,
            assessment: assessment._id,
            originalAssignment: originalSetAssignment._id,
            originalAssignmentType: "set-assignment",
            setIndex: 0,
            status: "Requested"
        });
        const outsideDepartmentOptions = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/reattempt-options`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({ studentIds: [outsideDepartmentStudent._id.toString()] })
        });
        assert.strictEqual(outsideDepartmentOptions.status, 403);

        const unauthorizedOptions = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/reattempt-options`, {
            method: "POST",
            headers: headers(otherFacultyToken),
            body: JSON.stringify({ studentIds: [retestStudent._id.toString()] })
        });
        assert.strictEqual(unauthorizedOptions.status, 404);
        const unauthorizedAssignment = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-reattempt`, {
            method: "POST",
            headers: headers(otherFacultyToken),
            body: JSON.stringify(retestPayload)
        });
        assert.strictEqual(unauthorizedAssignment.status, 404);

        console.log("Admin and Faculty set assignment allow cross-set student reuse; results match, retest decisions persist, and duplicates and unauthorized access are rejected.");
    } finally {
        if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await mongoose.disconnect();
        await mongo.stop();
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
