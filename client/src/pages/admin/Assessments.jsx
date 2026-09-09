import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function AdminAssessments() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('VIEW_ALL')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const assessmentResponse = await api.get(`/admin/assessments?refresh=${Date.now()}`)
    if (!assessmentResponse.ok) setError(assessmentResponse.data?.message || 'Unable to load assessments')
    else setItems(assessmentResponse.data?.data || [])
  }

  useEffect(() => {
    let cancelled = false
    api.get(`/admin/assessments?refresh=${Date.now()}`).then((response) => {
      if (cancelled) return
      if (!response.ok) setError(response.data?.message || 'Unable to load assessments')
      else setItems(response.data?.data || [])
    }).catch(() => { if (!cancelled) setError('Unable to load assessments') })
    return () => { cancelled = true }
  }, [])

  const isAdminCreated = (item) => Boolean(item.createdByAdmin)
  const isFacultyCreated = (item) => Boolean(item.assignedFaculty)
  const filtered = items.filter((item) => tab === 'VIEW_ALL' || (tab === 'ASSIGNED' ? isAdminCreated(item) && item.statusLabel !== 'NOT_ASSIGNED' : tab === 'NOT_ASSIGNED' ? isAdminCreated(item) && item.statusLabel === 'NOT_ASSIGNED' : tab === 'FACULTY_CREATED' ? isFacultyCreated(item) : isAdminCreated(item)))
  const reschedule = async (item, enable = false) => {
    const deadline = window.prompt('Enter a future deadline as YYYY-MM-DDTHH:mm', item.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : '')
    if (!deadline) return
    setBusy(true); setError('')
    const response = await api[enable ? 'post' : 'patch'](`/admin/assessments/${item._id}/${enable ? 'enable' : 'deadline'}`, { deadline })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Deadline update failed')
    setStatus(response.data.message); await load()
  }
  const deleteAssessment = async (item) => {
    if (!window.confirm(`Delete the assessment "${item.title}"? Its questions, student accounts, assignments, and results will not be deleted.`)) return
    setBusy(true); setError('')
    const response = await api.del(`/admin/assessments/${item._id}`)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to delete assessment')
    setStatus('Assessment deleted successfully.'); await load()
  }

  return <>
    <div className="page-title"><div><h1>Assessments</h1><div className="subtitle">Create, assign, and track assessment participation.</div></div></div>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    <AssessmentSectionNav />
    <div className="role-tabs"><button className={tab === 'ASSIGNED' ? 'active' : ''} onClick={() => setTab('ASSIGNED')}>Assigned</button><button className={tab === 'NOT_ASSIGNED' ? 'active' : ''} onClick={() => setTab('NOT_ASSIGNED')}>Not Assigned</button><button className={tab === 'FACULTY_CREATED' ? 'active' : ''} onClick={() => setTab('FACULTY_CREATED')}>Created by Faculty</button><button className={tab === 'ADMIN_CREATED' ? 'active' : ''} onClick={() => setTab('ADMIN_CREATED')}>Created by Admin</button><button className={tab === 'VIEW_ALL' ? 'active' : ''} onClick={() => setTab('VIEW_ALL')}>View All</button></div>
    {filtered.length === 0 && <div className="card"><p className="muted">No assessments in this view.</p></div>}
    <div className="grid">{filtered.map((item) => <div className="card" key={item._id}><div className="row between"><div><h3>{item.title}</h3><div className="muted">{item.department || 'No department'} · {item.totalQuestions} questions · {item.duration} minutes</div></div><span className={`badge ${item.statusLabel === 'EXPIRED' ? 'red' : item.statusLabel === 'ASSIGNED' ? 'green' : 'gray'}`}>{item.statusLabel.replace('_', ' ')}</span></div><div className="stat-inline"><span>Deadline</span><strong>{formatDeadline(item.endDate)}</strong></div><div className="stat-inline"><span>Assigned</span><strong>{item.assignedCount} · Attended {item.attendedCount} · Not attended {item.notAttendedCount}</strong></div>{item.averagePercentage !== null && <div className="stat-inline"><span>Average</span><strong>{item.averagePercentage}%</strong></div>}<div className="row mt"><button className="btn small secondary" onClick={() => navigate(`/admin/assessments/results/${item._id}`)}>View Result</button>{isAdminCreated(item) && item.statusLabel === 'NOT_ASSIGNED' && <button className="btn small" onClick={() => navigate(`/admin/assessments/assign/${item._id}`)}>Assign</button>}{isAdminCreated(item) && <><button className="btn small secondary" onClick={() => navigate(`/admin/assessments/edit/${item._id}`)}>Edit</button><button className="btn small danger" disabled={busy} onClick={() => deleteAssessment(item)}>Delete</button>{item.statusLabel !== 'NOT_ASSIGNED' && <button className="btn small secondary" onClick={() => reschedule(item)} disabled={busy}>Reschedule</button>}{item.statusLabel === 'EXPIRED' && <button className="btn small" onClick={() => reschedule(item, true)} disabled={busy}>Enable</button>}</>}</div></div>)}</div>
  </>
}
