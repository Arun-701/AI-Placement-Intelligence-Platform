import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import './AssessmentExperience.css'

const draftKey = (assessmentId, studentId) => `assessment-draft:${studentId || 'student'}:${assessmentId}`

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds)
  return `${String(Math.floor(safeSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function ExamIcon({ name }) {
  const paths = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    flag: <><path d="M5 21V4" /><path d="M5 4c5-4 9 4 14 0v11c-5 4-9-4-14 0" /></>,
    arrowLeft: <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
    arrowRight: <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
  }
  return <svg className="exam-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function ConfirmSubmission({ summary, submitting, onCancel, onConfirm }) {
  return (
    <div className="exam-modal-backdrop" role="presentation">
      <section className="exam-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title">
        <span className="exam-dialog-label">Final submission</span>
        <h2 id="exam-confirm-title">End this assessment?</h2>
        <p>Once submitted, you cannot change your answers.</p>
        <div className="exam-submit-summary">
          <span><strong>{summary.total}</strong> Total questions</span>
          <span><strong>{summary.answered}</strong> Answered</span>
          <span><strong>{summary.unanswered}</strong> Unanswered</span>
          <span><strong>{summary.marked}</strong> Marked for review</span>
        </div>
        <div className="exam-dialog-actions">
          <button type="button" className="exam-button exam-button-secondary" onClick={onCancel} disabled={submitting}>Continue Assessment</button>
          <button type="button" className="exam-button exam-button-primary" onClick={onConfirm} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Now'}</button>
        </div>
      </section>
    </div>
  )
}

export default function TakeAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = user?._id || user?.id || 'student'
  const [assessment, setAssessment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [markedForReview, setMarkedForReview] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [dueAt, setDueAt] = useState(null)
  const [timeLimit, setTimeLimit] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Saved on this device')
  const [startFailure, setStartFailure] = useState(false)
  const submitLockRef = useRef(false)
  const intervalRef = useRef(null)
  const autosaveQueueRef = useRef(Promise.resolve())
  const answersRef = useRef(answers)
  const marksRef = useRef(markedForReview)
  const timeLeftRef = useRef(timeLeft)
  const loadedRef = useRef(false)
  const autosaveTimerRef = useRef(null)

  useEffect(() => {
    answersRef.current = answers
    marksRef.current = markedForReview
    timeLeftRef.current = timeLeft
  }, [answers, markedForReview, timeLeft])

  useEffect(() => {
    let active = true
    const start = async () => {
      try {
        const response = await api.post(`/assessment/${id}/start`, {})
        if (!active) return
        if (!response.ok) {
          setError(response.data?.message || 'Cannot start assessment.')
          return
        }

        const data = response.data?.data || {}
        const loadedQuestions = Array.isArray(data.questions) ? data.questions : []
        const serverAnswers = Array.isArray(data.savedAnswers) ? data.savedAnswers : []
        let localDraft = {}
        let localReview = []
        try {
          const draft = JSON.parse(localStorage.getItem(draftKey(id, studentId)) || 'null')
          localDraft = draft?.answers || {}
          localReview = draft?.markedForReview || []
        } catch {
          localDraft = {}
        }
        const nextAnswers = { ...localDraft }
        const nextReview = new Set(localReview)
        serverAnswers.forEach((entry) => {
          nextAnswers[String(entry.question)] = entry.selectedAnswer || ''
          if (entry.markedForReview) nextReview.add(String(entry.question))
          else nextReview.delete(String(entry.question))
        })

        setAssessment(data.assessment)
        setQuestions(loadedQuestions)
        setAnswers(nextAnswers)
        setMarkedForReview([...nextReview])
        setTimeLimit(Number(data.timeLimit || data.assessment?.duration || 30) * 60)
        const serverDueAt = data.dueAt ? new Date(data.dueAt).getTime() : Date.now() + Number(data.timeLimit || 30) * 60 * 1000
        setDueAt(serverDueAt)
        setTimeLeft(Math.max(0, Math.ceil((serverDueAt - Date.now()) / 1000)))
        setSaveMessage(serverAnswers.length ? 'Restored saved answers' : 'Saved on this device')
        loadedRef.current = true
      } catch {
        if (!active) return
        setStartFailure(true)
        setError('Unable to connect to the assessment service. Your attempt has not been started.')
      }
    }
    start()
    return () => { active = false }
  }, [id, studentId])

  const answersList = useCallback((currentAnswers = answersRef.current, currentMarks = marksRef.current) => (
    questions.map((question) => ({
      question: question._id,
      selectedAnswer: currentAnswers[question._id] || '',
      markedForReview: currentMarks.includes(String(question._id)),
    }))
  ), [questions])

  const persistDraft = useCallback((nextAnswers = answersRef.current, nextMarks = marksRef.current) => {
    try {
      localStorage.setItem(draftKey(id, studentId), JSON.stringify({
        answers: nextAnswers,
        markedForReview: nextMarks,
        savedAt: new Date().toISOString(),
      }))
    } catch {
      setSaveMessage('Device storage unavailable · answers remain in this session')
    }
  }, [id, studentId])

  const saveAnswers = useCallback((currentAnswers, currentMarks, elapsedMinutes) => {
    const snapshot = answersList(currentAnswers, currentMarks)
    const saveRequest = async () => {
      const response = await api.post(`/assessment/${id}/auto-save`, {
        answers: snapshot,
        timeSpent: elapsedMinutes,
      })
      if (!response.ok) throw new Error(response.data?.message || 'Save failed')
      return response
    }
    autosaveQueueRef.current = autosaveQueueRef.current.then(saveRequest, saveRequest)
    return autosaveQueueRef.current
  }, [answersList, id])

  useEffect(() => {
    if (!loadedRef.current || !questions.length || submitting) return undefined
    persistDraft()
    window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      setSaveMessage('Saving…')
      try {
        await saveAnswers(
          answersRef.current,
          marksRef.current,
          Math.max(0, Math.floor((timeLimit - timeLeftRef.current) / 60))
        )
        setSaveMessage('All changes saved')
      } catch {
        setSaveMessage('Saved on this device · server sync pending')
      }
    }, 650)
    return () => window.clearTimeout(autosaveTimerRef.current)
  }, [answers, markedForReview, questions, id, timeLimit, persistDraft, saveAnswers, submitting])

  const submitAttempt = useCallback(async (automatic = false) => {
    if (submitLockRef.current || !questions.length) return
    submitLockRef.current = true
    setSubmitting(true)
    setError('')
    window.clearInterval(intervalRef.current)
    window.clearTimeout(autosaveTimerRef.current)
    const answersToSubmit = answersList()
    const timeTaken = Math.min(timeLimit, Math.max(0, Math.floor(timeLimit - timeLeftRef.current)))
    if (!automatic) {
      try {
        await saveAnswers(answersRef.current, marksRef.current, Math.floor(timeTaken / 60))
      } catch (saveError) {
        setError(`${saveError.message || 'Could not save your final answers.'} Your answers remain available on this device; submission is still being attempted.`)
      }
    }

    try {
      const response = await api.post(`/assessment/${id}/submit`, { answers: answersToSubmit, timeTaken })
      if (!response.ok) throw new Error(response.data?.message || 'Submission failed. Your attempt is still available.')
      localStorage.removeItem(draftKey(id, studentId))
      const resultId = response.data?.data?._id || response.data?.data?.resultId
      navigate(resultId ? `/student/assessments/result/${resultId}` : '/student/assessments', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Submission failed. Please retry while your attempt is still active.')
      setSubmitting(false)
      submitLockRef.current = false
    }
  }, [answersList, id, navigate, questions.length, saveAnswers, studentId, timeLimit])

  useEffect(() => {
    if (!dueAt || !assessment || submitting) return undefined
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((dueAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        window.clearInterval(interval)
        setShowSubmitConfirmation(false)
        submitAttempt(true)
      }
    }, 1000)
    intervalRef.current = interval
    return () => window.clearInterval(interval)
  }, [dueAt, assessment, submitting, submitAttempt])

  const chooseAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setSaveMessage('Unsaved changes')
  }

  const toggleReview = (questionId) => {
    setMarkedForReview((current) => current.includes(String(questionId))
      ? current.filter((idValue) => idValue !== String(questionId))
      : [...current, String(questionId)])
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = questions.filter((question) => Boolean(String(answers[question._id] || '').trim())).length
  const summary = {
    total: questions.length,
    answered: answeredCount,
    unanswered: Math.max(0, questions.length - answeredCount),
    marked: markedForReview.length,
  }
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0
  const remainingIsLow = timeLeft <= Math.max(60, Math.floor(timeLimit * .1))

  if (error && !assessment) {
    return (
      <div className="exam-shell exam-error-state">
        <div className="exam-error-card" role="alert"><h1>Unable to start assessment</h1><p>{error}</p><Link className="exam-button exam-button-secondary" to="/student/assessments">{startFailure ? 'Back to Assessments' : 'Return to Assessments'}</Link></div>
      </div>
    )
  }
  if (!assessment) return <div className="exam-shell"><div className="exam-loading">Preparing your assessment…</div></div>
  if (!currentQuestion) return <div className="exam-shell"><div className="exam-error-card" role="alert"><h1>No questions available</h1><Link to="/student/assessments">Return to assessments</Link></div></div>

  return (
    <div className="exam-shell">
      <header className="exam-topbar">
        <div className="exam-brand"><span className="exam-brand-mark">AI</span><span>AI Placement Intelligence Platform</span></div>
        <div className="exam-top-title"><strong>{assessment.title}</strong><small>Assessment in progress</small></div>
        <div className="exam-top-actions">
          <div className={`exam-timer${remainingIsLow ? ' is-warning' : ''}`} aria-live="polite"><ExamIcon name="clock" /><span>{formatTime(timeLeft)}</span></div>
          <span className="exam-student-name">{user?.fullName || user?.name || 'Student'}</span>
          <button type="button" className="exam-end-button" onClick={() => setShowSubmitConfirmation(true)} disabled={submitting}>End Assessment</button>
        </div>
      </header>

      <div className="exam-overview">
        <div><span>Questions</span><strong>{questions.length}</strong></div>
        <div><span>Total marks</span><strong>{assessment.totalMarks ?? '—'}</strong></div>
        <div><span>Duration</span><strong>{assessment.duration || Math.ceil(timeLimit / 60)} min</strong></div>
        <div><span>Candidate</span><strong>{user?.fullName || user?.name || 'Student'}</strong></div>
      </div>

      {error && <div className="exam-alert" role="alert">{error}</div>}

      <section className="exam-workspace">
        <div className="exam-main-column">
          <section className="exam-progress-card">
            <div className="exam-progress-heading"><strong>Assessment progress</strong><span>Question {currentIndex + 1} of {questions.length} · {progress}% answered</span></div>
            <div className="exam-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Assessment answered progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="exam-save-status" aria-live="polite">{saveMessage}</div>
          </section>

          <article className="exam-question-card">
            <div className="exam-question-meta"><span>Question {currentIndex + 1}</span><span>{currentQuestion.marks ?? 1} mark{Number(currentQuestion.marks) === 1 ? '' : 's'}</span></div>
            {currentQuestion.topic && <div className="exam-question-topic">{currentQuestion.topic}</div>}
            <h1>{currentQuestion.question}</h1>
            {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
              <fieldset className="exam-options">
                <legend className="exam-sr-only">Choose an answer</legend>
                {currentQuestion.options.map((option, optionIndex) => {
                  const checked = answers[currentQuestion._id] === option
                  return (
                    <label className={`exam-option${checked ? ' is-selected' : ''}`} key={`${currentQuestion._id}-${optionIndex}`}>
                      <input type="radio" name={`question-${currentQuestion._id}`} value={option} checked={checked} onChange={() => chooseAnswer(currentQuestion._id, option)} disabled={submitting} />
                      <span className="exam-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                    </label>
                  )
                })}
              </fieldset>
            ) : (
              <label className="exam-response-field"><span>Your response</span><textarea rows="7" value={answers[currentQuestion._id] || ''} onChange={(event) => chooseAnswer(currentQuestion._id, event.target.value)} disabled={submitting} placeholder="Enter your response" /></label>
            )}
          </article>

          <div className="exam-bottom-controls">
            <button type="button" className="exam-button exam-button-secondary" disabled={currentIndex === 0 || submitting} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}><ExamIcon name="arrowLeft" />Previous</button>
            <button type="button" className={`exam-button exam-review-button${markedForReview.includes(String(currentQuestion._id)) ? ' is-marked' : ''}`} onClick={() => toggleReview(currentQuestion._id)} disabled={submitting}><ExamIcon name="flag" />{markedForReview.includes(String(currentQuestion._id)) ? 'Remove Review Mark' : 'Mark for Review'}</button>
            {currentIndex < questions.length - 1
              ? <button type="button" className="exam-button exam-button-primary" disabled={submitting} onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}>Next<ExamIcon name="arrowRight" /></button>
              : <button type="button" className="exam-button exam-button-primary" disabled={submitting} onClick={() => setShowSubmitConfirmation(true)}>Submit Assessment</button>}
          </div>
        </div>

        <aside className="exam-side-panel">
          <section className="exam-panel-card">
            <div className="exam-panel-heading"><h2>Question navigator</h2><span>{currentIndex + 1}/{questions.length}</span></div>
            <div className="exam-status-legend">
              <span><i className="legend-current" />Current</span><span><i className="legend-answered" />Answered</span><span><i className="legend-review" />For review</span><span><i className="legend-unanswered" />Not answered</span>
            </div>
            <div className="exam-question-grid">
              {questions.map((question, index) => {
                const answered = Boolean(String(answers[question._id] || '').trim())
                const marked = markedForReview.includes(String(question._id))
                const state = index === currentIndex ? 'current' : marked ? 'review' : answered ? 'answered' : 'unanswered'
                return <button type="button" key={question._id} className={`exam-question-number is-${state}`} onClick={() => setCurrentIndex(index)} aria-label={`Go to question ${index + 1}, ${state}`}>{index + 1}</button>
              })}
            </div>
          </section>
          <section className="exam-panel-card exam-summary-card">
            <h2>Attempt summary</h2>
            <dl><div><dt>Total questions</dt><dd>{summary.total}</dd></div><div><dt>Answered</dt><dd>{summary.answered}</dd></div><div><dt>Not answered</dt><dd>{summary.unanswered}</dd></div><div><dt>For review</dt><dd>{summary.marked}</dd></div><div><dt>Total marks</dt><dd>{assessment.totalMarks ?? '—'}</dd></div></dl>
            <button type="button" className="exam-button exam-button-primary exam-summary-submit" onClick={() => setShowSubmitConfirmation(true)} disabled={submitting}>End Assessment</button>
          </section>
          <Link className="exam-exit-link" to="/student/assessments">Exit to assessments</Link>
        </aside>
      </section>

      {showSubmitConfirmation && <ConfirmSubmission summary={summary} submitting={submitting} onCancel={() => setShowSubmitConfirmation(false)} onConfirm={() => submitAttempt(false)} />}
    </div>
  )
}
