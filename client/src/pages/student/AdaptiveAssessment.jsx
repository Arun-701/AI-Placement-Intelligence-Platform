import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import './AssessmentExperience.css'

const adaptiveDraftKey = (id, studentId) => `adaptive-assessment-draft:${studentId || 'student'}:${id}`

export default function AdaptiveAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = user?._id || user?.id || 'student'
  const [assessment, setAssessment] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const submitLockRef = useRef(false)

  useEffect(() => {
    let active = true
    api.get(`/adaptive-assessment/${id}`).then((response) => {
      if (!active) return
      if (response.ok) {
        const loadedAssessment = response.data.assessment
        setAssessment(loadedAssessment)
        try {
          setAnswers(JSON.parse(localStorage.getItem(adaptiveDraftKey(id, studentId)) || '{}'))
        } catch {
          setAnswers({})
        }
      } else if (response.status === 409) {
        navigate(`/student/adaptive-assessment/${id}/result`, { replace: true })
      } else {
        setError(response.data?.message || 'Unable to load adaptive assessment.')
      }
    }).catch(() => {
      if (active) setError('Unable to load adaptive assessment.')
    })
    return () => { active = false }
  }, [id, navigate, studentId])

  const questionList = assessment?.questions || []
  const question = questionList[index]
  const answeredCount = questionList.filter((item) => Boolean(String(answers[item.questionId] || '').trim())).length
  const progress = questionList.length ? Math.round((answeredCount / questionList.length) * 100) : 0

  const setAnswer = (questionId, answer) => {
    const next = { ...answers, [questionId]: answer }
    setAnswers(next)
    try {
      localStorage.setItem(adaptiveDraftKey(id, studentId), JSON.stringify(next))
    } catch {
      setError('Your browser could not save a local answer backup. Keep this page open until you submit.')
    }
  }

  const submit = useCallback(async () => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await api.post(`/adaptive-assessment/${id}/submit`, { answers })
      if (!response.ok) throw new Error(response.data?.message || 'Unable to submit assessment.')
      localStorage.removeItem(adaptiveDraftKey(id, studentId))
      navigate(`/student/adaptive-assessment/${id}/result`, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Network error while submitting assessment.')
      setSubmitting(false)
      submitLockRef.current = false
    }
  }, [answers, id, navigate, studentId])

  if (error && !assessment) return <div className="exam-shell exam-error-state"><div className="exam-error-card" role="alert"><h1>Adaptive assessment unavailable</h1><p>{error}</p><button className="exam-button exam-button-secondary" onClick={() => navigate('/student/roadmap')}>Back to Roadmap</button></div></div>
  if (!assessment) return <div className="exam-shell"><div className="exam-loading">Loading adaptive assessment…</div></div>
  if (!question) return <div className="exam-shell"><div className="exam-error-card" role="alert">This assessment has no questions.</div></div>

  return (
    <div className="exam-shell adaptive-exam">
      <header className="exam-topbar">
        <div className="exam-brand"><span className="exam-brand-mark">AI</span><span>AI Placement Intelligence Platform</span></div>
        <div className="exam-top-title"><strong>{assessment.title}</strong><small>{assessment.domain}{assessment.milestone ? ` · ${assessment.milestone}` : ''}</small></div>
        <div className="exam-top-actions"><span className="exam-student-name">{user?.fullName || user?.name || 'Student'}</span><button type="button" className="exam-end-button" onClick={() => setConfirmSubmit(true)} disabled={submitting}>End Assessment</button></div>
      </header>
      <div className="exam-overview adaptive-exam-overview">
        <div><span>Questions</span><strong>{questionList.length}</strong></div>
        <div><span>Current progress</span><strong>{index + 1} of {questionList.length}</strong></div>
        <div><span>Answered</span><strong>{answeredCount}</strong></div>
        <div><span>Domain</span><strong>{assessment.domain || '—'}</strong></div>
      </div>
      {error && <div className="exam-alert" role="alert">{error}</div>}
      <section className="exam-workspace adaptive-exam-workspace">
        <div className="exam-main-column">
          <section className="exam-progress-card">
            <div className="exam-progress-heading"><strong>Assessment progress</strong><span>Question {index + 1} of {questionList.length} · {progress}% answered</span></div>
            <div className="exam-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Adaptive assessment answered progress"><span style={{ width: `${progress}%` }} /></div>
          </section>
          <article className="exam-question-card">
            <div className="exam-question-meta"><span>Question {index + 1}</span><span>{question.difficulty} · {question.topic}</span></div>
            <h1>{question.question}</h1>
            {Array.isArray(question.options) && question.options.length ? (
              <fieldset className="exam-options">
                <legend className="exam-sr-only">Choose an answer</legend>
                {question.options.map((option, optionIndex) => {
                  const selected = answers[question.questionId] === option
                  return <label key={`${question.questionId}-${optionIndex}`} className={`exam-option${selected ? ' is-selected' : ''}`}><input type="radio" name={`adaptive-${question.questionId}`} checked={selected} onChange={() => setAnswer(question.questionId, option)} disabled={submitting} /><span className="exam-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></label>
                })}
              </fieldset>
            ) : (
              <label className="exam-response-field"><span>Your response</span><textarea rows="7" value={answers[question.questionId] || ''} onChange={(event) => setAnswer(question.questionId, event.target.value)} disabled={submitting} placeholder="Enter your response" /></label>
            )}
          </article>
          <div className="exam-bottom-controls">
            <button type="button" className="exam-button exam-button-secondary" disabled={index === 0 || submitting} onClick={() => setIndex((current) => Math.max(0, current - 1))}>Previous</button>
            {index < questionList.length - 1
              ? <button type="button" className="exam-button exam-button-primary" disabled={submitting} onClick={() => setIndex((current) => Math.min(questionList.length - 1, current + 1))}>Next</button>
              : <button type="button" className="exam-button exam-button-primary" onClick={() => setConfirmSubmit(true)} disabled={submitting}>Submit Assessment</button>}
          </div>
        </div>
        <aside className="exam-side-panel">
          <section className="exam-panel-card">
            <div className="exam-panel-heading"><h2>Question navigator</h2><span>{index + 1}/{questionList.length}</span></div>
            <div className="exam-question-grid">{questionList.map((item, itemIndex) => {
              const status = itemIndex === index ? 'current' : answers[item.questionId] ? 'answered' : 'unanswered'
              return <button type="button" key={item.questionId} className={`exam-question-number is-${status}`} onClick={() => setIndex(itemIndex)} aria-label={`Go to question ${itemIndex + 1}, ${status}`}>{itemIndex + 1}</button>
            })}</div>
          </section>
          <section className="exam-panel-card exam-summary-card"><h2>Attempt summary</h2><dl><div><dt>Total questions</dt><dd>{questionList.length}</dd></div><div><dt>Answered</dt><dd>{answeredCount}</dd></div><div><dt>Not answered</dt><dd>{questionList.length - answeredCount}</dd></div></dl><button type="button" className="exam-button exam-button-primary exam-summary-submit" onClick={() => setConfirmSubmit(true)} disabled={submitting}>End Assessment</button></section>
          <button type="button" className="exam-exit-link adaptive-exit-button" onClick={() => navigate('/student/roadmap')}>Exit to Roadmap</button>
        </aside>
      </section>
      {confirmSubmit && <div className="exam-modal-backdrop" role="presentation"><section className="exam-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="adaptive-submit-title"><span className="exam-dialog-label">Final submission</span><h2 id="adaptive-submit-title">Submit this assessment?</h2><p>You have answered {answeredCount} of {questionList.length} questions. You cannot change answers after submitting.</p><div className="exam-dialog-actions"><button type="button" className="exam-button exam-button-secondary" onClick={() => setConfirmSubmit(false)} disabled={submitting}>Continue Assessment</button><button type="button" className="exam-button exam-button-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Now'}</button></div></section></div>}
    </div>
  )
}
