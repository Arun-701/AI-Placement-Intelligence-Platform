const idOf = (value) => String(value?._id || value || "");

const questionIdsForSet = (assessment, setIndex) => {
  const questionSet = assessment.questionSets?.[setIndex];
  const questions = questionSet?.questions?.length
    ? questionSet.questions
    : questionSet?.questionIds || [];
  return questions.map(idOf).filter(Boolean).sort();
};

const questionIdsForResult = (result) =>
  (result.answers || [])
    .map((answer) => idOf(answer.question))
    .filter(Boolean)
    .sort();

const resultMatchesSetByQuestions = (result, setIndex, assessment) => {
  const resultQuestionIds = questionIdsForResult(result);
  const setQuestionIds = questionIdsForSet(assessment, setIndex);
  return resultQuestionIds.length > 0
    && resultQuestionIds.length === setQuestionIds.length
    && resultQuestionIds.every((questionId, index) => questionId === setQuestionIds[index]);
};

const getQuestionSetIndexFromResult = (result, assessment) => {
  const questionSetIndexes = (assessment.questionSets || [])
    .map((_, setIndex) => setIndex)
    .filter((setIndex) => resultMatchesSetByQuestions(result, setIndex, assessment));
  return questionSetIndexes.length === 1 ? questionSetIndexes[0] : null;
};

const buildAssessmentResultRows = (assessment, results, requests) => {
  const resultsByStudent = new Map();
  for (const result of results) {
    if (result.completed !== true && !result.submittedAt) continue;
    const studentId = idOf(result.student);
    if (!studentId) continue;
    resultsByStudent.set(studentId, [...(resultsByStudent.get(studentId) || []), result]);
  }

  const requestsByStudentAndSet = new Map();
  for (const request of requests) {
    const key = `${idOf(request.student)}:${Number(request.setIndex)}`;
    const previous = requestsByStudentAndSet.get(key);
    if (!previous || new Date(request.updatedAt || request.createdAt) > new Date(previous.updatedAt || previous.createdAt)) {
      requestsByStudentAndSet.set(key, request);
    }
  }

  const entries = [];
  const assignedStudentIds = new Set();
  for (const assignment of assessment.setAssignments || []) {
    const setIndex = Number(assignment.setIndex);
    for (const student of assignment.assignedStudents || []) {
      const studentId = idOf(student);
      if (!studentId || !student?._id) continue;
      assignedStudentIds.add(studentId);
      entries.push({ student, setIndex });
    }
  }

  for (const student of assessment.assignedStudents || []) {
    const studentId = idOf(student);
    if (student?._id && studentId && !assignedStudentIds.has(studentId)) {
      entries.push({ student, setIndex: 0 });
    }
  }

  return entries.map(({ student, setIndex }) => {
    const studentId = idOf(student);
    const studentEntries = entries.filter((entry) => idOf(entry.student) === studentId);
    const matchingResults = (resultsByStudent.get(studentId) || []).filter((result) => {
      const questionSetIndex = getQuestionSetIndexFromResult(result, assessment);
      if (questionSetIndex !== null) return questionSetIndex === setIndex;
      if (result.questionSetIndex !== null && result.questionSetIndex !== undefined
        && Number(result.questionSetIndex) === setIndex) return true;
      return false;
    });
    const result = matchingResults[0] || (
      studentEntries.length === 1
      && (resultsByStudent.get(studentId) || []).find((candidate) =>
        (candidate.questionSetIndex === null || candidate.questionSetIndex === undefined)
        && getQuestionSetIndexFromResult(candidate, assessment) === null
      )
    ) || null;
    const request = requestsByStudentAndSet.get(`${studentId}:${setIndex}`) || null;
    return {
      student,
      result,
      status: result ? "Completed" : request?.status || "Not Attended",
      requestStatus: request?.status || null,
      requestId: request?._id || null,
      setIndex,
    };
  });
};

module.exports = { buildAssessmentResultRows };
