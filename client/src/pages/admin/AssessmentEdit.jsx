import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

export default function AdminAssessmentEdit() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/admin/assessments/${assessmentId}/details?refresh=${Date.now()}`).then((response) => response.ok ? setTitle(response.data.data.assessment.title) : setError(response.data?.message || 'Unable to load assessment')).catch(() => setError('Unable to load assessment'))
  }, [assessmentId])

  const save = async () => {
    if (!title.trim()) return setError('Assessment title is required.')
    setBusy(true); setError('')
    const response = await api.put(`/admin/assessments/edit/${assessmentId}`, { title: title.trim() })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to update assessment')
    navigate('/admin/assessments')
  }

  if (error && !title) return <div className="alert error">{error}</div>
  if (!title) return <div className="loading">Loading assessment...</div>
  return <><div className="page-title"><div><h1>Edit Assessment</h1><div className="subtitle">Update assessment title</div></div><Link className="btn secondary" to="/admin/assessments">Cancel</Link></div>{error && <div className="alert error">{error}</div>}<div className="card"><div className="form-group"><label>Assessment title</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button><Link className="btn secondary" to="/admin/assessments">Cancel</Link></div></>
}
