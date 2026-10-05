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