import assert from 'node:assert/strict'
import test from 'node:test'
import { formatSetRatio, getAssessmentSetTotals, isAssessmentExpiringSoon } from './assessmentMetrics.js'

test('set KPI totals sum set counts across assessments', () => {
  const assessments = [
    { setMetrics: { totalSetCount: 5, assignedSetCount: 1, currentAssignedSetCount: 0, availableSetCount: 4, expiringSoonSetIndexes: [0] } },
    { setMetrics: { totalSetCount: 5, assignedSetCount: 2, currentAssignedSetCount: 2, availableSetCount: 3, expiringSoonSetIndexes: [] } },
  ]

  assert.deepEqual(getAssessmentSetTotals(assessments), {
    assigned: 3,
    notAssigned: 7,
    total: 10,
    expiringSoon: 1,
  })
  assert.equal(formatSetRatio(2, 5), '2/5')
  assert.equal(formatSetRatio(3, 5), '3/5')
})

test('Expiring Soon matches only server-calculated expiring set indexes', () => {
  assert.equal(isAssessmentExpiringSoon({ setMetrics: { expiringSoonSetIndexes: [0] } }), true)
  assert.equal(isAssessmentExpiringSoon({ setMetrics: { expiringSoonSetIndexes: [] } }), false)
  assert.equal(isAssessmentExpiringSoon({ endDate: new Date(Date.now() - 1) }), false)
})
