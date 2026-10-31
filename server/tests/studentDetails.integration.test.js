const assert = require("assert");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "student-details-integration-test-secret";

const Admin = require("../models/Admin");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const Faculty = require("../models/Faculty");
const Roadmap = require("../models/Roadmap");
const Student = require("../models/Student");
const adminRoutes = require("../routes/adminRoutes");
const facultyRoutes = require("../routes/facultyRoutes");

const run = async () => {
  const mongo = await MongoMemoryServer.create();
  let server;
  try {
    await mongoose.connect(mongo.getUri());
    const admin = await Admin.create({
      name: "Details Admin",
      email: "details-admin@example.test",
      password: "test-password"
    });
    const faculty = await Faculty.create({
      name: "Assigned Faculty",
      email: "assigned-faculty@example.test",
      password: "test-password",
      department: "IT",
      approvalStatus: "APPROVED"
    });
    const assignedStudent = await Student.create({
      name: "Assigned Student",
      fullName: "Assigned Student",
      email: "assigned-student@example.test",
      password: "test-password",
      emailVerificationOtpHash: "private-otp-hash",
      resetPasswordToken: "private-reset-token",
      studentId: "IT-001",
      department: "IT",
      college: "Example College",
      degree: "B.Tech",
      year: 3,
      semester: 5,
      section: "A",
      cgpa: 8.2,
      graduationYear: 2027,
      phone: "9876543210",
      skills: ["JavaScript"],
      github: "https://github.com/example",
      profileCompleted: true,
      placementReadinessScore: 65,
      resume: "private-storage/resume.pdf",
      resumeOriginalName: "student-resume.pdf",
      resumeSize: 1024,
      codingProfile: {
        totalProblemsSolved: 12,
        platforms: [
          { platform: "LeetCode", profileUrl: "https://leetcode.com/example", totalSolved: 12 },
          { platform: "HackerRank", profileUrl: "https://hackerrank.com/example", badges: 3, certificates: ["certificate-a"] }
        ]
      }
    });
    const unassignedStudent = await Student.create({
      name: "Unassigned Student",
      email: "unassigned-student@example.test",
      password: "test-password",
      studentId: "IT-002",
      department: "IT",
      year: 2
    });
    faculty.assignedStudents = [assignedStudent._id];
    await faculty.save();

    const assessment = await Assessment.create({
      title: "Placement Practice",
      assessmentType: "Practice",
      totalMarks: 20,
      passingMarks: 10
    });
    await AssessmentResult.create({
      student: assignedStudent._id,
      assessment: assessment._id,
      score: 15,
      totalMarks: 20,
      percentage: 75,
      completed: true,
      submittedAt: new Date()
    });
    await Roadmap.create({
      student: assignedStudent._id,
      careerGoal: "Frontend Developer",
      roadmapItems: [{ title: "Learn React", status: "In Progress", week: 1 }],
      progress: { completionPercentage: 25, completedItems: 0, pendingItems: 1 }
    });

    const app = express();
    app.use(express.json());
    app.use("/api/admin", adminRoutes);
    app.use("/api/faculty", facultyRoutes);
    server = await new Promise((resolve) => {
      const listener = app.listen(0, () => resolve(listener));
    });

    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const adminToken = jwt.sign({ id: admin._id.toString(), role: "admin" }, process.env.JWT_SECRET);
    const facultyToken = jwt.sign({ id: faculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
    const headers = (token) => ({ Authorization: `Bearer ${token}` });

    const adminResponse = await fetch(`${baseUrl}/api/admin/students/${assignedStudent._id}/details`, {
      headers: headers(adminToken)
    });
    assert.strictEqual(adminResponse.status, 200);
    const adminBody = await adminResponse.json();
    assert.strictEqual(adminBody.data.student.studentId, "IT-001");
    assert.strictEqual(adminBody.data.assessmentHistory[0].name, "Placement Practice");
    assert.strictEqual(adminBody.data.roadmap.careerGoal, "Frontend Developer");
    assert.strictEqual(adminBody.data.readiness.percentage, 32.93);
    assert.strictEqual(
      Object.values(adminBody.data.readiness.breakdown).reduce((total, component) => total + component.contribution, 0),
      adminBody.data.readiness.percentage
    );
    assert.strictEqual(adminBody.data.codingProfile.totalProblemsSolved, 12);
    assert.strictEqual(adminBody.data.codingProfile.platforms.find((platform) => platform.platform === "HackerRank").badgesCount, 3);
    assert.strictEqual(adminBody.data.codingProfile.platforms.find((platform) => platform.platform === "HackerRank").certificatesCount, 1);
    const serializedDetails = JSON.stringify(adminBody.data);
    assert(!serializedDetails.includes("private-otp-hash"));
    assert(!serializedDetails.includes("private-reset-token"));
    assert(!serializedDetails.includes("private-storage/resume.pdf"));
    assert(!Object.prototype.hasOwnProperty.call(adminBody.data.student, "password"));

    const assignedResponse = await fetch(`${baseUrl}/api/faculty/students/${assignedStudent._id}/details`, {
      headers: headers(facultyToken)
    });
    assert.strictEqual(assignedResponse.status, 200);
    const facultyBody = await assignedResponse.json();
    assert.strictEqual(facultyBody.data.readiness.percentage, adminBody.data.readiness.percentage);

    const unassignedResponse = await fetch(`${baseUrl}/api/faculty/students/${unassignedStudent._id}/details`, {
      headers: headers(facultyToken)
    });
    assert.strictEqual(unassignedResponse.status, 404);
    assert(!JSON.stringify(await unassignedResponse.json()).includes(unassignedStudent.email));

    const emptyProfileResponse = await fetch(`${baseUrl}/api/admin/students/${unassignedStudent._id}/details`, {
      headers: headers(adminToken)
    });
    assert.strictEqual(emptyProfileResponse.status, 200);
    const emptyProfile = await emptyProfileResponse.json();
    assert.strictEqual(emptyProfile.data.resume.uploaded, false);
    assert.strictEqual(emptyProfile.data.roadmap, null);
    assert.deepStrictEqual(emptyProfile.data.codingProfile.platforms, []);

    const rosterResponse = await fetch(`${baseUrl}/api/faculty/students`, {
      headers: headers(facultyToken)
    });
    assert.strictEqual(rosterResponse.status, 200);
    const roster = await rosterResponse.json();
    assert.deepStrictEqual(roster.data.students.map((student) => student._id), [assignedStudent._id.toString()]);

    const invalidIdResponse = await fetch(`${baseUrl}/api/admin/students/not-an-id/details`, {
      headers: headers(adminToken)
    });
    assert.strictEqual(invalidIdResponse.status, 400);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
