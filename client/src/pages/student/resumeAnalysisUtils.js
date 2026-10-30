export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const MAX_JD_LENGTH = 5000

export function formatFileSize(size) {
  const value = Number(size) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function validateFile(file, allowedExtensions) {
  if (!file) return 'Choose a file first.'
  const extension = `.${file.name.split('.').pop().toLowerCase()}`
  if (!allowedExtensions.includes(extension)) return `Supported formats: ${allowedExtensions.join(', ')}.`
  if (file.size > MAX_FILE_SIZE) return 'Maximum file size is 5MB.'
  return ''
}

export function validateAnalysisInputs({ resume, jobDescription }) {
  if (!resume) return 'Upload your resume before starting an analysis.'
  const text = typeof jobDescription === 'string' ? jobDescription.trim() : ''
  if (!text) return 'A job description is required to calculate your job match.'
  if (text.length > MAX_JD_LENGTH) return `Job description must be ${MAX_JD_LENGTH} characters or fewer.`
  return ''
}

export function getScore(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 ? Math.min(100, Math.round(score)) : null
}

export function getAnalysisRecord(response) {
  const record = response?.data?.data
  return record && typeof record === 'object' && !Array.isArray(record)
    && typeof record.analysisId === 'string' && record.analysisId.trim()
    ? record
    : null
}

export function getKeywordCounts(analysis) {
  const matched = Array.isArray(analysis?.matchedKeywords) ? analysis.matchedKeywords : []
  const partial = Array.isArray(analysis?.partialKeywords) ? analysis.partialKeywords : []
  const missing = Array.isArray(analysis?.missingKeywords) ? analysis.missingKeywords : []
  return { matched, partial, missing, total: matched.length + partial.length + missing.length }
}
