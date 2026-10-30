export const isAssessmentExpiringSoon = (assessment) =>
  (assessment?.setMetrics?.expiringSoonSetIndexes?.length || 0) > 0

export const getAssessmentSetTotals = (assessments) => assessments.reduce((totals, assessment) => {
  const metrics = assessment.setMetrics
  totals.assigned += metrics?.assignedSetCount || 0
  totals.notAssigned += metrics?.availableSetCount || 0
  totals.total += metrics?.totalSetCount || 0
  totals.expiringSoon += metrics?.expiringSoonSetIndexes?.length || 0
  return totals
}, { assigned: 0, notAssigned: 0, total: 0, expiringSoon: 0 })

export const formatSetRatio = (count, total) => `${count}/${total}`

const FACULTY_EXPIRING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

export const isFacultyAssessmentExpiringSoon = (assessment, now = Date.now()) => {
  if (assessment?.setMetrics) {
    return (assessment.setMetrics.expiringSoonSetIndexes?.length || 0) > 0
  }
  if (!assessment.assignedStudents?.length || !assessment.endDate) return false
  const deadline = new Date(assessment.endDate).getTime()
  return Number.isFinite(deadline) && deadline > now && deadline <= now + FACULTY_EXPIRING_SOON_WINDOW_MS
}

export const getFacultyAssessmentDashboardMetrics = (assessments, now = Date.now()) => {
  const items = Array.isArray(assessments) ? assessments : []
  const setTotals = getAssessmentSetTotals(items)

  return {
    total: setTotals.total,
    assigned: setTotals.assigned,
    notAssigned: setTotals.notAssigned,
    facultyCreated: items.filter((assessment) => Boolean(assessment.assignedFaculty)).length,
    adminCreated: items.filter((assessment) => Boolean(assessment.createdByAdmin)).length,
    expiringSoon: items.filter((assessment) => isFacultyAssessmentExpiringSoon(assessment, now)).length,
  }
}