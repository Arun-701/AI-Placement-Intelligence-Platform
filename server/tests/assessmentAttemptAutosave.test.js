const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const ReattemptAssignment = require("../models/ReattemptAssignment");
const { autoSaveAttempt } = require("../services/assessmentAttemptService");

const objectId = () => new mongoose.Types.ObjectId();

test("assessment auto-save persists only the authenticated active attempt answers", async () => {
  const studentId = objectId();
  const assessmentId = objectId();
  const questionId = objectId();
  const otherQuestionId = objectId();
  const previous = {
    assessmentFindById: Assessment.findById,
    studentFindById: Student.findById,
    reattemptFindOne: ReattemptAssignment.findOne
  };
  const currentAttempt = {
    assessmentId,
    reattemptAssignmentId: null,
    status: "in-progress",
    dueAt: new Date(Date.now() + 60_000),
    answers: [],
    timeSpent: 0
  };
  let saved = false;
  const student = {
    currentAttempt,
    save: async () => {
      saved = true;
      return student;
    }
  };

  Assessment.findById = async () => ({
    _id: assessmentId,
    isActive: true,
    status: "Published",
    questions: [questionId],
    assignedStudents: [studentId],
    usesMultiSetAssignment: false
  });
  Student.findById = async () => student;
  ReattemptAssignment.findOne = () => ({ sort: async () => null });

  try {
    const result = await autoSaveAttempt(studentId, {
      assessment: assessmentId,
      timeSpent: 4,
      answers: [{
        question: questionId,
        selectedAnswer: "Option A",
        markedForReview: true
      }]
    });

    assert.equal(result.saved, true);
    assert.equal(saved, true);
    assert.equal(currentAttempt.timeSpent, 4);
    assert.equal(currentAttempt.answers.length, 1);
    assert.equal(currentAttempt.answers[0].question.toString(), questionId.toString());
    assert.equal(currentAttempt.answers[0].selectedAnswer, "Option A");
    assert.equal(currentAttempt.answers[0].markedForReview, true);
    await assert.rejects(
      autoSaveAttempt(studentId, {
        assessment: assessmentId,
        timeSpent: 5,
        answers: [{ question: otherQuestionId, selectedAnswer: "not permitted" }]
      }),
      /Invalid question in saved answers/
    );
  } finally {
    Assessment.findById = previous.assessmentFindById;
    Student.findById = previous.studentFindById;
    ReattemptAssignment.findOne = previous.reattemptFindOne;
  }
});

test("assessment auto-save rejects data when no matching active attempt exists", async () => {
  const studentId = objectId();
  const assessmentId = objectId();
  const previous = {
    assessmentFindById: Assessment.findById,
    studentFindById: Student.findById,
    reattemptFindOne: ReattemptAssignment.findOne
  };
  Assessment.findById = async () => ({
    _id: assessmentId,
    isActive: true,
    status: "Published",
    questions: [],
    assignedStudents: []
  });
  Student.findById = async () => ({
    currentAttempt: {
      assessmentId: objectId(),
      status: "in-progress",
      answers: [],
      save: async () => {}
    }
  });
  ReattemptAssignment.findOne = () => ({ sort: async () => null });
  try {
    await assert.rejects(
      autoSaveAttempt(studentId, { assessment: assessmentId, timeSpent: 1, answers: [] }),
      /No active assessment attempt was found/
    );
  } finally {
    Assessment.findById = previous.assessmentFindById;
    Student.findById = previous.studentFindById;
    ReattemptAssignment.findOne = previous.reattemptFindOne;
  }
});
