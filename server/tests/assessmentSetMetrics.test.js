const assert = require("assert");
const { EXPIRING_SOON_WINDOW_MS, getAssessmentSetMetrics } = require("../utils/assessmentSetMetrics");
const { getReattemptSetAvailability } = require("../utils/reattemptSetAvailability");

const now = new Date("2026-10-05T10:00:00.000Z");
const sets = Array.from({ length: 5 }, (_, index) => ({
  setNumber: index + 1,
  questions: [`question-${index + 1}`],
}));
const assignedSet = (setIndex, endDate) => ({
  setIndex,
  assignedStudents: [`student-${setIndex}`],
  departments: ["IT"],
  endDate,
});

const oneExpiredOfFive = getAssessmentSetMetrics({
  questionSets: sets,
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() - 1))],
}, now);
assert.strictEqual(oneExpiredOfFive.totalSetCount, 5);
assert.strictEqual(oneExpiredOfFive.assignedSetCount, 1);
assert.strictEqual(oneExpiredOfFive.currentAssignedSetCount, 0);
assert.strictEqual(oneExpiredOfFive.availableSetCount, 4);
assert.deepStrictEqual(oneExpiredOfFive.expiredSetIndexes, [0]);
assert.deepStrictEqual(oneExpiredOfFive.availableSetIndexes, [1, 2, 3, 4]);
assert.strictEqual(oneExpiredOfFive.statusLabel, "EXPIRED");
const reattemptAvailability = getReattemptSetAvailability({
  assessment: {
    questionSets: sets,
    setAssignments: [assignedSet(0)],
  },
  studentIds: ["student-0"],
  originalAssignments: [{ student: "student-0", setIndex: 0 }],
});
assert.deepStrictEqual(reattemptAvailability.availableSetIndexes, [1, 2, 3, 4]);

const twoAssigned = getAssessmentSetMetrics({
  questionSets: sets,
  usesMultiSetAssignment: true,
  setAssignments: [
    assignedSet(0, new Date(now.getTime() - 1)),
    assignedSet(1, new Date(now.getTime() + 60_000)),
  ],
}, now);
assert.strictEqual(twoAssigned.assignedSetCount, 2);
assert.strictEqual(twoAssigned.currentAssignedSetCount, 1);
assert.strictEqual(twoAssigned.availableSetCount, 3);
assert.deepStrictEqual(twoAssigned.currentAssignedSetIndexes, [1]);

const allFiveExpired = getAssessmentSetMetrics({
  questionSets: sets,
  usesMultiSetAssignment: true,
  setAssignments: sets.map((_, index) => assignedSet(index, new Date(now.getTime() - 1))),
}, now);
assert.strictEqual(allFiveExpired.assignedSetCount, 5);
assert.strictEqual(allFiveExpired.currentAssignedSetCount, 0);
assert.strictEqual(allFiveExpired.availableSetCount, 0);
assert.strictEqual(allFiveExpired.expiredSetIndexes.length, 5);
assert.strictEqual(allFiveExpired.statusLabel, "EXPIRED");

const singleSetExpired = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() - 1))],
}, now);
assert.strictEqual(singleSetExpired.totalSetCount, 1);
assert.strictEqual(singleSetExpired.assignedSetCount, 1);
assert.strictEqual(singleSetExpired.currentAssignedSetCount, 0);
assert.strictEqual(singleSetExpired.availableSetCount, 0);
assert.deepStrictEqual(singleSetExpired.expiredSetIndexes, [0]);

const singleSetLive = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() + 60_000))],
}, now);
assert.strictEqual(singleSetLive.currentAssignedSetCount, 1);
assert.deepStrictEqual(singleSetLive.currentAssignedSetIndexes, [0]);

const assignmentNotStarted = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [{
    ...assignedSet(0, new Date(now.getTime() + 60_000)),
    startDate: new Date(now.getTime() + 60_000),
  }],
}, now);
assert.strictEqual(assignmentNotStarted.currentAssignedSetCount, 0);

const differentDeadlines = getAssessmentSetMetrics({
  questionSets: sets.map((set, index) => ({
    ...set,
    endDate: index === 0
      ? new Date(now.getTime() + 2 * 60 * 60 * 1000)
      : index === 1
        ? new Date(now.getTime() + 3 * EXPIRING_SOON_WINDOW_MS)
        : undefined,
  })),
  usesMultiSetAssignment: true,
  setAssignments: [
    { ...assignedSet(0, new Date(now.getTime() + 2 * 60 * 60 * 1000)), startDate: new Date(now.getTime() - 1000) },
    assignedSet(1, new Date(now.getTime() + 3 * EXPIRING_SOON_WINDOW_MS)),
  ],
}, now);
assert.deepStrictEqual(differentDeadlines.expiringSoonSetIndexes, [0]);

const expiredYesterday = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() - EXPIRING_SOON_WINDOW_MS))],
}, now);
assert.deepStrictEqual(expiredYesterday.expiringSoonSetIndexes, []);
assert.deepStrictEqual(expiredYesterday.expiredSetIndexes, [0]);

const exactlyTwentyFourHours = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() + EXPIRING_SOON_WINDOW_MS))],
}, now);
assert.deepStrictEqual(exactlyTwentyFourHours.expiringSoonSetIndexes, [0]);

const justOverTwentyFourHours = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0, new Date(now.getTime() + EXPIRING_SOON_WINDOW_MS + 1))],
}, now);
assert.deepStrictEqual(justOverTwentyFourHours.expiringSoonSetIndexes, []);

const noDeadline = getAssessmentSetMetrics({
  questionSets: [sets[0]],
  usesMultiSetAssignment: true,
  setAssignments: [assignedSet(0)],
}, now);
assert.deepStrictEqual(noDeadline.expiringSoonSetIndexes, []);
assert.deepStrictEqual(noDeadline.expiredSetIndexes, []);

console.log("assessment set metrics tests passed");
