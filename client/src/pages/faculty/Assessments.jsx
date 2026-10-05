import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentSectionNav from '../admin/AssessmentSectionNav'
import FacultyAssessmentUploadReview from './AssessmentUploadReview'

const validateQuestion = (question) => [
  ...(!question.question.trim() ? ['Question text is required.'] : []),
  ...(question.options.length < 2 ? ['At least two options are required.'] : []),
  ...(question.options.some((option) => !option.trim()) ? ['Option text cannot be empty.'] : []),
  ...(!question.correctAnswer || !question.options.includes(question.correctAnswer) ? ['Select a correct answer.'] : []),
]
const normalized = (question) => question.question.trim().replace(/\s+/g, ' ').toLowerCase()
const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function FacultyAssessments({ uploadOnly = false }) {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [assessments, setAssessments] = useState([])
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState('VIEW_ALL')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyMessage, setBusyMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const load = async () => {
    const response = await api.get(`/faculty/assessments?refresh=${Date.now()}`)
    if (!response.ok) return setError(response.data?.message || 'Unable to load assessments')
    setAssessments(response.data?.data || [])
  }

  useEffect(() => {
    let cancelled = false
    api.get(`/faculty/assessments?refresh=${Date.now()}`).then((response) => {
      if (cancelled) return
      if (!response.ok) return setError(response.data?.message || 'Unable to load assessments')
      setAssessments(response.data?.data || [])
    }).catch(() => { if (!cancelled) setError('Unable to load assessments') })
    return () => { cancelled = true }
  }, [])

  const updateQuestion = (index, update) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update, confirmed: false } : item))

  const extract = async () => {
    setError(''); setStatus('')
    if (!file) return setError('Choose a PDF or DOCX question paper first.')
    setBusy(true); setBusyMessage('Reading question paper...')
    const extractionTimer = window.setTimeout(() => setBusyMessage('Extracting questions...'), 700)
    const ocrTimer = window.setTimeout(() => setBusyMessage('Scanned PDF detected. Reading pages locally...'), 1800)
    const formData = new FormData(); formData.append('material', file)
    const response = await api.upload('/faculty/assessments/extract', formData)
    window.clearTimeout(extractionTimer); window.clearTimeout(ocrTimer); setBusy(false); setBusyMessage('')
    if (!response.ok) return setError(response.data?.message || 'Question extraction failed.')
    const extracted = response.data?.data?.questions || []
    if (!extracted.length) return setError('No questions were included in the response.')
    setQuestions(extracted); setStatus(`${extracted.length} question(s) extracted locally. Review before importing.`)
  }

  const confirmQuestion = (index) => {
    const question = questions[index]
    const duplicate = normalized(question) && questions.some((item, itemIndex) => itemIndex !== index && normalized(item) === normalized(question))
    const errors = [...validateQuestion(question), ...(duplicate ? ['Duplicate question text detected.'] : [])]
    setFieldErrors((current) => ({ ...current, [index]: errors }))
    if (!errors.length) setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, confirmed: true } : item))
  }

  const confirmAll = () => questions.forEach((_, index) => confirmQuestion(index))

  const createAssessment = async () => {
    const confirmed = questions.filter((question) => question.confirmed)
    if (!confirmed.length) return setError('Confirm at least one valid question before importing.')
    if (!title.trim()) return setError('Assessment title is required.')
    setBusy(true); setError('')
    const response = await api.post('/faculty/assessments', { title: title.trim(), questions: confirmed })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Assessment creation failed.')
    setStatus('Assessment imported successfully. Assign students from the assessment list.')
    setQuestions([]); setFile(null); setTitle(''); await load()
  }

  const reschedule = async (assessment) => {
    const deadline = window.prompt('Enter a future deadline as YYYY-MM-DDTHH:mm', assessment.endDate ? new Date(assessment.endDate).toISOString().slice(0, 16) : '')
    if (!deadline) return
    setBusy(true); setError('')
    const response = await api.patch(`/faculty/assessments/${assessment._id}/deadline`, { deadline })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Deadline update failed')
    setStatus(response.data.message); await load()
  }

  const deleteAssessment = async (assessment) => {
    if (!window.confirm(`Delete the assessment "${assessment.title}"? Its questions, student accounts, assignments, and results will not be deleted.`)) return
    setBusy(true); setError('')
    const response = await api.del(`/faculty/assessments/${assessment._id}`)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to delete assessment')
    setStatus('Assessment deleted successfully.'); await load()
  }

  const visibleAssessments = assessments.filter((assessment) => tab === 'VIEW_ALL' || (tab === 'ASSIGNED' ? assessment.statusLabel !== 'NOT_ASSIGNED' : assessment.statusLabel === 'NOT_ASSIGNED'))

  if (uploadOnly) return <><div className="page-title"><div><h1>Assessments</h1><div className="subtitle">Upload, review, and create an assessment.</div></div></div><AssessmentSectionNav basePath="/faculty/assessments" /><FacultyAssessmentUploadReview onCreated={load} /></>

  return <>
    <div className="page-title"><div><h1>Assessments</h1><div className="subtitle">Create, assign, and track assessment participation.</div></div></div>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    <AssessmentSectionNav basePath="/faculty/assessments" />
    {uploadOnly && <><div className="card assessment-step"><h3>1. Upload and verify question paper</h3><div className="upload-row"><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button className="btn" disabled={busy} onClick={extract}>{busy ? busyMessage : 'Extract Questions'}</button></div></div>{questions.length > 0 && <div className="assessment-step"><div className="row between"><h3>2. Review and import</h3><button className="btn secondary" onClick={confirmAll}>Confirm All Questions</button></div>{questions.map((question, index) => <div className="question-review card" key={`${question.sourceNumber || 'question'}-${index}`}><div className="row between"><h4>Question {index + 1}</h4><span className="badge gray">{question.confirmed ? 'Confirmed' : 'Needs review'}</span></div><div className="form-group"><label>Question text</label><textarea value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></div>{question.options.map((option, optionIndex) => <div className="option-row" key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}.</span><input value={option} onChange={(event) => updateQuestion(index, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item), correctAnswer: question.correctAnswer === option ? event.target.value : question.correctAnswer })} /></div>)}<div className="form-group"><label>Correct answer</label><select value={question.correctAnswer || ''} onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}><option value="">Select answer</option>{question.options.map((option, optionIndex) => <option key={optionIndex} value={option}>{String.fromCharCode(65 + optionIndex)}. {option}</option>)}</select></div>{fieldErrors[index]?.map((message) => <div className="validation-message" key={message}>{message}</div>)}<button className="btn small" onClick={() => confirmQuestion(index)}>Confirm Question</button></div>)}<div className="card"><div className="form-group"><label>Assessment title</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><button className="btn" disabled={busy} onClick={createAssessment}>{busy ? 'Importing...' : 'Import and Create Assessment'}</button></div></div>}</>}
    {!uploadOnly && <><div className="role-tabs"><button className={tab === 'ASSIGNED' ? 'active' : ''} onClick={() => setTab('ASSIGNED')}>Assigned</button><button className={tab === 'NOT_ASSIGNED' ? 'active' : ''} onClick={() => setTab('NOT_ASSIGNED')}>Not Assigned</button><button className={tab === 'VIEW_ALL' ? 'active' : ''} onClick={() => setTab('VIEW_ALL')}>View All</button></div>{visibleAssessments.length === 0 && <div className="card"><p className="muted">No assessments in this view.</p></div>}<div className="grid">{visibleAssessments.map((item) => { const statusLabel = item.statusLabel || (item.assignedStudents?.length ? 'ASSIGNED' : 'NOT_ASSIGNED'); return <div className="card" key={item._id}><div className="row between"><div><h3>{item.title}</h3><div className="muted">{item.department || 'No department'} - {item.totalQuestions} questions - {item.duration} minutes</div></div><span className={`badge ${statusLabel === 'EXPIRED' ? 'red' : statusLabel === 'ASSIGNED' ? 'green' : 'gray'}`}>{statusLabel.replace('_', ' ')}</span></div><div className="stat-inline"><span>Deadline</span><strong>{formatDeadline(item.endDate)}</strong></div><div className="stat-inline"><span>Assigned</span><strong>{item.assignedCount} - Attended {item.attendedCount} - Not attended {item.notAttendedCount}</strong></div>{item.averagePercentage !== null && <div className="stat-inline"><span>Average</span><strong>{item.averagePercentage}%</strong></div>}<div className="row mt"><button className="btn small secondary" onClick={() => navigate(`/faculty/assessments/results/${item._id}`)}>View Result</button>{statusLabel === 'NOT_ASSIGNED' && <button className="btn small" onClick={() => navigate(`/faculty/assessments/assign/${item._id}`)}>Assign</button>}{statusLabel !== 'NOT_ASSIGNED' && <button className="btn small secondary" onClick={() => reschedule(item)} disabled={busy}>Reschedule</button>}<button className="btn small secondary" onClick={() => navigate(`/faculty/assessments/edit/${item._id}`)}>Edit</button><button className="btn small danger" disabled={busy} onClick={() => deleteAssessment(item)}>Delete</button></div></div> })}</div></>}
  </>
}
