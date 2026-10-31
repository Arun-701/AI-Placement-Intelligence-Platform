export const formatReadinessPercentage = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return '—'
  const score = Number(value)
  return Number.isFinite(score) ? `${Number(score.toFixed(2))}%` : '—'
}
