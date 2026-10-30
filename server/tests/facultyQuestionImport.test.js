const assert = require("assert");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const Faculty = require("../models/Faculty");
const { importQuestions, createAssessment } = require("../controllers/facultyAssessmentController");

const createResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

const originals = {
    questionInsertMany: QuestionBank.insertMany,
    questionFind: QuestionBank.find,
    facultyFindById: Faculty.findById,
    facultyFindByIdAndUpdate: Faculty.findByIdAndUpdate,
    assessmentCreate: Assessment.create
};

const facultyId = "64b000000000000000000001";
const questionId = "64b000000000000000000002";
const validQuestion = {
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    topic: "Addition",
    difficulty: "Easy",
    questionType: "MCQ"
};

const run = async () => {
    try {
        let insertedQuestions;
        QuestionBank.insertMany = async (questions) => {
            insertedQuestions = questions;
            return questions.map((question, index) => ({ ...question, _id: `question-${index}` }));
        };

        const invalidImport = createResponse();
        await importQuestions({
            user: { id: facultyId },
            body: { questions: [{ ...validQuestion, options: ["3", "4", "5"] }] }
        }, invalidImport);
        assert.strictEqual(invalidImport.statusCode, 400);
        assert.match(invalidImport.body.message, /no valid questions/i);
        assert.strictEqual(insertedQuestions, undefined);

        const topicUnavailableResponse = createResponse();
        await importQuestions({
            user: { id: facultyId },
            body: { questions: [{ ...validQuestion, topic: "Question Paper" }] }
        }, topicUnavailableResponse);
        assert.strictEqual(topicUnavailableResponse.statusCode, 400);
        assert.match(topicUnavailableResponse.body.message, /predicted topic/i);
        assert.strictEqual(insertedQuestions, undefined);

        const importResponse = createResponse();
        await importQuestions({
            user: { id: facultyId },
            body: { questions: [validQuestion] }
        }, importResponse);
        assert.strictEqual(importResponse.statusCode, 201);
        assert.strictEqual(importResponse.body.data.count, 1);
        assert.strictEqual(insertedQuestions[0].createdBy, facultyId);
        assert.strictEqual(insertedQuestions[0].subject, "Imported Questions");
        assert.strictEqual(insertedQuestions[0].topic, "Addition");
        assert.strictEqual(insertedQuestions[0].marks, 1);
        assert.strictEqual(insertedQuestions[0].questionType, "MCQ");

        let queriedOwnership;
        let createdAssessment;
        let assessmentCreateCount = 0;
        const importedQuestion = { _id: questionId, marks: 2 };
        QuestionBank.find = (query) => {
            queriedOwnership = query;
            return { select: async () => query.createdBy === facultyId ? [importedQuestion] : [] };
        };
        Faculty.findById = () => ({ select: async () => ({ assignedStudents: [] }) });
        Faculty.findByIdAndUpdate = async () => ({});
        Assessment.create = async (assessment) => {
            assessmentCreateCount += 1;
            createdAssessment = assessment;
            return assessment;
        };

        const createResponseForOwnedQuestions = createResponse();
        await createAssessment({
            user: { id: facultyId },
            body: {
                title: "Faculty assessment",
                assessmentType: "Internal",
                questionIds: [questionId],
                questionSets: [{ setNumber: 1, questionIds: [questionId] }]
            }
        }, createResponseForOwnedQuestions);
        assert.strictEqual(createResponseForOwnedQuestions.statusCode, 201);
        assert.strictEqual(queriedOwnership.createdBy, facultyId);
        assert.strictEqual(createdAssessment.questions[0], questionId);
        assert.strictEqual(createdAssessment.questionSets[0].setNumber, 1);
        assert.strictEqual(createdAssessment.assessmentType, "Internal");
        assert.strictEqual(assessmentCreateCount, 1);

        const overlappingSetsResponse = createResponse();
        await createAssessment({
            user: { id: facultyId },
            body: {
                title: "Overlapping assessment",
                questionIds: [questionId],
                questionSets: [
                    { setNumber: 1, questionIds: [questionId] },
                    { setNumber: 2, questionIds: [questionId] }
                ]
            }
        }, overlappingSetsResponse);
        assert.strictEqual(overlappingSetsResponse.statusCode, 400);
        assert.match(overlappingSetsResponse.body.message, /more than one set/i);
        assert.strictEqual(assessmentCreateCount, 1);

        const foreignQuestionResponse = createResponse();
        await createAssessment({
            user: { id: "64b000000000000000000003" },
            body: { title: "Unauthorized assessment", questionIds: [questionId] }
        }, foreignQuestionResponse);
        assert.strictEqual(foreignQuestionResponse.statusCode, 400);
        assert.match(foreignQuestionResponse.body.message, /unavailable/i);
        assert.strictEqual(assessmentCreateCount, 1);

        console.log("Faculty question import and ownership tests passed.");
    } finally {
        QuestionBank.insertMany = originals.questionInsertMany;
        QuestionBank.find = originals.questionFind;
        Faculty.findById = originals.facultyFindById;
        Faculty.findByIdAndUpdate = originals.facultyFindByIdAndUpdate;
        Assessment.create = originals.assessmentCreate;
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
