const assert = require("assert");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");

const originalAssessmentFind = Assessment.find;
const originalResultFind = AssessmentResult.find;

const run = async () => {
  const assessmentId = new mongoose.Types.ObjectId();
  const assessment = {
    _id: assessmentId,
    title: "Partially Assigned Assessment",
    department: "IT",
    assignedStudents: ["student-1"],
    usesMultiSetAssignment: true,
    questionSets: Array.from({ length: 5 }, (_, index) => ({
      setNumber: index + 1,
      questions: [`question-${index + 1}`],
    })),
    setAssignments: [{
      setIndex: 0,
      departments: ["IT"],
      assignedStudents: ["student-1"],
      endDate: new Date(Date.now() - 60_000),
    }],
    questions: [],
    createdByAdmin: "admin-1",
  };

  Assessment.find = () => ({
    sort: () => ({ lean: async () => [assessment] }),
  });
  AssessmentResult.find = () => ({
    select: () => ({ lean: async () => [] }),
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

  await controller.getAssessments({}, response);
  assert.strictEqual(response.statusCode, 200);
  const [item] = response.payload.data;
  assert.strictEqual(item.statusLabel, "EXPIRED");
  assert.strictEqual(item.setMetrics.totalSetCount, 5);
  assert.strictEqual(item.setMetrics.assignedSetCount, 1);
  assert.strictEqual(item.setMetrics.currentAssignedSetCount, 0);
  assert.strictEqual(item.setMetrics.availableSetCount, 4);
  assert.deepStrictEqual(item.setMetrics.expiredSetIndexes, [0]);
  assert.deepStrictEqual(item.setMetrics.availableSetIndexes, [1, 2, 3, 4]);
  console.log("admin assessment set metrics API test passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  Assessment.find = originalAssessmentFind;
  AssessmentResult.find = originalResultFind;
});
