import { useEffect, useState } from 'react'
import { api } from '../../api'

const blank = { question: '', options: ['', '', '', ''], correctAnswer: '', subject: '', topic: '', difficulty: 'Medium', explanation: '' }

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let current = true

    api.get('/question-bank').then((response) => {
      if (!current) return
      if (response.ok) setQuestions(response.data?.data || [])
      else setError(response.data?.message || 'Unable to load questions')
    }).catch(() => {
      if (current) setError('Unable to load questions')
    })

    return () => { current = false }
  }, [])

  const startEdit = (question) => {
    setEditing(question._id)
    setForm({ question: question.question || '', options: [...(question.options || [])], correctAnswer: question.correctAnswer || '', subject: question.subject || '', topic: question.topic || '', difficulty: question.difficulty || 'Medium', explanation: question.explanation || '' })
    setError(''); setStatus('')
  }

  const save = async () => {
    if (!form.question.trim() || !form.subject.trim() || !form.topic.trim() || form.options.length !== 4 || form.options.some((option) => !option.trim()) || !form.options.includes(form.correctAnswer)) return setError('Enter the question, subject, topic, four options, and a correct answer that matches an option.')
    setBusy(true); setError('')
    const response = await api.put(`/question-bank/${editing}`, form)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to update question')
    setQuestions((current) => current.map((question) => question._id === editing ? response.data.data : question))
    setEditing(null); setStatus('Question updated successfully.')
  }

  const remove = async (question) => {
    if (!window.confirm('Delete this question from the question bank? This will not delete assessments or student results.')) return
    setBusy(true); setError('')
    const response = await api.del(`/question-bank/${question._id}`)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to delete question')
    setQuestions((current) => current.filter((item) => item._id !== question._id)); setStatus('Question deleted successfully.')
  }

  const updateOption = (index, value) => setForm((current) => {
    const previousOption = current.options[index]
    const options = current.options.map((option, optionIndex) => optionIndex === index ? value : option)
    return { ...current, options, correctAnswer: current.correctAnswer === previousOption ? value : current.correctAnswer }
  })
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  return <>
    <div className="page-title"><div><h1>Question Bank</h1><div className="subtitle">Manage imported questions</div></div></div>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    {editing && <div className="card mb"><h3>Edit Question</h3><div className="form-group"><label>Question</label><textarea value={form.question} onChange={(event) => updateField('question', event.target.value)} /></div>{form.options.map((option, index) => <div className="form-group" key={index}><label>Option {String.fromCharCode(65 + index)}</label><input value={option} onChange={(event) => updateOption(index, event.target.value)} /></div>)}<div className="form-group"><label>Correct answer</label><select value={form.correctAnswer} onChange={(event) => updateField('correctAnswer', event.target.value)}><option value="">Select answer</option>{form.options.map((option, index) => <option key={index} value={option}>{String.fromCharCode(65 + index)}. {option}</option>)}</select></div><div className="grid cols-2"><div className="form-group"><label>Subject</label><input value={form.subject} onChange={(event) => updateField('subject', event.target.value)} /></div><div className="form-group"><label>Topic</label><input value={form.topic} onChange={(event) => updateField('topic', event.target.value)} /></div></div><div className="form-group"><label>Difficulty</label><select value={form.difficulty} onChange={(event) => updateField('difficulty', event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div className="form-group"><label>Explanation</label><textarea value={form.explanation} onChange={(event) => updateField('explanation', event.target.value)} /></div><button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save Changes'}</button><button className="btn secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>}
    <div className="grid">{questions.map((question) => <div className="card" key={question._id}><div className="row between"><h3>{question.question}</h3><div><button className="btn small secondary" disabled={busy} onClick={() => startEdit(question)}>Edit</button><button className="btn small danger" disabled={busy} onClick={() => remove(question)}>Delete</button></div></div><p className="muted">{question.subject || 'No subject'} · {question.topic || 'No topic'} · {question.difficulty}</p><ol type="A">{(question.options || []).map((option, index) => <li key={index}>{option}{option === question.correctAnswer ? ' (Correct)' : ''}</li>)}</ol></div>)}</div>
    {!questions.length && <div className="card"><p className="muted">No questions in the question bank.</p></div>}
  </>
}
