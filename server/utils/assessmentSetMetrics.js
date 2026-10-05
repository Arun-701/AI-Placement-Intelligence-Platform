const { POST_DEADLINE_VISIBILITY_MS } = require("./assessmentVisibility");

const EXPIRING_SOON_WINDOW_MS = POST_DEADLINE_VISIBILITY_MS;

const hasAssignmentData = (assignment) =>
  Boolean(assignment?.assignedStudents?.length || assignment?.departments?.length);

const getAssessmentSetMetrics = (assessment, now = new Date()) => {
  const questionSets = assessment.questionSets || [];
  const totalSetCount = questionSets.length || (assessment.usesMultiSetAssignment ? 0 : 1);
  const assignmentsByIndex = new Map();
  for (const assignment of assessment.setAssignments || []) {
    const setIndex = Number(assignment.setIndex);
    if (
      Number.isInteger(setIndex) &&
      setIndex >= 0 &&
      setIndex < totalSetCount &&
      hasAssignmentData(assignment)
    ) {
      assignmentsByIndex.set(setIndex, assignment);
    }
  }

  if (
    !assignmentsByIndex.size &&
    totalSetCount === 1 &&
    (assessment.assignedStudents?.length || assessment.department)
  ) {
    assignmentsByIndex.set(0, null);
  }

  const nowTime = new Date(now).getTime();
  const expiringSoonEnd = nowTime + EXPIRING_SOON_WINDOW_MS;
  const setIndexes = Array.from({ length: totalSetCount }, (_, index) => index);
  const assignedSetIndexes = [...assignmentsByIndex.keys()].sort((left, right) => left - right);
  const availableSetIndexes = setIndexes.filter((setIndex) => !assignmentsByIndex.has(setIndex));
  const expiredSetIndexes = [];
  const expiringSoonSetIndexes = [];
  const currentAssignedSetIndexes = [];

  for (const setIndex of assignedSetIndexes) {
    const assignment = assignmentsByIndex.get(setIndex);
    const questionSet = questionSets[setIndex];
    const startDate = assignment?.startDate || questionSet?.startDate || assessment.startDate;
    const deadline = assignment?.endDate || questionSet?.endDate || assessment.endDate;
    if (!Number.isFinite(nowTime)) continue;

    const startTime = startDate ? new Date(startDate).getTime() : null;
    const deadlineTime = deadline ? new Date(deadline).getTime() : null;
    const hasValidStartDate = startTime === null || Number.isFinite(startTime);
    const hasValidDeadline = deadlineTime === null || Number.isFinite(deadlineTime);
    const hasStarted = startTime === null || (hasValidStartDate && startTime <= nowTime);
    const isNotExpired = deadlineTime === null || (hasValidDeadline && deadlineTime > nowTime);

    if (deadlineTime !== null && hasValidDeadline && deadlineTime <= nowTime) {
      expiredSetIndexes.push(setIndex);
    } else if (deadlineTime !== null && hasValidDeadline && deadlineTime <= expiringSoonEnd && hasStarted) {
      expiringSoonSetIndexes.push(setIndex);
    }
    if (hasValidStartDate && hasValidDeadline && hasStarted && isNotExpired) {
      currentAssignedSetIndexes.push(setIndex);
    }
  }

  return {
    totalSetCount,
    assignedSetCount: assignedSetIndexes.length,
    currentAssignedSetCount: currentAssignedSetIndexes.length,
    availableSetCount: availableSetIndexes.length,
    assignedSetIndexes,
    currentAssignedSetIndexes,
    availableSetIndexes,
    expiredSetIndexes,
    expiringSoonSetIndexes,
    statusLabel: !assignedSetIndexes.length
      ? "NOT_ASSIGNED"
      : expiredSetIndexes.length === assignedSetIndexes.length
        ? "EXPIRED"
        : "ASSIGNED",
  };
};

module.exports = { EXPIRING_SOON_WINDOW_MS, getAssessmentSetMetrics };
