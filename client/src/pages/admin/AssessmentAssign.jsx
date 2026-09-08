import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

const toLocalInput = (date) => date ? new Date(date).toISOString().slice(0, 16) : ''

export default function AdminAssessmentAssign() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ department: '', deadline: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/admin/assessments'), api.get('/admin/assessments/departments')]).then(([assessmentResponse, departmentResponse]) => {
      const item = assessmentResponse.data?.data?.find((entry) => entry._id === assessmentId)
      if (!assessmentResponse.ok || !item) return setError(assessmentResponse.data?.message || 'Assessment not found')
      setAssessment(item)
      setForm({ department: item.department || '', deadline: toLocalInput(item.endDate) })
      if (departmentResponse.ok) setDepartments(departmentResponse.data?.data || [])
    }).catch(() => setError('Unable to load assignment details'))
  }, [assessmentId])

  const assign = async () => {
    setBusy(true); setError('')
    const response = await api.post(`/admin/assessments/${assessmentId}/assign`, form)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Assignment failed')
    navigate('/admin/assessments')
  }

  if (error && !assessment) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading assignment...</div>

  return <>
    <div className="page-title"><div><h1>Assign Assessment</h1><div className="subtitle">{assessment.title}</div></div><Link className="btn secondary" to="/admin/assessments">Back to Assessments</Link></div>
    {error && <div className="alert error">{error}</div>}
    <div className="card"><h3>{assessment.title}</h3><div className="form-group"><label>Department</label><select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></div><div className="form-group"><label>Deadline</label><input type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></div><button className="btn" disabled={busy} onClick={assign}>{busy ? 'Assigning...' : 'Assign Assessment'}</button></div>
  </>
}
