import { useState, useEffect } from 'react'
import { api } from '../../api'

function Kpi({ value, label, sub }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/student/dashboard').then((r) => {
      if (r.ok) setData(r.data.data)
      else setError(r.data?.message || 'Failed to load dashboard')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!data) return <div className="loading">Loading dashboard...</div>

  const kpi = data.kpiCards || {}
  const readiness = data.placementReadiness || data.readiness || {}
  const ai = data.aiInsights || data.aiSummary || {}

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Student Dashboard</h1>
          <div className="subtitle">Your career readiness at a glance</div>
        </div>
      </div>

      <div className="grid cols-4 mb">
        <Kpi value={kpi.placementReadinessScore ?? readiness.score ?? '–'} label="Placement Readiness" sub={readiness.level || kpi.readinessLevel || ''} />
        <Kpi value={kpi.assessmentsCompleted ?? '–'} label="Assessments Completed" />
        <Kpi value={kpi.resumeScore ?? '–'} label="Resume Score" />
        <Kpi value={kpi.codingScore ?? '–'} label="Coding Score" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Readiness Summary</h3>
          <div className="score-ring">{readiness.score ?? kpi.placementReadinessScore ?? 0}%</div>
          <p className="mt" style={{ fontSize: 14, color: 'var(--muted)' }}>
            {readiness.explanation || 'Complete your resume, coding profile and assessments to get a full readiness score.'}
          </p>
          {readiness.level && (
            <div className="mt">
              <span className={`badge ${readiness.level === 'High' ? 'green' : readiness.level === 'Medium' ? 'amber' : 'red'}`}>{readiness.level}</span>
            </div>
          )}
          {Array.isArray(readiness.recommendedActions) && readiness.recommendedActions.length > 0 && (
            <>
              <h3 className="mt">Recommended Next Actions</h3>
              <ul style={{ fontSize: 14, paddingLeft: 20 }}>
                {readiness.recommendedActions.slice(0, 5).map((a, i) => <li key={i} className="list-item">{a}</li>)}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <h3>AI Insights</h3>
          {Object.keys(ai).length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              Upload your resume and complete assessments so the AI can generate insights for you.
            </p>
          ) : (
            <div className="ai-box">{JSON.stringify(ai)}</div>
          )}
          {ai.summary && <div className="ai-box mt">{ai.summary}</div>}
        </div>
      </div>
    </>
  )
}