const assert = require("assert");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "faculty-assessment-actions-integration-test-secret";

const Assessment = require("../models/Assessment");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const Student = require("../models/Student");
const facultyAssessmentRoutes = require("../routes/facultyAssessmentRoutes");
const adminAssessmentRoutes = require("../routes/adminAssessmentRoutes");
const studentAssessmentRoutes = require("../routes/studentAssessmentRoutes");

const run = async () => {
    const mongo = await MongoMemoryServer.create();
    let server;
    try {
        await mongoose.connect(mongo.getUri());
        const student = await Student.create({
            name: "Assessment Action Student",
            email: "assessment-action-student@example.test",
            password: "test-password",
            department: "Computer Science",
            year: 2,
            profileCompleted: true,
            initialAssessmentCompleted: true
        });
        const sameDepartmentStudent = await Student.create({
            name: "Unassigned Department Student",
            email: "unassigned-department-student@example.test",
            password: "test-password",
            department: "Computer Science",
            year: 3,
            profileCompleted: true,
            initialAssessmentCompleted: true
        });
        const outsideDepartmentStudent = await Student.create({
            name: "Outside Department Student",
            email: "outside-department-student@example.test",
            password: "test-password",
            department: "Mathematics",
            year: 1,
            profileCompleted: true,
            initialAssessmentCompleted: true
        });
        const faculty = await Faculty.create({
            name: "Assessment Action Faculty",
            email: "assessment-action-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED",
            isActive: true,
            department: "Computer Science",
            assignedStudents: [student._id, outsideDepartmentStudent._id]
        });
        const otherFaculty = await Faculty.create({
            name: "Other Assessment Faculty",
            email: "other-assessment-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED",
            isActive: true,
            assignedStudents: [student._id]
        });
        const admin = await Admin.create({
            name: "Assessment Action Admin",
            email: "assessment-action-admin@example.test",
            password: "test-password"
        });
        const question = await QuestionBank.create({
            title: "Set question",
            subject: "Computer Science",
            topic: "Data Structures",
            question: "Which data structure follows FIFO?",
            options: ["Queue", "Stack", "Tree", "Graph"],
            correctAnswer: "Queue",
            questionType: "MCQ",
            createdBy: faculty._id
        });
        const assessment = await Assessment.create({
            title: "Faculty set assessment",
            assignedFaculty: faculty._id,
            questions: [question._id],
            questionSets: [{ setNumber: 1, questions: [question._id] }]
        });
        const adminAssessment = await Assessment.create({
            title: "Admin set assessment",
            questions: [question._id],
            questionSets: [{ setNumber: 1, questions: [question._id] }]
        });

        const app = express();
        app.use(express.json());
        app.use("/api/faculty/assessments", facultyAssessmentRoutes);
        app.use("/api/admin/assessments", adminAssessmentRoutes);
        app.use("/api/student/assessments", studentAssessmentRoutes);
        server = await new Promise((resolve) => {
            const listener = app.listen(0, () => resolve(listener));
        });
        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const facultyToken = jwt.sign({ id: faculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const otherFacultyToken = jwt.sign({ id: otherFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const studentToken = jwt.sign({ id: student._id.toString(), role: "student" }, process.env.JWT_SECRET);
        const adminToken = jwt.sign({ id: admin._id.toString(), role: "admin" }, process.env.JWT_SECRET);
        const headers = (token) => ({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        });
        const startDate = new Date(Date.now() + 3_600_000);
        const endDate = new Date(Date.now() + 7_200_000);
        const assignment = {
            sets: [{
                setIndex: 0,
                departments: ["Computer Science"],
                studentIds: [student._id.toString()],
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }]
        };

        const adminAssignmentResponse = await fetch(`${baseUrl}/api/admin/assessments/${adminAssessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(adminToken),
            body: JSON.stringify(assignment)
        });
        const adminAssignmentBody = await adminAssignmentResponse.json();
        assert.strictEqual(adminAssignmentResponse.status, 200, JSON.stringify(adminAssignmentBody));
        const savedAdminAssessment = await Assessment.findById(adminAssessment._id).lean();
        assert.strictEqual(savedAdminAssessment.setAssignments[0].departments[0], "Computer Science");
        assert.strictEqual(savedAdminAssessment.setAssignments[0].assignedStudents.length, 2);
        assert.strictEqual(new Date(savedAdminAssessment.setAssignments[0].startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(savedAdminAssessment.setAssignments[0].endDate).getTime(), endDate.getTime());

        const facultyStudentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/students`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyStudentsResponse.status, 200);
        const facultyStudentsBody = await facultyStudentsResponse.json();
        assert.strictEqual(facultyStudentsBody.data.department, "Computer Science");
        assert.deepStrictEqual(
            facultyStudentsBody.data.students.map((item) => String(item._id)).sort(),
            [student._id.toString(), sameDepartmentStudent._id.toString()].sort()
        );

        const noDepartmentStudentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/students`, {
            headers: headers(otherFacultyToken)
        });
        assert.strictEqual(noDepartmentStudentsResponse.status, 200);
        const noDepartmentStudentsBody = await noDepartmentStudentsResponse.json();
        assert.strictEqual(noDepartmentStudentsBody.data.department, "");
        assert.deepStrictEqual(noDepartmentStudentsBody.data.students, []);

        const missingDepartmentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({ sets: [{ ...assignment.sets[0], departments: [], studentIds: [] }] })
        });
        assert.strictEqual(missingDepartmentsResponse.status, 400);
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).setAssignments.length, 0);

        const outsideDepartmentResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({
                sets: [{ ...assignment.sets[0], departments: ["Mathematics"] }]
            })
        });
        assert.strictEqual(outsideDepartmentResponse.status, 403);
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).setAssignments.length, 0);

        const departmentWideAssessment = await Assessment.create({
            title: "Department-wide Faculty set assessment",
            assignedFaculty: faculty._id,
            questions: [question._id],
            questionSets: [{ setNumber: 1, questions: [question._id] }]
        });
        const unassignedStudentResponse = await fetch(`${baseUrl}/api/faculty/assessments/${departmentWideAssessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({
                sets: [{ ...assignment.sets[0], studentIds: [sameDepartmentStudent._id.toString()] }]
            })
        });
        assert.strictEqual(unassignedStudentResponse.status, 200);
        const departmentWideSaved = await Assessment.findById(departmentWideAssessment._id).lean();
        assert.deepStrictEqual(
            departmentWideSaved.setAssignments[0].assignedStudents.map(String),
            [sameDepartmentStudent._id.toString()]
        );
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).setAssignments.length, 0);

        const wrongDepartmentStudentResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({
                sets: [{ ...assignment.sets[0], studentIds: [outsideDepartmentStudent._id.toString()] }]
            })
        });
        assert.strictEqual(wrongDepartmentStudentResponse.status, 400);
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).setAssignments.length, 0);

        const invalidDatesResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({
                sets: [{
                    ...assignment.sets[0],
                    endDate: new Date(startDate.getTime() - 60_000).toISOString()
                }]
            })
        });
        assert.strictEqual(invalidDatesResponse.status, 400);
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).setAssignments.length, 0);

        const assignmentResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify(assignment)
        });
        const assignmentBody = await assignmentResponse.json();
        assert.strictEqual(assignmentResponse.status, 200, JSON.stringify(assignmentBody));
        const saved = await Assessment.findById(assessment._id).lean();
        assert.strictEqual(saved.setAssignments.length, 1);
        assert.strictEqual(saved.setAssignments[0].assignedStudents[0].toString(), student._id.toString());
        assert.strictEqual(saved.setAssignments[0].departments[0], "Computer Science");
        assert.strictEqual(saved.setAssignments[0].assignedStudents.some((id) => id.toString() === sameDepartmentStudent._id.toString()), false);
        assert.strictEqual(new Date(saved.setAssignments[0].startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(saved.setAssignments[0].endDate).getTime(), endDate.getTime());
        assert.deepStrictEqual(saved.questionSets[0].departments, ["Computer Science"]);
        assert.strictEqual(new Date(saved.questionSets[0].startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(saved.questionSets[0].endDate).getTime(), endDate.getTime());
        assert.strictEqual(saved.assignedStudents.length, 1);
        assert.strictEqual(saved.status, "Published");

        const studentAssessmentResponse = await fetch(`${baseUrl}/api/student/assessments/my`, {
            headers: headers(studentToken)
        });
        assert.strictEqual(studentAssessmentResponse.status, 200);
        const studentAssessmentBody = await studentAssessmentResponse.json();
        const visibleAssessment = studentAssessmentBody.data.assessments.find((item) => String(item._id) === assessment._id.toString());
        assert(visibleAssessment, "The assigned student should see the assessment");
        assert.strictEqual(visibleAssessment.assignedSetIndex, 0);
        assert.strictEqual(new Date(visibleAssessment.startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(visibleAssessment.endDate).getTime(), endDate.getTime());

        const duplicateResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify(assignment)
        });
        assert.strictEqual(duplicateResponse.status, 409);

        const unauthorizedResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(otherFacultyToken),
            body: JSON.stringify(assignment)
        });
        assert.strictEqual(unauthorizedResponse.status, 404);

        const approvalResponse = await fetch(`${baseUrl}/api/admin/assessments/${assessment._id}/assign-reattempt`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({ studentIds: [student._id.toString()] })
        });
        assert.strictEqual(approvalResponse.status, 403);

        const editStartDate = new Date(Date.now() + 5_400_000);
        const editEndDate = new Date(Date.now() + 10_800_000);
        const editResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/title`, {
            method: "PUT",
            headers: headers(facultyToken),
            body: JSON.stringify({
                title: "Renamed faculty assessment",
                sets: [{ setIndex: 0, startDate: editStartDate.toISOString(), endDate: editEndDate.toISOString() }]
            })
        });
        assert.strictEqual(editResponse.status, 200);
        const edited = await Assessment.findById(assessment._id).lean();
        assert.strictEqual(edited.title, "Renamed faculty assessment");
        assert.strictEqual(new Date(edited.setAssignments[0].startDate).getTime(), editStartDate.getTime());

        const detailsResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/details`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(detailsResponse.status, 200);
        const detailsBody = await detailsResponse.json();
        assert.strictEqual(detailsBody.data.assessment.questions[0].topic, "Data Structures");

        const deleteResponse = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}`, {
            method: "DELETE",
            headers: headers(facultyToken)
        });
        assert.strictEqual(deleteResponse.status, 200);
        assert.strictEqual((await Assessment.findById(assessment._id).lean()).isActive, false);

        console.log("Admin/Faculty set assignment, Faculty edit/delete, student visibility, and authorization integration passed.");
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
