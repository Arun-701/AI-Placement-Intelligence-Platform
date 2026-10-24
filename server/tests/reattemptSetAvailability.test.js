const assert = require("assert");
const { getReattemptSetAvailability } = require("../utils/reattemptSetAvailability");

const studentA = "student-a";
const studentB = "student-b";
const assessmentWithFiveSets = {
  questionSets: Array.from({ length: 5 }, (_, index) => ({
    setNumber: index + 1,
    questions: [`question-${index + 1}`],
  })),
  setAssignments: [{ setIndex: 0, assignedStudents: [studentA] }],
};

const studentAAvailability = getReattemptSetAvailability({
  assessment: assessmentWithFiveSets,
  studentIds: [studentA],
});
assert.deepStrictEqual(studentAAvailability.setIndexes, [0, 1, 2, 3, 4]);
assert.deepStrictEqual(studentAAvailability.assignedSetIndexes, [0]);
assert.deepStrictEqual(studentAAvailability.availableSetIndexes, [1, 2, 3, 4]);

const legacyMultiSetAvailability = getReattemptSetAvailability({
  assessment: { questionSets: assessmentWithFiveSets.questionSets, assignedStudents: [studentA] },
  studentIds: [studentA],
  originalAssignments: [{ student: studentA, setIndex: 0 }],
});
assert.deepStrictEqual(legacyMultiSetAvailability.availableSetIndexes, [1, 2, 3, 4]);

const studentBAvailability = getReattemptSetAvailability({
  assessment: assessmentWithFiveSets,
  studentIds: [studentB],
});
assert.deepStrictEqual(studentBAvailability.availableSetIndexes, [0, 1, 2, 3, 4]);

const assessmentWithAnotherStudentsSet = {
  ...assessmentWithFiveSets,
  setAssignments: [
    { setIndex: 0, assignedStudents: [studentA] },
    { setIndex: 1, assignedStudents: [studentB] },
  ],
};
assert.deepStrictEqual(getReattemptSetAvailability({
  assessment: assessmentWithAnotherStudentsSet,
  studentIds: [studentA],
}).availableSetIndexes, [1, 2, 3, 4]);

const mixedAvailability = getReattemptSetAvailability({
  assessment: assessmentWithFiveSets,
  studentIds: [studentA, studentB],
});
assert.deepStrictEqual(mixedAvailability.availableSetIndexes, [1, 2, 3, 4]);

const allSetsUsedAssessment = {
  ...assessmentWithFiveSets,
  setAssignments: Array.from({ length: 5 }, (_, setIndex) => ({ setIndex, assignedStudents: [studentA] })),
};
assert.deepStrictEqual(getReattemptSetAvailability({
  assessment: allSetsUsedAssessment,
  studentIds: [studentA],
}).availableSetIndexes, []);

const singleSetAvailability = getReattemptSetAvailability({
  assessment: { questions: ["single-question"], assignedStudents: [studentA] },
  studentIds: [studentA],
});
assert.deepStrictEqual(singleSetAvailability.availableSetIndexes, []);
assert.deepStrictEqual(getReattemptSetAvailability({
  assessment: { questions: ["single-question"], assignedStudents: [studentA] },
  studentIds: [studentB],
}).availableSetIndexes, [0]);

const previousReattemptAvailability = getReattemptSetAvailability({
  assessment: assessmentWithFiveSets,
  studentIds: [studentA],
  previousReattemptAssignments: [{ students: [studentA], setIndex: 1 }],
});
assert.deepStrictEqual(previousReattemptAvailability.availableSetIndexes, [2, 3, 4]);

console.log("reattempt set availability tests passed");
