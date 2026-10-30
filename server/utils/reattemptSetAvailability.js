const normalizeId = (value) => String(value?._id || value);

const getReattemptSetAvailability = ({ assessment, studentIds, previousReattemptAssignments = [], originalAssignments = [] }) => {
  const questionSets = assessment.questionSets?.length
    ? assessment.questionSets
    : (assessment.questions || []).length
      ? [{ setNumber: 1, title: "Set 1", questions: assessment.questions.map((question) => question?._id || question) }]
      : [];
  const selectedIds = [...new Set(studentIds.map(normalizeId))];
  const studentSetAssignments = Object.fromEntries(selectedIds.map((studentId) => [studentId, new Set()]));

  for (const assignment of assessment.setAssignments || []) {
    const setIndex = Number(assignment.setIndex);
    for (const assignedStudent of assignment.assignedStudents || []) {
      const studentId = normalizeId(assignedStudent);
      if (studentSetAssignments[studentId]) studentSetAssignments[studentId].add(setIndex);
    }
  }

  if (!(assessment.setAssignments || []).length && questionSets.length === 1) {
    for (const assignedStudent of assessment.assignedStudents || []) {
      const studentId = normalizeId(assignedStudent);
      if (studentSetAssignments[studentId]) studentSetAssignments[studentId].add(0);
    }
  }

  for (const assignment of previousReattemptAssignments) {
    const setIndex = Number(assignment.setIndex);
    for (const assignedStudent of assignment.students || []) {
      const studentId = normalizeId(assignedStudent);
      if (studentSetAssignments[studentId]) studentSetAssignments[studentId].add(setIndex);
    }
  }

  for (const assignment of originalAssignments) {
    const studentId = normalizeId(assignment.student);
    const setIndex = Number(assignment.setIndex);
    if (studentSetAssignments[studentId] && Number.isInteger(setIndex)) {
      studentSetAssignments[studentId].add(setIndex);
    }
  }

  const setIndexes = questionSets.map((_, index) => index);
  const availableSetIndexes = setIndexes.filter((setIndex) => {
    const set = questionSets[setIndex];
    const hasQuestions = (set.questions?.length || set.questionIds?.length) > 0;
    return hasQuestions && selectedIds.every((studentId) => !studentSetAssignments[studentId].has(setIndex));
  });
  const assignedSetIndexes = [...new Set(
    Object.values(studentSetAssignments).flatMap((setIndexesForStudent) => [...setIndexesForStudent])
  )].sort((left, right) => left - right);

  return {
    questionSets,
    setIndexes,
    availableSetIndexes,
    assignedSetIndexes,
    studentSetAssignments: Object.fromEntries(
      Object.entries(studentSetAssignments).map(([studentId, setIndexesForStudent]) => [studentId, [...setIndexesForStudent]])
    ),
  };
};

module.exports = { getReattemptSetAvailability };
