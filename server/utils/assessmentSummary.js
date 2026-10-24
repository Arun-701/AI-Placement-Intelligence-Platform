const {
  getAssessmentAssignedStudentCount,
  getAssessmentSetMetrics,
} = require("./assessmentSetMetrics");

const buildAssessmentSummary = (assessment, results = [], now = new Date()) => {
  const latestResults = new Map();
  results.forEach((result) => {
    const studentId = String(result.student?._id || result.student);
    const previous = latestResults.get(studentId);
    if (!previous || new Date(result.submittedAt || result.createdAt) > new Date(previous.submittedAt || previous.createdAt)) {
      latestResults.set(studentId, result);
    }
  });

  const scores = [...latestResults.values()]
    .map((result) => result.percentage)
    .filter((percentage) => percentage !== null && percentage !== undefined && percentage !== "")
    .map(Number)
    .filter(Number.isFinite);
  const attendedCount = latestResults.size;
  const assignedCount = getAssessmentAssignedStudentCount(assessment);
  const setMetrics = getAssessmentSetMetrics(assessment, now);

  return {
    ...assessment,
    statusLabel: setMetrics.statusLabel,
    setMetrics,
    totalQuestions: assessment.questions?.length || 0,
    assignedCount,
    attendedCount,
    notAttendedCount: Math.max(0, assignedCount - attendedCount),
    averagePercentage: scores.length
      ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
      : null,
    highestPercentage: scores.length ? Math.max(...scores) : null,
    lowestPercentage: scores.length ? Math.min(...scores) : null,
  };
};

module.exports = { buildAssessmentSummary };
