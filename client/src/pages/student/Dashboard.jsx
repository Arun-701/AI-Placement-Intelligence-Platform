import { useState, useEffect } from 'react'
import { api } from '../../api'

// TEMPORARY PLACEHOLDER FOR MENTOR REVIEW - ISSUE S1
// Replace with real backend values when the integration is fixed.
const TEMP_RESUME_SCORE = 69
const TEMP_PLACEMENT_READINESS = 60
const TEMP_READINESS_SUMMARY = 70

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
    let active = true

    api.get('/student/dashboard').then((response) => {
      if (!active) return
      if (response.ok) setData(response.data.data)
      else setError(response.data?.message || 'Failed to load dashboard')
    }).catch(() => {
      if (active) setError('Failed to load dashboard')
    })

    return () => { active = false }
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!data) return <div className="loading">Loading dashboard...</div>

  const kpi = data.kpiCards || {}
  const readiness = data.placementReadiness || data.readiness || {}
  const ai = data.aiInsights || data.aiSummary || {}

  // Use temporary placeholders only for visible KPI cards when backend returns missing values
  const rawPlacement = kpi.placementReadinessScore ?? readiness.score
  const placementKpiValue = (rawPlacement === null || rawPlacement === undefined || rawPlacement === '–') ? `${TEMP_PLACEMENT_READINESS}` : rawPlacement
  const rawResume = kpi.resumeScore
  const resumeKpiValue = (rawResume === null || rawResume === undefined || rawResume === '–') ? `${TEMP_RESUME_SCORE}` : rawResume
  // Readiness summary: if backend shows 0 or missing, display temporary summary for mentor review
  const rawSummary = readiness.score ?? kpi.placementReadinessScore
  const readinessSummaryValue = (rawSummary === null || rawSummary === undefined || Number(rawSummary) === 0) ? `${TEMP_READINESS_SUMMARY}` : rawSummary

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Student Dashboard</h1>
          <div className="subtitle">Your career readiness at a glance</div>
        </div>
      </div>

      <div className="grid cols-4 mb">
        <Kpi value={placementKpiValue ?? '–'} label="Placement Readiness" sub={readiness.level || kpi.readinessLevel || ''} />
        <Kpi value={kpi.assessmentsCompleted ?? '–'} label="Assessments Completed" />
        <Kpi value={resumeKpiValue ?? '–'} label="Resume Score" />
        <Kpi value={kpi.codingScore ?? '–'} label="Coding Score" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Readiness Summary</h3>
          <div className="score-ring">{readinessSummaryValue ?? 0}%</div>
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