const assert = require('assert');
const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentResult = require('../models/AssessmentResult');
const Student = require('../models/Student');
const QuestionBank = require('../models/QuestionBank');
const assessmentResultController = require('../controllers/assessmentResultController');

(async () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  const assessmentId = new mongoose.Types.ObjectId().toString();
  const questionId = new mongoose.Types.ObjectId().toString();

  const fakeAssessment = {
    _id: assessmentId,
    title: 'Placement Mock',
    isActive: true,
    status: 'Published',
    questions: [questionId],
    assignedStudents: [new mongoose.Types.ObjectId().toString()],
    isInitialAssessment: false,
  };

  const fakeStudent = {
    _id: studentId,
    initialAssessmentCompleted: false,
    baselineAssessment: null,
    save: async function () {
      return this;
    },
  };

  const fakeQuestion = {
    _id: questionId,
    marks: 10,
    topic: 'JavaScript',
    correctAnswer: 'A',
  };

  Assessment.findById = async () => fakeAssessment;
  AssessmentResult.findOne = async () => null;
  AssessmentResult.create = async () => ({ _id: new mongoose.Types.ObjectId().toString(), submittedAt: new Date() });
  Student.findById = async () => fakeStudent;
  QuestionBank.find = async () => [fakeQuestion];

  const req = {
    body: {
      assessment: assessmentId,
      answers: [{ question: questionId, selectedAnswer: 'A' }],
    },
    user: { id: studentId, role: 'student' },
    params: {},
    query: {},
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  await assessmentResultController.submitResult(req, res);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.payload.success, false);
  assert.ok(res.payload.message.includes('assigned'));
  console.log('assessment flow guard test passed');
})();
