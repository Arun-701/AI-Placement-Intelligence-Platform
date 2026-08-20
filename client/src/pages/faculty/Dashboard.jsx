import { useState, useEffect } from 'react'
import { api } from '../../api'

function Kpi({ value, label }) {
  return <div className="card kpi-card"><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div></div>
}

export default function FacultyDashboard() {
  const [data, setData] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/faculty/dashboard').then((r) => {
      if (r.ok) setData(r.data.data)
      else setError(r.data?.message || 'Failed to load faculty dashboard')
    })
    api.get('/faculty/results/dashboard/statistics').then((r) => {
      if (r.ok) setResults(r.data.data)
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!data && !results) return <div className="loading">Loading dashboard...</div>

  const d = data || {}
  const dkpi = d.kpiCards || {}
  const stats = results || {}
  const dashboardStats = d.statistics || {}

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Faculty Dashboard</h1>
          <div className="subtitle">Monitor your students and assessments</div>
        </div>
      </div>

      <div className="grid cols-4 mb">
        <Kpi value={dkpi.assignedStudents ?? dashboardStats.totalAssignedStudents ?? d.totalStudents ?? d.assignedStudentsCount ?? '–'} label="Assigned Students" />
        <Kpi value={dkpi.assignedAssessments ?? dashboardStats.totalAssessmentsCreated ?? d.totalAssessments ?? d.assignedAssessmentsCount ?? '–'} label="Assessments" />
        <Kpi value={stats.totalResults ?? stats.resultsCount ?? '–'} label="Results Submitted" />
        <Kpi value={stats.averagePercentage ? `${stats.averagePercentage}%` : '–'} label="Average Score" />
      </div>

      {d.recentActivity?.length > 0 && (
        <div className="card mb">
          <h3>Recent Activity</h3>
          {d.recentActivity.map((a, i) => (
            <div key={i} className="list-item">{typeof a === 'string' ? a : JSON.stringify(a)}</div>
          ))}
        </div>
      )}
    </>
  )
}