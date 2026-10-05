const hasAssignmentData = (assignment) =>
  Boolean(assignment?.assignedStudents?.length || assignment?.departments?.length)

export const getAssignedSetIndexes = (assessment) => {
  const assignedSetIndexes = new Set(
    (assessment?.setAssignments || [])
    .filter(hasAssignmentData)
    .map((assignment) => Number(assignment.setIndex))
    .filter((setIndex) => Number.isInteger(setIndex) && setIndex >= 0 && setIndex < (assessment?.questionSets?.length || 0))
  )

  if (
    assignedSetIndexes.size === 0 &&
    assessment?.questionSets?.length === 1 &&
    (assessment.assignedStudents?.length || assessment.department)
  ) {
    assignedSetIndexes.add(0)
  }

  return assignedSetIndexes
}

export const getUnassignedSetIndexes = (assessment) => {
  const assignedSetIndexes = getAssignedSetIndexes(assessment)
  return (assessment?.questionSets || [])
    .map((_, index) => index)
    .filter((index) => !assignedSetIndexes.has(index))
}

export const getQuestionSetQuestionIds = (questionSet) => {
  if (questionSet?.questions?.length) return questionSet.questions
  return questionSet?.questionIds || []
}

export const getAssessmentResultsPath = (assessment) => {
  const setCount = Array.isArray(assessment?.questionSets) ? assessment.questionSets.length : 0
  const setQuery = setCount === 1 ? '?setIndex=0' : ''
  return `/admin/assessments/results/${assessment._id}${setQuery}`
}