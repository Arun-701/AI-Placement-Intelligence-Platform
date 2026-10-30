import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentIllustration from '../admin/AssessmentIllustration'
import AssessmentSectionNav from '../admin/AssessmentSectionNav'
import '../admin/AssessmentWorkflow.css'
import '../admin/QuestionUpload.css'
import './AssessmentUploadReview.css'

const ASSESSMENT_TYPES = ['Practice', 'Internal', 'Mock', 'Placement', 'Initial']

const isQuestionValid = (question) => (
  Boolean(question.question?.trim())
  && Array.isArray(question.options)
  && question.options.length === 4
  && question.options.every((option) => String(option || '').trim())
  && Boolean(question.correctAnswer?.trim())
  && question.options.includes(question.correctAnswer)
  && Boolean(question.topic?.trim())
  && !/^(?:question paper|general)$/i.test(question.topic.trim())
)

export default function FacultyAssessmentUploadReview({ onCreated }) {
  const navigate = useNavigate()
  const importInFlight = useRef(false)
  const [file, setFile] = useState(null)
  const [hasPreview, setHasPreview] = useState(false)
  const [questions, setQuestions] = useState([])
  const [importedQuestionIds, setImportedQuestionIds] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(60)
  const [assessmentType, setAssessmentType] = useState('Practice')
  const [questionSets, setQuestionSets] = useState([])
  const [allQuestionsConfirmed, setAllQuestionsConfirmed] = useState(false)
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const validCount = questions.filter(isQuestionValid).length

  useEffect(() => {
    if (!status && !error) return undefined
    const timeout = window.setTimeout(() => {
      setStatus('')
      setError('')
    }, 4000)
    return () => window.clearTimeout(timeout)
  }, [status, error])

  useEffect(() => {
    if (!showImportConfirmModal) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) setShowImportConfirmModal(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showImportConfirmModal, busy])

  const selectFile = (event) => {
    const selectedFile = event.target.files?.[0] || null
    if (!selectedFile) {
      setFile(null)
      return
    }
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(extension)) {
      setFile(null)
      setError('Only PDF, DOC, and DOCX files are allowed.')
      event.target.value = ''
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null)
      setError('Maximum file size is 5MB.')
      event.target.value = ''
      return
    }
    setError('')
    setFile(selectedFile)
  }

  const analyze = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!file) {
      setError('Choose a PDF, DOC, or DOCX file first.')
      return
    }

    setBusy(true)
    const form = new FormData()
    form.append('material', file)
    try {
      const response = await api.upload('/faculty/assessments/extract', form)
      if (!response.ok) {
        setError(response.data?.message || 'Upload failed.')
        return
      }
      const extractedQuestions = response.data?.data?.questions || []
      if (!extractedQuestions.length) {
        setError('No questions were detected in the uploaded file.')
        return
      }
      setQuestions(extractedQuestions.map((question) => ({
        ...question,
        options: Array.isArray(question.options) ? question.options : [],
      })))
      setHasPreview(true)
      setAllQuestionsConfirmed(false)
      setStatus('Questions extracted. Review them before importing.')
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const updateQuestion = (index, field, value) => {
    setAllQuestionsConfirmed(false)
    setQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, [field]: value } : question
    )))
  }

  const updateOption = (questionIndex, optionIndex, value) => {
    setAllQuestionsConfirmed(false)
    setQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question
      const previousValue = question.options[optionIndex]
      const options = question.options.map((option, indexInQuestion) => (
        indexInQuestion === optionIndex ? value : option
      ))
      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === previousValue ? value : question.correctAnswer,
      }
    }))
  }

  const addOption = (questionIndex) => {
    setAllQuestionsConfirmed(false)
    setQuestions((current) => current.map((question, index) => (
      index === questionIndex && question.options.length < 4
        ? { ...question, options: [...question.options, ''] }
        : question
    )))
  }

  const removeQuestion = (questionIndex) => {
    setAllQuestionsConfirmed(false)
    setQuestions((current) => current.filter((_, index) => index !== questionIndex))
  }

  const cancelReview = () => {
    setHasPreview(false)
    setQuestions([])
    setAllQuestionsConfirmed(false)
  }

  const confirmAllQuestions = () => {
    setAllQuestionsConfirmed(true)
    setStatus('All questions confirmed. Ready to import.')
  }

  const importValidQuestions = () => {
    setError('')
    if (!validCount) {
      setError('There are no valid questions to import.')
      return
    }
    if (!allQuestionsConfirmed) {
      setError('Please confirm all questions before importing.')
      return
    }
    setShowImportConfirmModal(true)
  }

  const proceedWithImport = async () => {
    if (importInFlight.current) return
    importInFlight.current = true
    setShowImportConfirmModal(false)
    setBusy(true)
    setError('')
    try {
      const questionsToImport = questions.filter(isQuestionValid).map((question) => ({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        difficulty: question.difficulty,
        topic: question.topic,
        questionType: question.questionType || 'MCQ',
      }))
      const response = await api.post('/faculty/assessments/questions/import', {
        questions: questionsToImport,
      })
      if (!response.ok) {
        const message = response.data?.message || `Import failed (HTTP ${response.status}).`
        console.error('Faculty question import rejected', { status: response.status, message })
        setError(message)
        return
      }
      const questionIds = response.data?.data?.questionIds || []
      if (questionIds.length !== questionsToImport.length) {
        setError(`Import response mismatch: expected ${questionsToImport.length} question IDs, received ${questionIds.length}.`)
        return
      }
      setStatus(response.data?.message || 'Questions imported successfully.')
      setImportedQuestionIds(questionIds)
      setHasPreview(false)
      setQuestions([])
      setFile(null)
      setAllQuestionsConfirmed(false)
      setQuestionSets([])
    } catch (importError) {
      console.error('Faculty question import request failed', {
        name: importError instanceof Error ? importError.name : 'UnknownError',
        message: importError instanceof Error ? importError.message : 'No error details available',
      })
      setError(importError instanceof Error && importError.message
        ? `Import failed: ${importError.message}`
        : 'Import failed. Check your connection and try again.')
    } finally {
      importInFlight.current = false
      setBusy(false)
    }
  }

  const buildQuestionPaperSet = (start = 1, end = 1) => ({
    id: `set-${Date.now()}-${Math.random()}`,
    start: Number(start) || 1,
    end: Number(end) || 1,
  })

  const getRangeQuestionNumbers = (start, end) => {
    const safeStart = Number(start)
    const safeEnd = Number(end)
    if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeStart < 1 || safeEnd < safeStart) return []
    return Array.from({ length: safeEnd - safeStart + 1 }, (_, index) => safeStart + index)
  }

  const normalizeQuestionPaperSets = (sets) => {
    if (!Array.isArray(sets) || !importedQuestionIds.length) return []
    let previousEnd = 0
    return sets.map((set, index) => {
      const start = index === 0 ? Number(set.start) || 1 : Math.max(previousEnd + 1, Number(set.start) || previousEnd + 1)
      const end = Math.min(importedQuestionIds.length, Math.max(start, Number(set.end) || start))
      previousEnd = end
      return { ...set, start, end }
    })
  }

  const createQuestionPaperSet = () => {
    const totalQuestions = importedQuestionIds.length
    if (!totalQuestions) return
    setQuestionSets((current) => {
      if (!current.length) return [buildQuestionPaperSet(1, Math.min(10, totalQuestions))]
      const nextStart = Number(current[current.length - 1].end) + 1
      return [...current, buildQuestionPaperSet(nextStart, Math.min(totalQuestions, Math.max(nextStart, nextStart + 4)))]
    })
  }

  const updateQuestionPaperSet = (setId, field, value) => {
    setQuestionSets((current) => normalizeQuestionPaperSets(current.map((set) => (
      set.id === setId ? { ...set, [field]: Number(value) || 1 } : set
    ))))
  }

  const removeQuestionPaperSet = (setId) => {
    setQuestionSets((current) => normalizeQuestionPaperSets(current.filter((set) => set.id !== setId)))
  }

  const getQuestionSetValidation = () => {
    if (!questionSets.length) return { valid: false, message: 'Create at least one set before creating the assessment.' }
    const assigned = new Set()
    for (let index = 0; index < questionSets.length; index += 1) {
      const set = questionSets[index]
      const numbers = getRangeQuestionNumbers(set.start, set.end)
      if (!numbers.length || Number(set.start) < 1 || Number(set.end) > importedQuestionIds.length) {
        return { valid: false, message: `Set ${index + 1} has an invalid range.` }
      }
      if (numbers.some((questionNumber) => assigned.has(questionNumber))) {
        return { valid: false, message: `Set ${index + 1} overlaps another set.` }
      }
      numbers.forEach((questionNumber) => assigned.add(questionNumber))
    }
    if (assigned.size !== importedQuestionIds.length) {
      return { valid: false, message: 'Every imported question must belong to exactly one set.' }
    }
    return { valid: true, message: '' }
  }

  const getSelectedQuestionIdsFromSets = () => [...new Set(questionSets.flatMap((set) => (
    getRangeQuestionNumbers(set.start, set.end)
      .filter((number) => number >= 1 && number <= importedQuestionIds.length)
      .map((number) => importedQuestionIds[number - 1])
      .filter(Boolean)
  )))]

  const createAssessment = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!title.trim()) return setError('Please enter an assessment title.')
    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) return setError('Please enter a valid duration in minutes.')
    const setValidation = getQuestionSetValidation()
    if (!setValidation.valid) return setError(setValidation.message)
    const selectedQuestionIds = getSelectedQuestionIdsFromSets()
    if (!selectedQuestionIds.length) return setError('Please create at least one valid question set.')

    setBusy(true)
    try {
      const response = await api.post('/faculty/assessments', {
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration),
        assessmentType,
        questionIds: selectedQuestionIds,
        questionSets: questionSets.map((set, index) => ({
          setNumber: index + 1,
          questionIds: getRangeQuestionNumbers(set.start, set.end)
            .map((questionNumber) => importedQuestionIds[questionNumber - 1])
            .filter(Boolean),
        })),
      })
      if (!response.ok) {
        setError(response.data?.message || 'Unable to create the assessment.')
        return
      }
      setStatus(response.data?.message || 'Assessment created successfully.')
      setFile(null)
      setImportedQuestionIds([])
      setQuestions([])
      setTitle('')
      setDescription('')
      setDuration(60)
      setAssessmentType('Practice')
      setQuestionSets([])
      await onCreated?.()
      navigate('/faculty/assessments', { replace: true })
    } catch {
      setError('Unable to create the assessment. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const questionSetValidation = getQuestionSetValidation()

  return (
    <>
      {(error || status) && (
        <div className="upload-notification-layer" aria-live="polite">
          {error && <div key={`error-${error}`} className="upload-notification upload-notification--error status-pop-in" role="alert"><span aria-hidden="true">!</span>{error}</div>}
          {status && <div key={`success-${status}`} className="upload-notification upload-notification--success status-pop-in" role="status"><span aria-hidden="true">✓</span>{status}</div>}
        </div>
      )}

      <div className="question-upload-page question-upload-shell faculty-assessment-upload">
        {(hasPreview || importedQuestionIds.length > 0) && (
          <AssessmentSectionNav basePath="/faculty/assessments" workflowStyle />
        )}

        {!hasPreview && !importedQuestionIds.length && (
          <>
            <section className="upload-hero">
              <div className="upload-hero-copy">
                <span className="upload-hero-kicker">Assessment workspace</span>
                <h2>Upload Assessment</h2>
                <p>Upload, validate, and add questions to your assessment bank</p>
              </div>
              <AssessmentIllustration variant="upload" />
            </section>
            <AssessmentSectionNav basePath="/faculty/assessments" workflowStyle />
            <form className="upload-dropzone question-paper-upload-card" onSubmit={analyze}>
              <div className="question-paper-upload-info">
                <span className="question-paper-upload-icon" aria-hidden="true">
                  <svg viewBox="0 0 48 48" fill="none">
                    <path d="M15 7.5h12l8 8v21A4.5 4.5 0 0 1 30.5 41h-15A4.5 4.5 0 0 1 11 36.5v-24A5 5 0 0 1 15 7.5Z" fill="#fff" stroke="#78A5E8" strokeWidth="2" />
                    <path d="M27 8v8h8" stroke="#78A5E8" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M17 25h12M17 30h12M17 35h7" stroke="#94A9CD" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="35" cy="34" r="8" fill="#E9E7FF" stroke="#A39BE8" strokeWidth="1.5" />
                    <path d="M35 37v-6m-2.5 2.5L35 31l2.5 2.5" stroke="#7169CC" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="upload-file-meta">
                  <span className="upload-file-label">Question paper</span>
                  <span className="upload-file-name">{file ? file.name : 'No file selected yet'}</span>
                  <span className="question-paper-upload-description">Upload your question paper to extract and validate questions.</span>
                  <span className="upload-file-hint">Supported: PDF, DOC, DOCX | Maximum size: 5MB.</span>
                </div>
              </div>
              <div className="upload-actions question-paper-upload-actions">
                <label className="inline-file-input">
                  <input
                    id="faculty-question-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={selectFile}
                    disabled={busy}
                  />
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.5 1.75h6A1.5 1.5 0 0 1 17 8.25v6.25A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M3.5 8.5h13" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Choose file
                </label>
                <button className="btn" type="submit" disabled={busy}>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="M10 12V3.5m0 0L6.75 6.75M10 3.5l3.25 3.25M4 11.5v3A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {busy ? 'Analyzing...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </>
        )}

        {hasPreview && (
          <div className="question-upload-shell">
            <section className="upload-hero">
              <div className="upload-hero-copy">
                <span className="upload-hero-kicker">Review queue</span>
                <h2>Validate extracted questions</h2>
                <p>Check each answer set and import only the questions that are complete and accurate.</p>
              </div>
              <span className="upload-pill">{validCount} valid questions</span>
            </section>

            <div className="q-upload-stats q-upload-stats-sticky">
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
                <button className="btn secondary" type="button" onClick={cancelReview} disabled={busy}>
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
                      <label htmlFor={`faculty-question-${index}`}>Question</label>
                      <textarea
                        id={`faculty-question-${index}`}
                        value={question.question || ''}
                        onChange={(event) => updateQuestion(index, 'question', event.target.value)}
                      />
                    </div>
                    <div className="option-editor">
                      {(question.options || []).map((option, optionIndex) => (
                        <div className="option-row" key={`${index}-${optionIndex}`}>
                          <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                          <input
                            aria-label={`Question ${index + 1} option ${optionIndex + 1}`}
                            value={option}
                            onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    {question.options.length < 4 && (
                      <button type="button" className="btn secondary small" onClick={() => addOption(index)}>
                        Add option
                      </button>
                    )}
                    <div className="inline-question-fields">
                      <div className="form-group question-inline-field">
                        <label htmlFor={`faculty-question-${index}-answer`}>Correct Answer</label>
                        <select
                          id={`faculty-question-${index}-answer`}
                          value={question.correctAnswer || ''}
                          onChange={(event) => updateQuestion(index, 'correctAnswer', event.target.value)}
                        >
                          <option value="">Select answer</option>
                          {(question.options || []).map((option, optionIndex) => (
                            <option key={`${index}-answer-${optionIndex}`} value={option}>
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group question-inline-field">
                        <label htmlFor={`faculty-question-${index}-difficulty`}>Difficulty</label>
                        <select
                          id={`faculty-question-${index}-difficulty`}
                          value={question.difficulty || ''}
                          onChange={(event) => updateQuestion(index, 'difficulty', event.target.value)}
                        >
                          <option value="">Select difficulty</option>
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>
                      <div className="form-group question-inline-field">
                        <label htmlFor={`faculty-question-${index}-topic`}>Predicted Topic</label>
                        <input
                          id={`faculty-question-${index}-topic`}
                          value={question.topic || ''}
                          placeholder="Prediction unavailable - enter a topic"
                          aria-invalid={!question.topic?.trim() || /^(?:question paper|general)$/i.test(question.topic.trim())}
                          onChange={(event) => updateQuestion(index, 'topic', event.target.value)}
                        />
                      </div>
                    </div>
                    {!isQuestionValid(question) && (
                      <div className="validation-note">
                        Needs review: {!question.topic?.trim() || /^(?:question paper|general)$/i.test(question.topic.trim())
                          ? 'a predicted topic is unavailable; enter a meaningful topic before import.'
                          : question.reasons?.length
                            ? question.reasons.join(', ')
                            : 'check question text, four options, and a matching correct answer.'}
                      </div>
                    )}
                    <div className="review-actions">
                      <button type="button" className="btn danger small" onClick={() => removeQuestion(index)}>
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
                  onClick={importValidQuestions}
                >
                  {busy ? 'Importing...' : `Import ${validCount} Valid Questions`}
                </button>
              </div>
            </div>
          </div>
        )}

        {importedQuestionIds.length > 0 && (
          <div className="upload-panel create-assessment-panel">
            <div className="question-card-top">
              <h3>Create Assessment</h3>
              <span className="upload-pill">{importedQuestionIds.length} questions ready</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="faculty-assessment-title">Assessment title</label>
                <input
                  id="faculty-assessment-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Cloud Computing Assessment"
                />
              </div>
              <div className="form-group">
                <label htmlFor="faculty-assessment-duration">Duration (minutes)</label>
                <input
                  id="faculty-assessment-duration"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="faculty-assessment-type">Assessment type</label>
                <select
                  id="faculty-assessment-type"
                  value={assessmentType}
                  onChange={(event) => setAssessmentType(event.target.value)}
                >
                  {ASSESSMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="faculty-assessment-description">Description / instructions</label>
              <textarea
                id="faculty-assessment-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
                {!questionSets.length ? (
                  <div className="add-set-actions">
                    <button className="btn secondary" type="button" onClick={createQuestionPaperSet}>
                      + Create Set 1
                    </button>
                  </div>
                ) : (
                  <div className="question-set-list">
                    {questionSets.map((set, index) => {
                      const options = Array.from({ length: importedQuestionIds.length }, (_, item) => item + 1)
                      const selectedCount = getRangeQuestionNumbers(set.start, set.end).length
                      return (
                        <div className="question-set-card" key={set.id}>
                          <div className="question-set-header">
                            <div className="set-badge">Set {index + 1}</div>
                            <button
                              className="btn danger small"
                              type="button"
                              onClick={() => removeQuestionPaperSet(set.id)}
                            >
                              Remove Set
                            </button>
                          </div>
                          <div className="form-grid question-range-grid">
                            <div className="form-group">
                              <label htmlFor={`faculty-set-${index}-start`}>Start Question</label>
                              <select
                                id={`faculty-set-${index}-start`}
                                value={set.start}
                                onChange={(event) => updateQuestionPaperSet(set.id, 'start', event.target.value)}
                                disabled={index > 0}
                              >
                                {options.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label htmlFor={`faculty-set-${index}-end`}>End Question</label>
                              <select
                                id={`faculty-set-${index}-end`}
                                value={set.end}
                                onChange={(event) => updateQuestionPaperSet(set.id, 'end', event.target.value)}
                              >
                                {options.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="question-range-info">
                            <div className="range-stat">
                              <span>Questions Selected:</span>
                              <strong>{selectedCount}</strong>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="add-set-actions">
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={createQuestionPaperSet}
                        disabled={Number(questionSets[questionSets.length - 1].end) >= importedQuestionIds.length}
                      >
                        + Create Set {questionSets.length + 1}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="question-set-summary">
                <div className="section-header">
                  <strong>Question set summary</strong>
                  {!questionSetValidation.valid && <span>{questionSetValidation.message}</span>}
                </div>
                {!questionSets.length ? (
                  <div className="set-summary-item empty">No question sets created yet.</div>
                ) : (
                  questionSets.map((set, index) => (
                    <div className={`set-summary-item ${questionSetValidation.valid ? 'valid' : 'invalid'}`} key={`summary-${set.id}`}>
                      Set {index + 1} — Questions {set.start}–{set.end}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="upload-actions">
              <button className="btn" type="button" onClick={createAssessment} disabled={busy}>
                {busy ? 'Creating...' : 'Create Assessment'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showImportConfirmModal && createPortal(
        <div className="modal-overlay">
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-import-confirm-title"
          >
            <div className="modal-header">
              <h3 id="faculty-import-confirm-title">Are you sure you want to import?</h3>
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
              <button className="btn" type="button" onClick={proceedWithImport} disabled={busy}>
                {busy ? 'Importing...' : 'Import Questions'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
