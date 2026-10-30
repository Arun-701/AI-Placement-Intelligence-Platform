const assert = require("assert");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const AssessmentAttendanceRequest = require("../models/AssessmentAttendanceRequest");
const AssessmentResult = require("../models/AssessmentResult");
const ReattemptAssignment = require("../models/ReattemptAssignment");
const Student = require("../models/Student");

const originals = [
  [Assessment, "findOne"],
  [AssessmentAttendanceRequest, "find"],
  [AssessmentResult, "exists"],
  [ReattemptAssignment, "find"],
  [Student, "find"],
];
const originalMethods = originals.map(([model, method]) => model[method]);

const run = async () => {
  const assessmentId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const assessment = {
    _id: assessmentId,
    title: "Five Sets",
    assignedFaculty: null,
    assignedStudents: [studentId],
    questionSets: Array.from({ length: 5 }, (_, index) => ({
      setNumber: index + 1,
      questions: [new mongoose.Types.ObjectId()],
    })),
    setAssignments: [],
  };
  const request = {
    _id: new mongoose.Types.ObjectId(),
    student: studentId,
    assessment: assessmentId,
    originalAssignment: assessmentId,
    originalAssignmentType: "assessment",
    setIndex: 0,
  };

  Assessment.findOne = () => ({
    populate: () => ({ lean: async () => assessment }),
  });
  AssessmentAttendanceRequest.find = () => ({ lean: async () => [request] });
  AssessmentResult.exists = async () => false;
  ReattemptAssignment.find = () => ({
    select: () => ({ lean: async () => [] }),
  });
  Student.find = () => ({
    select: () => ({
      lean: async () => [{ _id: studentId, name: "Student A", department: "IT" }],
    }),
  });

  const controller = require("../controllers/adminAssessmentController");
  const response = {
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
  await controller.getReattemptOptions({
    params: { id: assessmentId.toString() },
    body: { studentIds: [studentId.toString()] },
  }, response);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.payload.success, true);
  const data = response.payload.data;
  assert.strictEqual(data.assessment.questionSets.length, 5);
  assert.deepStrictEqual(data.setIndexes, [0, 1, 2, 3, 4]);
  assert.deepStrictEqual(data.availableSetIndexes, [1, 2, 3, 4]);
  assert.deepStrictEqual(data.studentSetAssignments[studentId.toString()], [0]);
  console.log("reattempt options API mapping test passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  originals.forEach(([model, method], index) => {
    model[method] = originalMethods[index];
  });
});
