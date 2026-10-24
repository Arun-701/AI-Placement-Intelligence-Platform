const assert = require("assert");
const { getAssessmentAssignmentDates } = require("../utils/assessmentAssignmentDates");
const { validateAssessmentDeadline } = require("../validators/assessmentValidator");

const now = Date.now();
const setDeadline = new Date(now - 1);
const parentDeadline = new Date(now + 60_000);
const assessment = {
  startDate: new Date(now - 60_000),
  endDate: parentDeadline,
  questionSets: [
    {
      startDate: new Date(now - 120_000),
      endDate: setDeadline,
    },
  ],
  setAssignments: [{ setIndex: 0 }],
};

assert.deepStrictEqual(
  getAssessmentAssignmentDates(assessment, assessment.setAssignments[0]),
  {
    startDate: assessment.questionSets[0].startDate,
    endDate: setDeadline,
  }
);
assert.strictEqual(
  validateAssessmentDeadline(assessment, "student-id", assessment.setAssignments[0]).message,
  "Assessment deadline has expired."
);

const explicitAssignment = {
  setIndex: 0,
  startDate: new Date(now - 30_000),
  endDate: new Date(now + 30_000),
};
assert.deepStrictEqual(
  getAssessmentAssignmentDates(assessment, explicitAssignment),
  {
    startDate: explicitAssignment.startDate,
    endDate: explicitAssignment.endDate,
  }
);

console.log("assessment assignment date precedence tests passed");
