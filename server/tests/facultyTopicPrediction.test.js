const assert = require("assert");
const { parseQuestions: parseAdminQuestionPaper } = require("../services/questionUploadService");
const { parseFacultyQuestions } = require("../controllers/facultyAssessmentController");

const questionPaper = [
    "1. Which data structure follows the FIFO principle?",
    "A. Stack",
    "B. Queue",
    "C. Tree",
    "D. Graph",
    "Answer Key",
    "1-B"
].join("\n");

const facultyQuestions = parseFacultyQuestions(questionPaper);
const adminQuestions = parseAdminQuestionPaper(questionPaper);

assert.strictEqual(facultyQuestions.length, 1);
assert.strictEqual(adminQuestions.length, 1);
assert.strictEqual(facultyQuestions[0].topic, adminQuestions[0].topic);
assert.strictEqual(facultyQuestions[0].topic, "Linked Lists, Stacks, Queues");
assert.notStrictEqual(facultyQuestions[0].topic, "Question Paper");
assert.strictEqual(facultyQuestions[0].correctAnswer, adminQuestions[0].correctAnswer);
assert.strictEqual(facultyQuestions[0].questionType, "MCQ");

const unclassifiedQuestions = parseFacultyQuestions([
    "1. This unusual prompt has no matching topic signals.",
    "A. Alpha",
    "B. Beta",
    "C. Gamma",
    "D. Delta"
].join("\n"));
assert.strictEqual(unclassifiedQuestions.length, 1);
assert.strictEqual(unclassifiedQuestions[0].topic, "");
console.log("Faculty and Admin topic prediction parity tests passed.");
