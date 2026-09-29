import { useState } from 'react'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'
import './QuestionUpload.css'
import { useNavigate } from 'react-router-dom'

export default function AdminQuestionUpload({ embedded = false }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [importedQuestionIds, setImportedQuestionIds] = useState([])
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [assessmentDescription, setAssessmentDescription] = useState('')
  const [assessmentDuration, setAssessmentDuration] = useState(60)
  const [allQuestionsConfirmed, setAllQuestionsConfirmed] = useState(false)
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false)
  const [questionSets, setQuestionSets] = useState([])
  const navigate = useNavigate()

  const analyze = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!file) return setError('Choose a PDF, DOC, or DOCX file first.');
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    const result = await api.upload('/admin/questions/upload', form);
    setBusy(false);
    if (!result.ok) return setError(result.data?.message || 'Upload failed.');

    setPreview(result.data.data);
    setQuestions(result.data.data.questions);
    setAllQuestionsConfirmed(false);
    setStatus('Questions extracted. Review them before importing.');
  }

  const update = (index, field, value) => setQuestions((current) => current.map((question, i) => i === index ? { ...question, [field]: value } : question))

  const addOption = (index) => setQuestions((current) => current.map((question, i) => i === index ? { ...question, options: [...question.options, ''] } : question))

  const remove = (index) => setQuestions((current) => current.filter((_, i) => i !== index))

  const confirmAllQuestions = () => {
    setAllQuestionsConfirmed(true)
    setStatus('All questions confirmed. Ready to import.')
  }

  const importValid = async () => {
    const validQuestions = questions.filter((q) => q.question?.trim() && q.options?.length === 4 && q.correctAnswer && q.options.includes(q.correctAnswer))
    if (!preview?.token || !validQuestions.length) return setError('There are no valid questions to import.')
    if (!allQuestionsConfirmed) return setError('Please confirm all questions before importing.')

    setShowImportConfirmModal(true)
  }

  const proceedWithImport = async () => {
    setShowImportConfirmModal(false)
    const validQuestions = questions.filter((q) => q.question?.trim() && q.options?.length === 4 && q.correctAnswer && q.options.includes(q.correctAnswer))
    setBusy(true)
    setError('')

    const payload = { previewToken: preview.token, questions: validQuestions }
    const result = await api.post('/admin/questions/import', payload)
    setBusy(false)

    if (!result.ok) return setError(result.data?.message || 'Import failed.')

    const totalQuestions = result.data.data?.questionIds?.length || 0
    setStatus(result.data.message)
    setImportedQuestionIds(result.data.data?.questionIds || [])
    setPreview(null)
    setQuestions([])
    setFile(null)
    setAllQuestionsConfirmed(false)
    setQuestionSets([])
  }

  const isQuestionValid = (question) => question.question?.trim() && question.options?.length === 4 && question.correctAnswer && question.options.includes(question.correctAnswer)
  const validCount = questions.filter(isQuestionValid).length

  const buildQuestionPaperSet = (start = 1, end = 1) => ({
    id: `set-${Date.now()}-${Math.random()}`,
    start: Number(start) || 1,
    end: Number(end) || 1
  })

  const getRangeQuestionNumbers = (start, end) => {
    const safeStart = Number(start)
    const safeEnd = Number(end)

    if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeStart < 1 || safeEnd < 1 || safeStart > safeEnd) {
      return []
    }

    const numbers = []
    for (let questionNumber = safeStart; questionNumber <= safeEnd; questionNumber += 1) {
      numbers.push(questionNumber)
    }
    return numbers
  }

  const getRangeCount = (set) => {
    if (!set) return 0
    return getRangeQuestionNumbers(set.start, set.end).length
  }

  const createQuestionPaperSet = () => {
    const totalQuestions = importedQuestionIds.length || 0
    if (!totalQuestions) return

    setQuestionSets((current) => {
      if (!current.length) {
        return [buildQuestionPaperSet(1, Math.min(10, totalQuestions))]
      }

      const previousSet = current[current.length - 1]
      const nextStart = Number(previousSet.end) + 1
      const nextEnd = Math.min(totalQuestions, Math.max(nextStart, nextStart + 4))
      return [...current, buildQuestionPaperSet(nextStart, nextEnd)]
    })
  }

  const normalizeQuestionPaperSets = (sets) => {
    const totalQuestions = importedQuestionIds.length || 0
    if (!Array.isArray(sets) || !totalQuestions) return []

    let previousEnd = 0

    return sets.map((set, index) => {
      const start = index === 0 ? Number(set.start) || 1 : Math.max(previousEnd + 1, Number(set.start) || previousEnd + 1)
      const end = Math.min(totalQuestions, Math.max(start, Number(set.end) || start))
      const normalizedSet = {
        ...set,
        start,
        end
      }
      previousEnd = end
      return normalizedSet
    })
  }

  const updateQuestionPaperSet = (setId, field, value) => {
    setQuestionSets((current) => {
      const updated = current.map((set) => {
        if (set.id !== setId) return set

        if (field === 'start') {
          const nextStart = Number(value)
          const safeStart = Number.isFinite(nextStart) && nextStart >= 1 ? nextStart : 1
          return { ...set, start: safeStart }
        }

        if (field === 'end') {
          const nextEnd = Number(value)
          const safeEnd = Number.isFinite(nextEnd) && nextEnd >= 1 ? nextEnd : 1
          return { ...set, end: safeEnd }
        }

        return set
      })

      return normalizeQuestionPaperSets(updated)
    })
  }

  const removeQuestionPaperSet = (setId) => {
    setQuestionSets((current) => normalizeQuestionPaperSets(current.filter((set) => set.id !== setId)))
  }

  const getQuestionSetValidation = () => {
    if (!Array.isArray(questionSets) || !questionSets.length) {
      return { valid: false, message: 'Create at least one set before creating the assessment.', summary: [], totalAssigned: 0 }
    }

    const totalQuestions = importedQuestionIds.length || 0
    const summary = []
    const errors = []
    const assigned = new Set()

    questionSets.forEach((set, index) => {
      const numbers = getRangeQuestionNumbers(set.start, set.end)
      const overlap = numbers.filter((questionNumber) => {
        return questionSets.some((otherSet, otherIndex) => otherIndex !== index && getRangeQuestionNumbers(otherSet.start, otherSet.end).includes(questionNumber))
      })
      const validRange = Number(set.start) >= 1 && Number(set.end) >= Number(set.start) && Number(set.end) <= totalQuestions
      const valid = validRange && numbers.length > 0 && overlap.length === 0

      if (!validRange || numbers.length === 0) {
        errors.push(`Set ${index + 1} has an invalid range.`)
      }

      if (overlap.length) {
        errors.push(`Set ${index + 1} overlaps another set.`)
      }

      summary.push({
        id: set.id,
        label: `Set ${index + 1} → Questions ${set.start || 1}–${set.end || set.start || 1}`,
        count: numbers.length,
        valid
      })

      numbers.forEach((questionNumber) => assigned.add(questionNumber))
    })

    return {
      valid: !errors.length,
      message: errors[0] || '',
      summary,
      totalAssigned: assigned.size
    }
  }

  const getSelectedQuestionIdsFromSets = () => {
    const selectedNumbers = new Set()

    questionSets.forEach((set) => {
      const numbers = getRangeQuestionNumbers(set.start, set.end)
      numbers.forEach((questionNumber) => selectedNumbers.add(questionNumber))
    })

    return Array.from(selectedNumbers)
      .filter((questionNumber) => Number.isFinite(questionNumber) && questionNumber >= 1 && questionNumber <= importedQuestionIds.length)
      .map((questionNumber) => importedQuestionIds[questionNumber - 1])
      .filter(Boolean)
  }

  const createAssessment = async () => {
    if (!assessmentTitle.trim()) return setError('Please enter an assessment title.')

    const duration = Number(assessmentDuration)
    if (!Number.isFinite(duration) || duration <= 0) return setError('Please enter a valid duration in minutes.')
    if (!Array.isArray(questionSets) || !questionSets.length) return setError('Please create at least one question set.')

    const validation = getQuestionSetValidation()
    if (!validation.valid) return setError(validation.message || 'Fix the question set assignments before creating the assessment.')

    const selectedQuestionIds = getSelectedQuestionIdsFromSets()
    if (!selectedQuestionIds.length) return setError('Please create at least one valid question set.')

    setBusy(true)
    setError('')

    try {
      const result = await api.post('/admin/assessments', {
        title: assessmentTitle.trim(),
        description: assessmentDescription.trim(),
        duration,
        questionIds: [...new Set(selectedQuestionIds)],
        questionSets: questionSets.map((set, index) => ({
          setNumber: index + 1,
          questionIds: getRangeQuestionNumbers(set.start, set.end)
            .map((questionNumber) => importedQuestionIds[questionNumber - 1])
            .filter(Boolean)
        }))
      })

      setBusy(false)
      if (!result.ok) {
        return setError(result.data?.message || 'Failed to create assessment. Please try again.')
      }

      setStatus(result.data?.message || 'Assessment created successfully.')
      setImportedQuestionIds([])
      setAssessmentTitle('')
      setAssessmentDescription('')
      setAssessmentDuration(60)
      setQuestionSets([])
      navigate('/admin/assessments', { replace: true })
    } catch (error) {
      setBusy(false)
      setError('Failed to create assessment. Please try again.')
      console.error('Assessment creation failed:', error)
    }
  }

  const questionSetValidation = getQuestionSetValidation()
  const questionSetCount = questionSets.length
  const selectedCount = importedQuestionIds.length <= 20 ? importedQuestionIds.length : getSelectedQuestionIdsFromSets().length

  return (
    <>
      <AssessmentSectionNav />
      <div className="question-upload-page">
        {embedded && <div className="section-title">Upload Question Paper</div>}
        {!embedded && (
          <div className="page-title">
            <div>
              <h1>Question Bank Upload</h1>
              <div className="subtitle">Upload, review, and import MCQs into the existing question bank</div>
            </div>
          </div>
        )}

        {error && <div className="alert error">{error}</div>}
        {status && <div className="alert success">{status}</div>}

        {importedQuestionIds.length > 0 && (
          <div className="upload-panel">
            <div className="question-card-top">
              <h3>Create Assessment</h3>
              <span className="upload-pill">{importedQuestionIds.length} questions ready</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Assessment title</label>
                <input
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="e.g. Cloud Computing Assessment"
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={assessmentDuration}
                  onChange={(e) => setAssessmentDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description / instructions</label>
              <textarea
                value={assessmentDescription}
                onChange={(e) => setAssessmentDescription(e.target.value)}
              />
            </div>

            <div className="set-question-paper">
              <div className="section-title">Set Question Paper</div>

              <div className="question-manual-select">
                <div className="question-range-info">
                  <div className="range-stat">
                    <span>Total Questions:</span>
                    <strong>{importedQuestionIds.length}</strong>
                  </div>
                </div>

                {questionSets.length === 0 ? (
                  <div className="add-set-actions">
                    <button className="btn secondary" type="button" onClick={createQuestionPaperSet}>
                      + Create Set 1
                    </button>
                  </div>
                ) : (
                  <div className="question-set-list">
                    {questionSets.map((set, index) => {
                      const isAutomaticStart = index > 0
                      const startOptions = Array.from({ length: importedQuestionIds.length }, (_, i) => i + 1)
                      const endOptions = Array.from({ length: importedQuestionIds.length }, (_, i) => i + 1)
                      const selectedCount = getRangeCount(set)

                      return (
                        <div className="question-set-card" key={set.id}>
                          <div className="question-set-header">
                            <div className="set-badge">Set {index + 1}</div>
                          </div>

                          <div className="form-grid question-range-grid">
                            <div className="form-group">
                              <label>Start Question</label>
                              <select
                                value={set.start}
                                onChange={(e) => updateQuestionPaperSet(set.id, 'start', e.target.value)}
                                disabled={isAutomaticStart}
                              >
                                {startOptions.map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>End Question</label>
                              <select
                                value={set.end}
                                onChange={(e) => updateQuestionPaperSet(set.id, 'end', e.target.value)}
                              >
                                {endOptions.map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="question-range-info">
                            <div className="range-stat">
                              <span>Questions Selected:</span>
                              <strong>{selectedCount}</strong>
                            </div>
                            <button
                              className="btn secondary small"
                              type="button"
                              onClick={() => removeQuestionPaperSet(set.id)}
                            >
                              Remove Set
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    <div className="add-set-actions">
                      <button className="btn secondary" type="button" onClick={createQuestionPaperSet}>
                        + Add Set
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {questionSets.length > 0 && (
                <div className="question-set-summary">
                  <div className="section-title">QUESTION SET SUMMARY</div>
                  <table className="question-set-summary-table">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Range</th>
                        <th>No. Questions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionSets.map((set, index) => (
                        <tr key={set.id}>
                          <td>Set {index + 1}</td>
                          <td>{set.start} → {set.end}</td>
                          <td>{getRangeCount(set)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="question-set-summary-footer">
                    <div>Total Sets: {questionSets.length}</div>
                    <div>Total Selected Questions: {questionSetValidation.totalAssigned}</div>
                  </div>
                </div>
              )}

              {questionSetValidation.message && (
                <div className="validation-note">{questionSetValidation.message}</div>
              )}
            </div>

            <button
              className="btn"
              disabled={busy}
              onClick={createAssessment}
            >
              {busy ? 'Creating...' : 'Create Assessment'}
            </button>
          </div>
        )}

        {!preview && !importedQuestionIds.length && (
          <form className="upload-panel question-upload-shell" onSubmit={analyze}>
            <div className="upload-hero">
              <div className="upload-hero-copy">
                <span className="upload-hero-kicker">Question upload</span>
                <h2>Build your assessment bank</h2>
                <p>Upload a document, validate the extracted questions, and add them to the existing question bank.</p>
              </div>
              <span className="upload-pill">Supported PDF / DOC / DOCX</span>
            </div>
            <div className="upload-dropzone">
              <div className="upload-file-meta">
                <span className="upload-file-label">Question paper</span>
                <span className="upload-file-name">{file ? file.name : 'No file selected yet'}</span>
                <span className="upload-file-hint">Supported: PDF, DOC, DOCX. Maximum size: 5MB.</span>
              </div>
              <div className="upload-actions">
                <label className="inline-file-input">
                  <input
                    id="question-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  Choose file
                </label>
                <button className="btn" disabled={busy}>
                  {busy ? 'Analyzing...' : 'Upload & Analyze'}
                </button>
              </div>
            </div>
          </form>
        )}

        {preview && (
          <div className="question-upload-shell">
            <div className="upload-hero">
              <div className="upload-hero-copy">
                <span className="upload-hero-kicker">Review queue</span>
                <h2>Validate extracted questions</h2>
                <p>Check each answer set and import only the questions that are complete and accurate.</p>
              </div>
              <span className="upload-pill">{validCount} valid questions</span>
            </div>

            <div className="q-upload-stats">
              <div className="q-stat-card primary">
                <div>
                  <div className="stat-label">Total</div>
                  <div className="stat-value">{questions.length}</div>
                </div>
                <span>Questions</span>
              </div>
              <div className="q-stat-card success">
                <div>
                  <div className="stat-label">Valid</div>
                  <div className="stat-value">{validCount}</div>
                </div>
                <span>Ready</span>
              </div>
              <div className="q-stat-card warning">
                <div>
                  <div className="stat-label">Needs review</div>
                  <div className="stat-value">{questions.length - validCount}</div>
                </div>
                <span>Review</span>
              </div>
            </div>

            <div className="question-review-shell">
              <div className="section-header">
                <h3>Question review</h3>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => { setPreview(null); setQuestions([]); setAllQuestionsConfirmed(false) }}
                >
                  Cancel
                </button>
              </div>

              <div className="question-preview-list">
                {questions.map((question, index) => (
                  <div className="question-preview-card" key={question.id || index}>
                    <div className="question-card-top">
                      <h4>Question {index + 1}</h4>
                      <div className={`question-card-status ${isQuestionValid(question) ? 'confirmed' : 'needs'}`}>
                        {isQuestionValid(question) ? 'Ready' : 'Needs review'}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Question</label>
                      <textarea
                        value={question.question}
                        onChange={(e) => update(index, 'question', e.target.value)}
                      />
                    </div>

                    <div className="option-editor">
                      {question.options.map((option, optionIndex) => (
                        <div className="option-row" key={optionIndex}>
                          <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                          <input
                            value={option}
                            onChange={(e) => update(index, 'options', question.options.map((item, i) => i === optionIndex ? e.target.value : item))}
                          />
                        </div>
                      ))}
                    </div>

                    {question.options.length < 4 && (
                      <button
                        type="button"
                        className="btn secondary small"
                        onClick={() => addOption(index)}
                      >
                        Add option
                      </button>
                    )}

                    <div className="inline-question-fields">
                      <div className="form-group question-inline-field">
                        <label>Correct Answer</label>
                        <select
                          value={question.correctAnswer}
                          onChange={(e) => update(index, 'correctAnswer', e.target.value)}
                        >
                          <option value="">Select answer</option>
                          {question.options.map((option, i) => (
                            <option key={i} value={option}>
                              {String.fromCharCode(65 + i)}. {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group question-inline-field">
                        <label>Difficulty</label>
                        <select
                          value={question.difficulty}
                          onChange={(e) => update(index, 'difficulty', e.target.value)}
                        >
                          <option value="">Select difficulty</option>
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>

                      <div className="form-group question-inline-field">
                        <label>Predicted Topic</label>
                        <input
                          value={question.topic}
                          onChange={(e) => update(index, 'topic', e.target.value)}
                        />
                      </div>
                    </div>

                    {!isQuestionValid(question) && (
                      <div className="validation-note">
                        Needs review: {question.reasons?.length ? question.reasons.join(', ') : 'check question text, four options, and a matching correct answer.'}
                      </div>
                    )}

                    <div className="review-actions">
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => remove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="review-actions-bottom">
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy || validCount === 0 || allQuestionsConfirmed}
                  onClick={confirmAllQuestions}
                >
                  {allQuestionsConfirmed ? '✓ All Questions Confirmed' : 'Confirm All Questions'}
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy || validCount === 0 || !allQuestionsConfirmed}
                  onClick={importValid}
                >
                  {busy ? 'Importing...' : `Import ${validCount} Valid Questions`}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportConfirmModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>Are you sure you want to import?</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to import these questions? Once imported, you cannot return to the question review step.</p>
              </div>
              <div className="modal-actions">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setShowImportConfirmModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={proceedWithImport}
                  disabled={busy}
                >
                  {busy ? 'Importing...' : 'Import Questions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
