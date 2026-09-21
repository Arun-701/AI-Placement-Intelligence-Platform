import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

export default function AdaptiveAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/adaptive-assessment/${id}`).then((response) => {
      if (response.ok) setAssessment(response.data.assessment)
      else if (response.status === 409) navigate(`/student/adaptive-assessment/${id}/result`, { replace: true })
      else setError(response.data?.message || 'Unable to load adaptive assessment.')
    }).catch(() => setError('Unable to load adaptive assessment.'))
  }, [id, navigate])

  const submit = async () => {
    setSubmitting(true); setError('')
    try {
      const response = await api.post(`/adaptive-assessment/${id}/submit`, { answers })
      if (!response.ok) return setError(response.data?.message || 'Unable to submit assessment.')
      navigate(`/student/adaptive-assessment/${id}/result`, { replace: true })
    } catch { setError('Network error while submitting assessment.') } finally { setSubmitting(false) }
  }

  if (error) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading adaptive assessment...</div>
  const question = assessment.questions[index]
  if (!question) return <div className="alert error">This assessment has no questions.</div>
  const selected = answers[question.questionId] || ''

  return <>
    <div className="page-title"><div><h1>{assessment.title}</h1><div className="subtitle">{assessment.domain}{assessment.milestone ? ` · ${assessment.milestone}` : ''}</div></div></div>
    <div className="card mb"><div className="row between"><strong>Question {index + 1} of {assessment.questions.length}</strong><span className="badge gray">{question.difficulty} · {question.topic}</span></div><div className="progress-bar mt"><div style={{ width: `${((index + 1) / assessment.questions.length) * 100}%` }} /></div></div>
    <div className="card"><h3>{question.question}</h3><div style={{ marginTop: 18 }}>{question.options.map((option) => <label key={option} className="card" style={{ display: 'block', padding: 12, cursor: 'pointer', marginBottom: 10, border: selected === option ? '2px solid var(--primary)' : undefined }}><input type="radio" name={question.questionId} checked={selected === option} onChange={() => setAnswers((current) => ({ ...current, [question.questionId]: option }))} /> <span style={{ marginLeft: 8 }}>{option}</span></label>)}</div><div className="row between mt"><button className="btn secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>{index < assessment.questions.length - 1 ? <button className="btn" onClick={() => setIndex(index + 1)}>Next</button> : <button className="btn" disabled={submitting} onClick={submit}>{submitting ? 'Submitting...' : 'Submit Assessment'}</button>}</div></div>
  </>
}
