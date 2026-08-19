import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'

export default function TakeAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    api.post(`/assessment/${id}/start`, {}).then((r) => {
      if (r.ok) {
        setAssessment(r.data.data.assessment)
        setQuestions(r.data.data.questions || [])
        // prefer server-provided dueAt for persistence
        const dueAt = r.data.data.dueAt || null
        if (dueAt) {
          const remaining = Math.max(0, Math.floor((new Date(dueAt).getTime() - Date.now()) / 1000))
          setTimeLeft(remaining)
        } else {
          setTimeLeft((r.data.data.timeLimit || 60) * 60)
        }
      } else {
        setError(r.data?.message || 'Cannot start assessment')
      }
    })
    return () => clearInterval(timerRef.current)
  }, [id])

  const submitRef = useRef(null)

  useEffect(() => {
    submitRef.current = async () => {
      if (submitting) return
      setSubmitting(true)
      const answerList = questions.map((q) => ({
        question: q._id,
        selectedAnswer: answers[q._id] || '',
      }))
      const r = await api.post(`/assessment/${id}/submit`, { answers: answerList, timeTaken: 0 })
      if (r.ok) {
        const resultId = r.data.data?._id || r.data.data?.resultId
        if (resultId) navigate(`/student/assessments/result/${resultId}`)
        else navigate('/student/assessments')
      } else {
        setError(r.data?.message || 'Submission failed')
        setSubmitting(false)
      }
    }
  }, [submitting, questions, answers, id, navigate])

  useEffect(() => {
    if (timeLeft <= 0) return
    timerRef.current = setInterval(() => setTimeLeft((t) => {
      if (t <= 1) {
        clearInterval(timerRef.current)
        submitRef.current()
        return 0
      }
      return t - 1
    }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === 0 ? null : timeLeft])

  const handleSubmit = () => {
    const confirmed = window.confirm('Are you sure you want to submit the assessment?\nYou will not be able to change your answers after submission.')
    if (confirmed) submitRef.current()
  }

  if (error) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading assessment...</div>

  const mm = Math.floor(timeLeft / 60)
  const ss = timeLeft % 60

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{assessment.title}</h1>
          <div className="subtitle">{questions.length} questions · {assessment.totalMarks ?? '—'} marks</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="badge blue">Time left: {mm}:{String(ss).padStart(2, '0')}</div>
        </div>
      </div>
      {questions.map((q, idx) => (
        <div className="card mb" key={q._id}>
          <h3>{idx + 1}. {q.question}</h3>
          <div style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--muted)' }}>
            {q.topic} · {q.marks} mark{q.marks > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(q.options || []).map((opt, oi) => (
              <label key={oi} className="card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`q-${q._id}`}
                  checked={answers[q._id] === opt}
                  onChange={() => setAnswers({ ...answers, [q._id]: opt })}
                />
                <span>{String.fromCharCode(65 + oi)}. {opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </>
  )
}
