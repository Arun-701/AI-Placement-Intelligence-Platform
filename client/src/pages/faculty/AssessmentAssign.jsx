import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

const toLocalInput = (date) => date ? new Date(date).toISOString().slice(0, 16) : ''

export default function FacultyAssessmentAssign() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/faculty/assessments/${assessmentId}/details`),
      api.get('/faculty/assessments/students'),
    ]).then(([assessmentResponse, studentResponse]) => {
      if (!assessmentResponse.ok) return setError(assessmentResponse.data?.message || 'Unable to load assessment')
      if (!studentResponse.ok) return setError(studentResponse.data?.message || 'Unable to load students')
      setAssessment(assessmentResponse.data.data.assessment)
      setStudents(studentResponse.data.data || [])
      setDeadline(toLocalInput(assessmentResponse.data.data.assessment.endDate))
    }).catch(() => setError('Unable to load assignment details'))
  }, [assessmentId])

  const assignedIds = new Set((assessment?.assignedStudents || []).map(String))
  const availableStudents = students.filter((student) => !assignedIds.has(String(student._id)))

  const assign = async () => {
    if (!selectedIds.length) return setError('Select at least one student.')
    if (!deadline) return setError('A deadline is required.')
    if (new Date(deadline) <= new Date()) return setError('Deadline must be a valid future date.')
    setBusy(true)
    setError('')
    const response = await api.post(`/faculty/assessments/${assessmentId}/assign`, { studentIds: selectedIds, deadline })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Assignment failed')
    navigate('/faculty/assessments')
  }

  if (error && !assessment) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading assignment...</div>

  return <>
    <div className="page-title"><div><h1>Assign Assessment</h1><div className="subtitle">{assessment.title}</div></div><Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link></div>
    {error && <div className="alert error">{error}</div>}
    <div className="card">
      <div className="form-group"><label>Deadline</label><input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></div>
      <div className="row between"><h3>Select Students</h3><div className="row"><button className="btn small secondary" onClick={() => setSelectedIds(availableStudents.map((student) => student._id))}>Select All</button><button className="btn small secondary" onClick={() => setSelectedIds([])}>Clear All</button></div></div>
      <p className="muted">Selected students: {selectedIds.length}</p>
      {availableStudents.length ? <div className="table-wrap"><table><thead><tr><th>Select</th><th>Student</th><th>Email</th></tr></thead><tbody>{availableStudents.map((student) => <tr key={student._id}><td><input type="checkbox" checked={selectedIds.includes(student._id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, student._id] : current.filter((id) => id !== student._id))} /></td><td>{student.name}</td><td>{student.email}</td></tr>)}</tbody></table></div> : <p className="muted">No unassigned students are available.</p>}
      <button className="btn mt" disabled={busy || !selectedIds.length} onClick={assign}>{busy ? 'Assigning...' : 'Assign'}</button>
    </div>
  </>
}
