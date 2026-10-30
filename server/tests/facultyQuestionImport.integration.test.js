const assert = require("assert");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const express = require("express");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "faculty-question-import-integration-test-secret";

const Faculty = require("../models/Faculty");
const QuestionBank = require("../models/QuestionBank");
const { parseFacultyQuestions } = require("../controllers/facultyAssessmentController");
const facultyAssessmentRoutes = require("../routes/facultyAssessmentRoutes");
const adminRoutes = require("../routes/adminRoutes");

const questionPaper = [
    "1. Which data structure follows the FIFO principle?",
    "A. Stack",
    "B. Queue",
    "C. Tree",
    "D. Graph",
    "Answer Key",
    "1-B"
].join("\n");

const run = async () => {
    const mongo = await MongoMemoryServer.create();
    let server;
    try {
        const extractedQuestions = parseFacultyQuestions(questionPaper);
        assert.strictEqual(extractedQuestions.length, 1);
        assert.strictEqual(extractedQuestions[0].topic, "Linked Lists, Stacks, Queues");
        await mongoose.connect(mongo.getUri());
        const faculty = await Faculty.create({
            name: "Import Integration Faculty",
            email: "faculty-import-integration@example.test",
            password: "test-password",
            approvalStatus: "APPROVED",
            isActive: true
        });
        const app = express();
        app.use(express.json());
        app.use("/api/faculty/assessments", facultyAssessmentRoutes);
        app.use("/api/admin", adminRoutes);
        server = await new Promise((resolve) => {
            const listener = app.listen(0, () => resolve(listener));
        });

        const token = jwt.sign({ id: faculty._id.toString(), role: "faculty" }, process.env.JWT_SECRET);
        const address = server.address();
        const importResponse = await fetch(`http://127.0.0.1:${address.port}/api/faculty/assessments/questions/import`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ questions: extractedQuestions })
        });
        const importBody = await importResponse.json();
        assert.strictEqual(importResponse.status, 201, JSON.stringify(importBody));
        assert.match(importBody.message, /1 questions imported successfully/i);
        assert.strictEqual(importBody.data.count, 1);
        assert.strictEqual(importBody.data.questionIds.length, 1);

        const imported = await QuestionBank.findById(importBody.data.questionIds[0]).lean();
        assert(imported);
        assert.strictEqual(imported.createdBy.toString(), faculty._id.toString());
        assert.strictEqual(imported.question, extractedQuestions[0].question);
        assert.strictEqual(imported.topic, extractedQuestions[0].topic);
        assert.strictEqual(imported.correctAnswer, extractedQuestions[0].correctAnswer);
        assert.deepStrictEqual(imported.options, extractedQuestions[0].options);
        assert.strictEqual(imported.subject, "Imported Questions");
        assert.strictEqual(imported.marks, 1);

        const adminImportResponse = await fetch(`http://127.0.0.1:${address.port}/api/admin/questions/import`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ questions: extractedQuestions })
        });
        assert.strictEqual(adminImportResponse.status, 403);
        assert.strictEqual(await QuestionBank.countDocuments(), 1);

        console.log("Faculty import route persisted the question and preserved Admin-only authorization.");
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
