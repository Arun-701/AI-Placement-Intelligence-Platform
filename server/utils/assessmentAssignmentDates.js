const getAssessmentAssignmentDates = (assessment, assignment = null, setIndex = assignment?.setIndex) => {
  const questionSet = Number.isInteger(Number(setIndex))
    ? assessment.questionSets?.[Number(setIndex)]
    : null;

  return {
    startDate: assignment?.startDate || questionSet?.startDate || assessment.startDate,
    endDate: assignment?.endDate || questionSet?.endDate || assessment.endDate,
  };
};

module.exports = { getAssessmentAssignmentDates };
