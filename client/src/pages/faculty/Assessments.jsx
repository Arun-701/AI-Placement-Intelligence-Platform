import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentSectionNav from '../admin/AssessmentSectionNav'

const validateQuestion = (q) => [
  ...(!q.question.trim() ? ['Question text is required.'] : []),
  ...(q.options.length < 2 ? ['At least two options are required.'] : []),
  ...(q.options.some((option) => !option.trim()) ? ['Option text cannot be empty.'] : []),
  ...(!q.correctAnswer || !q.options.includes(q.correctAnswer) ? ['Select a correct answer.'] : []),
]
const normalized = (q) => q.question.trim().replace(/\s+/g, ' ').toLowerCase()

export default function FacultyAssessments({ uploadOnly = false }) {
  const navigate = useNavigate()
  const [file, setFile] = useState(null), [questions, setQuestions] = useState([]), [students, setStudents] = useState([]), [assessments, setAssessments] = useState([]), [title, setTitle] = useState('')
  const [error, setError] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false), [busyMessage, setBusyMessage] = useState(''), [fieldErrors, setFieldErrors] = useState({})
  const [tab, setTab] = useState('ALL'), [assigning, setAssigning] = useState(null), [selectedIds, setSelectedIds] = useState([])

  const load = async () => {
    const [studentResponse, assessmentResponse] = await Promise.all([api.get(`/faculty/assessments/students?refresh=${Date.now()}`), api.get(`/faculty/assessments?refresh=${Date.now()}`)])
    if (studentResponse.ok) setStudents(studentResponse.data.data || [])
    if (assessmentResponse.ok) setAssessments(assessmentResponse.data.data || [])
  }
  useEffect(() => { load() }, [])

  const updateQuestion = (index, update) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update, confirmed: false } : item))
  const extract = async () => {
    setError(''); setInfo(''); if (!file) return setError('Choose a PDF or DOCX question paper first.')
    setBusy(true); setBusyMessage('Reading question paper...')
    const extractionTimer = window.setTimeout(() => setBusyMessage('Extracting questions...'), 700)
    const ocrTimer = window.setTimeout(() => setBusyMessage('Scanned PDF detected. Reading pages locally...'), 1800)
    const formData = new FormData(); formData.append('material', file)
    const response = await api.upload('/faculty/assessments/extract', formData)
    window.clearTimeout(extractionTimer); window.clearTimeout(ocrTimer); setBusy(false); setBusyMessage('')
    if (!response.ok) return setError(response.data?.message || 'Question extraction failed.')
    const extracted = response.data?.data?.questions || []
    if (!extracted.length) return setError('No questions were included in the response.')
    setQuestions(extracted); setInfo(`${extracted.length} question(s) extracted locally. Review before importing.`)
  }
  const confirmQuestion = (index) => {
    const q = questions[index]
    const duplicate = normalized(q) && questions.some((item, itemIndex) => itemIndex !== index && normalized(item) === normalized(q))
    const errors = [...validateQuestion(q), ...(duplicate ? ['Duplicate question text detected.'] : [])]
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
    setInfo('Assessment imported successfully. Assign students from the assessment list.'); setQuestions([]); setFile(null); setTitle(''); await load()
  }
  const openAssign = (assessment) => { setAssigning(assessment); setSelectedIds([]) }
  const alreadyAssigned = new Set((assigning?.assignedStudents || []).map(String))
  const availableStudents = students.filter((student) => !alreadyAssigned.has(String(student._id)))
  const allSelected = availableStudents.length > 0 && selectedIds.length === availableStudents.length
  const assign = async () => {
    if (!selectedIds.length) return setError('Select at least one student.')
    setBusy(true); setError('')
    const response = await api.post(`/faculty/assessments/${assigning._id}/assign`, { studentIds: selectedIds })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Assignment failed.')
    setInfo('Assessment assigned successfully.'); setAssigning(null); setSelectedIds([]); await load()
  }
  const deleteAssessment = async (assessment) => {
    if (!window.confirm(`Delete the assessment "${assessment.title}"? Questions, students, assignments, and results will not be deleted.`)) return
    setBusy(true); setError('')
    const response = await api.del(`/faculty/assessments/${assessment._id}`)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to delete assessment')
    setInfo('Assessment deleted successfully.'); await load()
  }
  const visibleAssessments = assessments.filter((assessment) => tab === 'ALL' || (tab === 'ASSIGNED' ? assessment.assignedStudents?.length : !assessment.assignedStudents?.length))

  return <>
    <div className="page-title"><div><h1>Assessments</h1><div className="subtitle">Upload, verify, import, and assign assessments to your students.</div></div></div>
    {error && <div className="alert error">{error}</div>}{info && <div className="alert success">{info}</div>}
    <AssessmentSectionNav basePath="/faculty/assessments" />
    {uploadOnly && <><div className="card assessment-step"><h3>1. Upload and verify question paper</h3><div className="upload-row"><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button className="btn" disabled={busy} onClick={extract}>{busy ? busyMessage : 'Extract Questions'}</button></div></div>{questions.length > 0 && <div className="assessment-step"><div className="row between"><h3>2. Review and import</h3><button className="btn secondary" onClick={confirmAll}>Confirm All Questions</button></div>{questions.map((question, index) => <div className="question-review card" key={`${question.sourceNumber || 'question'}-${index}`}><div className="row between"><h4>Question {index + 1}</h4><span className="badge gray">{question.confirmed ? 'Confirmed' : 'Needs review'}</span></div><div className="form-group"><label>Question text</label><textarea value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></div>{question.options.map((option, optionIndex) => <div className="option-row" key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}.</span><input value={option} onChange={(event) => updateQuestion(index, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item), correctAnswer: question.correctAnswer === option ? event.target.value : question.correctAnswer })} /></div>)}<div className="form-group"><label>Correct answer</label><select value={question.correctAnswer || ''} onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}><option value="">Select answer</option>{question.options.map((option, optionIndex) => <option key={optionIndex} value={option}>{String.fromCharCode(65 + optionIndex)}. {option}</option>)}</select></div>{fieldErrors[index]?.map((message) => <div className="validation-message" key={message}>{message}</div>)}<button className="btn small" onClick={() => confirmQuestion(index)}>Confirm Question</button></div>)}<div className="card"><div className="form-group"><label>Assessment title</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><button className="btn" disabled={busy} onClick={createAssessment}>{busy ? 'Importing...' : 'Import and Create Assessment'}</button></div></div>}</>}
    {!uploadOnly && <><div className="role-tabs"><button className={tab === 'ASSIGNED' ? 'active' : ''} onClick={() => setTab('ASSIGNED')}>Assigned</button><button className={tab === 'NOT_ASSIGNED' ? 'active' : ''} onClick={() => setTab('NOT_ASSIGNED')}>Not Assigned</button><button className={tab === 'ALL' ? 'active' : ''} onClick={() => setTab('ALL')}>View All</button></div><div className="grid">{visibleAssessments.map((assessment) => <div className="card" key={assessment._id}><div className="row between"><div><h3>{assessment.title}</h3><p className="muted">{assessment.department || 'No department'} · {assessment.totalQuestions || 0} questions · {assessment.duration} minutes</p></div><span className={`badge ${assessment.statusLabel === 'EXPIRED' ? 'red' : assessment.statusLabel === 'ASSIGNED' ? 'green' : 'gray'}`}>{(assessment.statusLabel || 'NOT_ASSIGNED').replace('_', ' ')}</span></div><div className="stat-inline"><span>Deadline</span><strong>{assessment.endDate ? new Date(assessment.endDate).toLocaleString() : 'Not set'}</strong></div><div className="stat-inline"><span>Assigned</span><strong>{assessment.assignedCount || 0} · Attended {assessment.attendedCount || 0} · Not attended {assessment.notAttendedCount || 0}</strong></div>{assessment.averagePercentage !== null && assessment.averagePercentage !== undefined && <div className="stat-inline"><span>Average</span><strong>{assessment.averagePercentage}%</strong></div>}<div className="row mt"><button className="btn small secondary" onClick={() => navigate(`/faculty/assessments/results/${assessment._id}`)}>View Result</button>{assessment.statusLabel === 'NOT_ASSIGNED' && <button className="btn small" onClick={() => openAssign(assessment)}>Assign</button>}<button className="btn small secondary" onClick={() => navigate(`/faculty/assessments/edit/${assessment._id}`)}>Edit</button><button className="btn small danger" disabled={busy} onClick={() => deleteAssessment(assessment)}>Delete</button></div></div>)}</div>{assigning && <div className="card mt"><div className="row between"><h3>Assign {assigning.title}</h3><button className="btn small secondary" onClick={() => setAssigning(null)}>Cancel</button></div><button className="btn small secondary" onClick={() => setSelectedIds(allSelected ? [] : availableStudents.map((student) => student._id))}>{allSelected ? 'Clear all' : 'Select all'}</button><p className="muted">Available students: {availableStudents.length}</p><div className="student-list">{availableStudents.map((student) => <label className="student-choice" key={student._id}><input type="checkbox" checked={selectedIds.includes(student._id)} onChange={() => setSelectedIds((current) => current.includes(student._id) ? current.filter((id) => id !== student._id) : [...current, student._id])} />{student.name} <span>{student.email}</span></label>)}</div><button className="btn mt" disabled={busy} onClick={assign}>{busy ? 'Assigning...' : 'Assign Selected Students'}</button></div>}</>}
  </>
}
