import { useState, useEffect } from 'react'
import { api } from '../../api'
import { TEMP_DASHBOARD_VALUES } from '../../utils/dashboardTemporaryValues'

function Kpi({ value, label, sub }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

const firstValidScore = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') continue
    const score = Number(value)
    if (Number.isFinite(score)) return score
  }
  return null
}

const isResumeExtractionError = (message) =>
  typeof message === 'string' && /unable to extract resume text|no selectable text found in pdf|uploaded file is not a valid pdf/i.test(message)

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    api.get('/dashboard/student').then((response) => {
      if (!active) return
      if (response.ok) setData(response.data.data)
      else {
        const message = response.data?.message || 'Failed to load dashboard'
        setError(isResumeExtractionError(message) ? '' : message)
      }
      setLoading(false)
    }).catch(() => {
      if (active) {
        setError('Failed to load dashboard')
        setLoading(false)
      }
    })

    return () => { active = false }
  }, [])

  if (loading) return <div className="loading">Loading dashboard...</div>

  const dashboardData = data || {}
  const kpi = dashboardData.kpiCards || {}
  const readiness = dashboardData.placementReadiness || dashboardData.overallPlacementReadiness || dashboardData.readiness || {}
  const resumeSummary = dashboardData.resumeAnalysis || dashboardData.resumeSummary || {}
  const codingSummary = dashboardData.codingSummary || {}
  const ai = dashboardData.aiInsights || dashboardData.aiSummary || {}

  const placementScore = firstValidScore(kpi.placementReadinessScore, dashboardData.placementReadinessScore, readiness.score) ?? TEMP_DASHBOARD_VALUES.placementReadiness
  const resumeScore = firstValidScore(kpi.resumeScore, dashboardData.resumeScore, resumeSummary.resumeScore) ?? TEMP_DASHBOARD_VALUES.resumeScore
  const codingScore = firstValidScore(kpi.codingSkillScore, dashboardData.codingSkillScore, codingSummary.score) ?? TEMP_DASHBOARD_VALUES.codingScore
  const assessmentCount = kpi.assessmentsCompleted ?? dashboardData.assessmentsCompleted ?? dashboardData.assessmentSummary?.completedAssessments
  const readinessSummary = [readiness.summary, dashboardData.readinessSummary, readiness.explanation]
    .find((value) => typeof value === 'string' && value.trim() && value.trim() !== '—')
    || TEMP_DASHBOARD_VALUES.readinessSummary

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Student Dashboard</h1>
          <div className="subtitle">Your career readiness at a glance</div>
        </div>
      </div>
      {error && <div className="alert error" role="status">{error}</div>}

      <div className="grid cols-4 mb">
        <Kpi value={placementScore == null ? '–' : `${placementScore}%`} label="Placement Readiness" sub={readiness.level || kpi.readinessLevel || ''} />
        <Kpi value={assessmentCount ?? '–'} label="Assessments Completed" />
        <Kpi value={resumeScore == null ? '–' : `${resumeScore}%`} label="Resume Score" />
        <Kpi value={codingScore == null ? '–' : `${codingScore}%`} label="Coding Score" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Readiness Summary</h3>
          <div className="score-ring">{placementScore == null ? '–' : `${placementScore}%`}</div>
          <p className="mt" style={{ fontSize: 14, color: 'var(--muted)' }}>
            {readinessSummary}
          </p>
          {(readiness.level || readiness.level === 'Low') && (
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
