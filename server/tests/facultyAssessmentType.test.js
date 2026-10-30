const assert = require("assert");
const Assessment = require("../models/Assessment");
const QuestionBank = require("../models/QuestionBank");
const Faculty = require("../models/Faculty");
const { createAssessment } = require("../controllers/facultyAssessmentController");

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
    facultyFindById: Faculty.findById,
    facultyFindByIdAndUpdate: Faculty.findByIdAndUpdate,
    questionInsertMany: QuestionBank.insertMany,
    assessmentCreate: Assessment.create
};

const validQuestion = {
    confirmed: true,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    marks: 2
};

const run = async () => {
    try {
        let facultyLookupCount = 0;
        Faculty.findById = () => {
            facultyLookupCount += 1;
            return { select: async () => ({ assignedStudents: [] }) };
        };

        const invalidResponse = createResponse();
        await createAssessment({
            user: { id: "faculty-a" },
            body: { title: "Invalid type test", assessmentType: "Module A", questions: [validQuestion] }
        }, invalidResponse);
        assert.strictEqual(invalidResponse.statusCode, 400);
        assert.match(invalidResponse.body.message, /assessment type is invalid/i);
        assert.strictEqual(facultyLookupCount, 0);

        QuestionBank.insertMany = async (questions) => questions.map((question, index) => ({
            ...question,
            _id: `question-${index}`,
            marks: question.marks
        }));
        let createdAssessment;
        Assessment.create = async (assessment) => {
            createdAssessment = assessment;
            return assessment;
        };
        Faculty.findByIdAndUpdate = async () => ({});

        const validResponse = createResponse();
        await createAssessment({
            user: { id: "faculty-a" },
            body: {
                title: "Internal assessment",
                assessmentType: "Internal",
                questions: [validQuestion]
            }
        }, validResponse);

        assert.strictEqual(validResponse.statusCode, 201);
        assert.strictEqual(createdAssessment.assessmentType, "Internal");
        assert.strictEqual(validResponse.body.data.assessmentType, "Internal");
        assert.strictEqual(createdAssessment.assignedFaculty, "faculty-a");
        console.log("Faculty assessment type validation and persistence tests passed.");
    } finally {
        Faculty.findById = originals.facultyFindById;
        Faculty.findByIdAndUpdate = originals.facultyFindByIdAndUpdate;
        QuestionBank.insertMany = originals.questionInsertMany;
        Assessment.create = originals.assessmentCreate;
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
