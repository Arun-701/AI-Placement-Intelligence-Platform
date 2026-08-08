import { useState, useEffect } from 'react'
import { api } from '../../api'

function Milestone({ m, onToggle }) {
  const badge = m.status === 'Completed' ? 'green' : m.status === 'In Progress' ? 'amber' : 'gray'
  return (
    <div className="card mb">
      <div className="row between">
        <div>
          <h3>{m.title}</h3>
          {m.description && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{m.description}</p>}
          <span className={`badge ${badge}`} style={{ marginTop: 8 }}>{m.status}</span>
        </div>
        <div className="row">
          {['Pending', 'In Progress', 'Completed'].map((s) => (
            <button key={s} className={`btn small ${m.status === s ? '' : 'secondary'}`} onClick={() => onToggle(m._id, s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const [roadmap, setRoadmap] = useState(null)
  const [progress, setProgress] = useState(null)
  const [targetRole, setTargetRole] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    api.get('/roadmap/me').then((r) => {
      if (r.ok) setRoadmap(r.data.data)
      else setError(r.data?.message || 'No roadmap yet')
    })
    api.get('/roadmap/progress').then((r) => {
      if (r.ok) setProgress(r.data.data)
    })
  }

  useEffect(load, [])

  const generate = async () => {
    setError('')
    const r = await api.post('/roadmap/generate', { targetRole })
    if (r.ok) {
      setRoadmap(r.data.data)
    } else {
      setError(r.data?.message || 'Failed to generate roadmap')
    }
  }

  const toggleStatus = async (milestoneId, status) => {
    const r = await api.patch(`/roadmap/milestone/${milestoneId}`, { status })
    if (r.ok) { setRoadmap(r.data.data); load() }
    else { setError(r.data?.message || 'Update failed (this milestone may have a different ID format)'); load() }
  }

  if (error && !roadmap) {
    return (
      <>
        <h1>Learning Roadmap</h1>
        <div className="alert info">{error}</div>
        <div className="card">
          <h3>Generate Your Personalized Roadmap</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '8px 0' }}>Tell us your target career role and we will build a step-by-step learning plan.</p>
          <div className="row">
            <input style={{ flex: 1, padding: 10 }} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Full Stack Developer, Data Scientist, Backend Engineer" />
            <button className="btn" onClick={generate}>Generate Roadmap</button>
          </div>
        </div>
      </>
    )
  }

  const miles = roadmap?.milestones || roadmap?.roadmap?.milestones || roadmap?.roadmapItems || []

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Learning Roadmap</h1>
          <div className="subtitle">{roadmap?.careerGoal || roadmap?.targetRole || 'Personalized roadmap'}</div>
        </div>
        {roadmap && <button className="btn secondary" onClick={() => { setRoadmap(null); setError('') }}>Generate New</button>}
      </div>

      {progress && (
        <div className="card mb">
          <h3>Overall Progress</h3>
          <div className="score-ring">{progress.percentage ?? progress.completedPercentage ?? progress.completionPercentage ?? 0}%</div>
          <div className="mt progress-bar"><div style={{ width: `${progress.percentage ?? progress.completedPercentage ?? progress.completionPercentage ?? 0}%` }} /></div>
          {typeof progress.completedMilestones === 'number' && (
            <p className="mt" style={{ fontSize: 14, color: 'var(--muted)' }}>{progress.completedMilestones} of {progress.totalMilestones} milestones completed</p>
          )}
        </div>
      )}

      {miles.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>Roadmap has no milestones yet.</p></div>
      ) : (
        <>
          <h3 className="section-title">Milestones</h3>
          {miles.map((m) => <Milestone key={m._id} m={m} onToggle={toggleStatus} />)}
        </>
      )}
    </>
  )
}