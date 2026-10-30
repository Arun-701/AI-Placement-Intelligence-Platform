const assert = require("assert");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "faculty-students-department-integration-test-secret";

const Admin = require("../models/Admin");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const Student = require("../models/Student");
const adminRoutes = require("../routes/adminRoutes");
const dashboardRoutes = require("../routes/dashboardRoutes");
const facultyRoutes = require("../routes/facultyRoutes");
const facultyAssessmentRoutes = require("../routes/facultyAssessmentRoutes");
const facultyResultRoutes = require("../routes/facultyResultRoutes");

const run = async () => {
    const mongo = await MongoMemoryServer.create();
    let server;
    try {
        await mongoose.connect(mongo.getUri());
        const admin = await Admin.create({
            name: "Department Test Admin",
            email: "department-admin@example.test",
            password: "test-password"
        });
        const assignedFaculty = await Faculty.create({
            name: "IT Faculty",
            email: "it-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED"
        });
        const csFaculty = await Faculty.create({
            name: "Computer Science Faculty",
            email: "cs-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED"
        });
        const noDepartmentFaculty = await Faculty.create({
            name: "Unassigned Faculty",
            email: "unassigned-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED"
        });
        const legacyFaculty = await Faculty.create({
            name: "Legacy Faculty",
            email: "legacy-faculty@example.test",
            password: "test-password",
            approvalStatus: "APPROVED"
        });
        const itStudent = await Student.create({
            name: "IT Student",
            email: "it-student@example.test",
            password: "test-password",
            studentId: "IT-001",
            department: "IT",
            year: 2
        });
        const otherItStudent = await Student.create({
            name: "Other IT Student",
            email: "other-it-student@example.test",
            password: "test-password",
            studentId: "IT-002",
            department: "IT",
            year: 3
        });
        const lowercaseItStudent = await Student.create({
            name: "Lowercase IT Student",
            email: "lowercase-it-student@example.test",
            password: "test-password",
            studentId: "IT-003",
            department: "it",
            year: 4
        });
        const csStudent = await Student.create({
            name: "CS Student",
            email: "cs-student@example.test",
            password: "test-password",
            studentId: "CS-001",
            department: "Computer Science",
            year: 1
        });
        const question = await QuestionBank.create({
            title: "Department assignment question",
            subject: "IT",
            topic: "Networking",
            question: "What does DNS resolve?",
            options: ["Names to IP addresses", "IP addresses to names", "Ports to protocols", "Files to folders"],
            correctAnswer: "Names to IP addresses",
            questionType: "MCQ",
            createdBy: assignedFaculty._id
        });
        const assessment = await Assessment.create({
            title: "IT faculty assignment",
            assignedFaculty: assignedFaculty._id,
            questions: [question._id],
            questionSets: [{ setNumber: 1, questions: [question._id] }]
        });

        assignedFaculty.assignedStudents = [itStudent._id, csStudent._id];
        await assignedFaculty.save();
        legacyFaculty.assignedStudents = [csStudent._id];
        await legacyFaculty.save();

        const app = express();
        app.use(express.json());
        app.use("/api/admin", adminRoutes);
        app.use("/api", dashboardRoutes);
        app.use("/api/faculty", facultyRoutes);
        app.use("/api/faculty/assessments", facultyAssessmentRoutes);
        app.use("/api/faculty/results", facultyResultRoutes);
        server = await new Promise((resolve) => {
            const listener = app.listen(0, () => resolve(listener));
        });
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const adminToken = jwt.sign({ id: admin._id.toString(), role: "admin" }, process.env.JWT_SECRET);
        const facultyToken = jwt.sign({ id: assignedFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const csFacultyToken = jwt.sign({ id: csFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const noDepartmentToken = jwt.sign({ id: noDepartmentFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const legacyFacultyToken = jwt.sign({ id: legacyFaculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const headers = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

        const mixedDepartmentAssignmentResponse = await fetch(`${baseUrl}/api/admin/faculties/${assignedFaculty._id}/assign-students`, {
            method: "POST",
            headers: headers(adminToken),
            body: JSON.stringify({ studentIds: [itStudent._id.toString(), csStudent._id.toString()] })
        });
        assert.strictEqual(mixedDepartmentAssignmentResponse.status, 400);
        assert.strictEqual((await Faculty.findById(assignedFaculty._id).lean()).department, "");

        const assignmentResponse = await fetch(`${baseUrl}/api/admin/faculties/${assignedFaculty._id}/assign-students`, {
            method: "POST",
            headers: headers(adminToken),
            body: JSON.stringify({
                studentIds: [itStudent._id.toString(), otherItStudent._id.toString(), lowercaseItStudent._id.toString()]
            })
        });
        assert.strictEqual(assignmentResponse.status, 200);
        const savedFaculty = await Faculty.findById(assignedFaculty._id).lean();
        assert.strictEqual(savedFaculty.department, "IT");
        assert.strictEqual(savedFaculty.assignedStudents.length, 4);

        const facultyProfileResponse = await fetch(`${baseUrl}/api/faculty/profile`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyProfileResponse.status, 200);
        const facultyProfileBody = await facultyProfileResponse.json();
        assert.strictEqual(facultyProfileBody.data.department, savedFaculty.department);

        const assignmentStudentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/students?department=Computer%20Science&facultyId=${csFaculty._id}`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(assignmentStudentsResponse.status, 200);
        const assignmentStudentsBody = await assignmentStudentsResponse.json();
        assert.strictEqual(assignmentStudentsBody.data.department, facultyProfileBody.data.department);
        assert.deepStrictEqual(
            assignmentStudentsBody.data.students.map((student) => student.name).sort(),
            ["IT Student", "Other IT Student", "Lowercase IT Student"].sort()
        );

        const startDate = new Date(Date.now() + 3_600_000);
        const endDate = new Date(Date.now() + 7_200_000);
        const assignmentResponseToAssessment = await fetch(`${baseUrl}/api/faculty/assessments/${assessment._id}/assign-sets`, {
            method: "POST",
            headers: headers(facultyToken),
            body: JSON.stringify({
                sets: [{
                    setIndex: 0,
                    departments: ["IT"],
                    studentIds: [itStudent._id.toString()],
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }]
            })
        });
        assert.strictEqual(assignmentResponseToAssessment.status, 200);
        const savedAssessment = await Assessment.findById(assessment._id).lean();
        assert.strictEqual(savedAssessment.setAssignments[0].departments[0], "IT");
        assert.deepStrictEqual(savedAssessment.setAssignments[0].assignedStudents.map(String), [itStudent._id.toString()]);
        assert.strictEqual(new Date(savedAssessment.setAssignments[0].startDate).getTime(), startDate.getTime());
        assert.strictEqual(new Date(savedAssessment.setAssignments[0].endDate).getTime(), endDate.getTime());

        await AssessmentResult.create({
            student: itStudent._id,
            assessment: assessment._id,
            score: 8,
            totalMarks: 10,
            percentage: 80,
            completed: true,
            submittedAt: new Date(),
            topicAnalysis: [{ topic: "Data Structures and Algorithms", accuracy: 75, totalQuestions: 4 }]
        });
        const facultyDashboardResponse = await fetch(`${baseUrl}/api/dashboard/faculty`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyDashboardResponse.status, 200);
        const facultyDashboard = await facultyDashboardResponse.json();
        assert.strictEqual(facultyDashboard.data.totalAssignedStudents, 3);
        assert.strictEqual(facultyDashboard.data.totalAssignedAssessments, 1);
        assert.strictEqual(facultyDashboard.data.studentReadinessDistribution["Not Started"], 3);
        assert.deepStrictEqual(facultyDashboard.data.studentsNeedingAttention, []);
        assert.deepStrictEqual(facultyDashboard.data.assessmentCompletionStatistics.assessmentStats.map((stats) => ({
            totalAttempts: stats.totalAttempts,
            participatingStudents: stats.participatingStudents,
            assignedCount: stats.assignedCount,
            averagePercentage: stats.averagePercentage
        })), [{
            totalAttempts: 1,
            participatingStudents: 1,
            assignedCount: 1,
            averagePercentage: 80
        }]);
        assert.deepStrictEqual(facultyDashboard.data.skillPerformance, [{
            category: "DSA",
            score: 75,
            questionCount: 4
        }]);
        const facultyAssessmentsResponse = await fetch(`${baseUrl}/api/faculty/assessments`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyAssessmentsResponse.status, 200);
        const facultyAssessments = await facultyAssessmentsResponse.json();
        assert.strictEqual(facultyAssessments.data[0].attendedCount, 1);
        assert.strictEqual(facultyAssessments.data[0].assignedCount, 1);
        assert.strictEqual(facultyAssessments.data[0].averagePercentage, 80);
        const resultStatisticsResponse = await fetch(`${baseUrl}/api/faculty/results/dashboard/statistics`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(resultStatisticsResponse.status, 200);
        const resultStatistics = await resultStatisticsResponse.json();
        assert.strictEqual(resultStatistics.data.overallStatistics.totalResults, 1);
        assert.strictEqual(resultStatistics.data.overallStatistics.averagePercentageAllAssessments, 80);
        assert.strictEqual(resultStatistics.data.assessmentStatistics[0].completionPercentage, 100);
        assert.strictEqual(resultStatistics.data.assessmentStatistics[0].assessmentTitle, "IT faculty assignment");

        const csAssignmentResponse = await fetch(`${baseUrl}/api/admin/faculties/${csFaculty._id}/assign-students`, {
            method: "POST",
            headers: headers(adminToken),
            body: JSON.stringify({ studentIds: [csStudent._id.toString()] })
        });
        assert.strictEqual(csAssignmentResponse.status, 200);
        const csFacultyStudentsResponse = await fetch(`${baseUrl}/api/faculty/students`, {
            headers: headers(csFacultyToken)
        });
        assert.strictEqual(csFacultyStudentsResponse.status, 200);
        const csFacultyStudents = await csFacultyStudentsResponse.json();
        assert.strictEqual(csFacultyStudents.data.department, "Computer Science");
        assert.deepStrictEqual(csFacultyStudents.data.students.map((student) => student.studentId), ["CS-001"]);

        const facultyStudentsResponse = await fetch(`${baseUrl}/api/faculty/students?department=Computer%20Science`, {
            headers: headers(facultyToken)
        });
        assert.strictEqual(facultyStudentsResponse.status, 200);
        const facultyStudents = await facultyStudentsResponse.json();
        assert.strictEqual(facultyStudents.data.department, "IT");
        assert.deepStrictEqual(
            facultyStudents.data.students.map((student) => student.studentId).sort(),
            ["IT-001", "IT-002", "IT-003"]
        );

        const noDepartmentResponse = await fetch(`${baseUrl}/api/faculty/students?department=IT`, {
            headers: headers(noDepartmentToken)
        });
        assert.strictEqual(noDepartmentResponse.status, 200);
        const noDepartmentBody = await noDepartmentResponse.json();
        assert.strictEqual(noDepartmentBody.data.department, "");
        assert.deepStrictEqual(noDepartmentBody.data.students, []);

        const noDepartmentAssessmentStudentsResponse = await fetch(`${baseUrl}/api/faculty/assessments/students`, {
            headers: headers(noDepartmentToken)
        });
        assert.strictEqual(noDepartmentAssessmentStudentsResponse.status, 200);
        const noDepartmentAssessmentStudentsBody = await noDepartmentAssessmentStudentsResponse.json();
        assert.strictEqual(noDepartmentAssessmentStudentsBody.data.department, "");
        assert.deepStrictEqual(noDepartmentAssessmentStudentsBody.data.students, []);

        const legacyDepartmentResponse = await fetch(`${baseUrl}/api/faculty/students`, {
            headers: headers(legacyFacultyToken)
        });
        assert.strictEqual(legacyDepartmentResponse.status, 200);
        const legacyDepartmentBody = await legacyDepartmentResponse.json();
        assert.strictEqual(legacyDepartmentBody.data.department, "");
        assert.deepStrictEqual(legacyDepartmentBody.data.students, []);

        const adminStudentsResponse = await fetch(`${baseUrl}/api/admin/students`, {
            headers: headers(adminToken)
        });
        assert.strictEqual(adminStudentsResponse.status, 200);
        const adminStudents = await adminStudentsResponse.json();
        assert.strictEqual(adminStudents.data.length, 4);

        console.log("Faculty profile department, IT assessment assignment, department-scoped student access, no-department behavior, and Admin access passed.");
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
