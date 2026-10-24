const assert = require("assert");
const { buildAssessmentResultRows } = require("../utils/assessmentResultRows");

const studentA = { _id: "student-a", name: "Student A" };
const studentB = { _id: "student-b", name: "Student B" };

const assessment = {
  setAssignments: [
    { setIndex: 0, assignedStudents: [studentA, studentB] },
    { setIndex: 1, assignedStudents: [studentA] },
  ],
  questionSets: [
    { questions: ["question-1", "question-2"] },
    { questions: ["question-3", "question-4"] },
  ],
};

const rows = buildAssessmentResultRows(assessment, [
  {
    _id: "result-a",
    student: studentA,
    questionSetIndex: 0,
    answers: [{ question: "question-3" }, { question: "question-4" }],
    score: 0,
    totalMarks: 5,
    percentage: 0,
    completed: true,
    submittedAt: new Date(),
  },
  {
    _id: "result-incomplete",
    student: studentB,
    questionSetIndex: 0,
    score: 4,
    totalMarks: 5,
    percentage: 80,
    completed: false,
  },
], []);

assert.strictEqual(rows[0].status, "Not Attended");
assert.strictEqual(rows[0].result, null);
assert.strictEqual(rows[1].status, "Not Attended");
assert.strictEqual(rows[1].result, null);
assert.strictEqual(rows[2].status, "Completed");
assert.strictEqual(rows[2].result.score, 0);
assert.strictEqual(rows[2].result.totalMarks, 5);
assert.strictEqual(rows[2].result.percentage, 0);

console.log("Assessment result row association tests passed.");
