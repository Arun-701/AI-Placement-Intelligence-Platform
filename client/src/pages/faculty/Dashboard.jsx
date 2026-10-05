import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'

function StatCard({ title, value, subtitle, tone, icon }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-card__icon">{icon}</div>
      <div>
        <div className="stat-card__label">{title}</div>
        <div className="stat-card__value">{value}</div>
        {subtitle && <div className="stat-card__subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function DonutChart({ items, totalLabel = 'Students' }) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 1
  let acc = 0
  const gradient = items.map((item) => {
    const start = acc / total * 100
    acc += Number(item.value) || 0
    const end = acc / total * 100
    return `${item.color} ${start}% ${end}%`
  }).join(', ')

  return (
    <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
      <div className="donut-chart__inner">
        <strong>{total}</strong>
        <span>{totalLabel}</span>
      </div>
    </div>
  )
}

function BarChart({ items }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value) || 0), 1)

  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div key={item.label} className="bar-chart__row">
          <div className="bar-chart__meta">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-chart__track">
            <div className="bar-chart__fill" style={{ width: `${((Number(item.value) || 0) / maxValue) * 100}%`, background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FacultyDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([
      api.get('/faculty/dashboard'),
      api.get('/faculty/results/dashboard/statistics')
    ]).then(([dashboardResponse, summaryResponse]) => {
      if (!active) return
      if (dashboardResponse.ok) setDashboard(dashboardResponse.data.data)
      if (summaryResponse.ok) setSummary(summaryResponse.data.data)
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [])

  const d = dashboard || {}
  const s = summary || {}

  const readinessDistribution = d.studentReadinessDistribution || {}
  const readinessEntries = Object.entries(readinessDistribution)
    .map(([label, value]) => ({
      label,
      value: Number(value) || 0,
      color: label === 'High' ? '#16a34a' : label === 'Medium' ? '#f59e0b' : '#2563eb'
    }))

  const assessmentStats = Array.isArray(s.assessmentStatistics) ? s.assessmentStatistics : []
  const assessmentChartData = assessmentStats.map((item) => ({
    label: item.title || item.name || 'Assessment',
    value: Number(item.averageScore ?? item.averagePercentage ?? item.score ?? 0),
    color: '#2563eb'
  }))

  const weakSkills = Array.isArray(d.weakSkillsAnalysis) ? d.weakSkillsAnalysis : []
  const weakSkillsChart = weakSkills.map((item) => ({
    label: item.skill || item.name || 'Skill',
    value: Number(item.strength ?? item.percentage ?? item.score ?? item.count ?? 0),
    color: '#f97316'
  }))

  const quickActions = useMemo(() => [
    { label: 'My Students', to: '/faculty/students', icon: '👥' },
    { label: 'Assessments', to: '/faculty/assessments', icon: '🧪' },
    { label: 'Create Assessment', to: '/faculty/assessments/create', icon: '＋' },
    { label: 'Results', to: '/faculty/results', icon: '📊' }
  ], [])

  if (loading && !dashboard && !summary) {
    return <div className="loading">Loading faculty dashboard...</div>
  }

  return (
    <div className="dashboard-shell">
      <div className="page-title">
        <div>
          <h1>Faculty Dashboard</h1>
          <div className="subtitle">Track assigned students, assessment performance, and intervention needs</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Assigned Students" value={d.totalAssignedStudents ?? '–'} subtitle="Current class roster" tone="blue" icon="👥" />
        <StatCard title="Assessments" value={d.totalAssignedAssessments ?? '–'} subtitle="Assigned tests" tone="green" icon="🧪" />
        <StatCard title="Completed Attempts" value={d.assessmentCompletionStatistics?.completed ?? '–'} subtitle="Results submitted" tone="purple" icon="✅" />
        <StatCard title="Average Score" value={d.averageAssessmentScores?.overall ?? '–'} subtitle="Across assessments" tone="orange" icon="📈" />
      </div>

      <div className="content-grid dashboard-two-col">
        <div className="panel card">
          <div className="panel-header">
            <h3>Assessment Performance</h3>
            <span className="panel-chip">Scores</span>
          </div>
          {assessmentChartData.length ? (
            <BarChart items={assessmentChartData} />
          ) : (
            <p className="empty-state">No assessment score data is available yet.</p>
          )}
        </div>

        <div className="panel card">
          <div className="panel-header">
            <h3>Student Readiness</h3>
            <span className="panel-chip">Distribution</span>
          </div>
          <div className="donut-layout">
            <DonutChart items={readinessEntries} totalLabel="Students" />
            <div className="legend-list">
              {readinessEntries.length ? readinessEntries.map((item) => (
                <div key={item.label} className="legend-item">
                  <span className="legend-swatch" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              )) : <p className="empty-state">No readiness data available.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid dashboard-two-col">
        <div className="panel card">
          <div className="panel-header">
            <h3>Skills Needing Attention</h3>
            <span className="panel-chip">Insights</span>
          </div>
          {weakSkillsChart.length ? (
            <BarChart items={weakSkillsChart} />
          ) : (
            <p className="empty-state">No weak skills analytics available.</p>
          )}
        </div>

        <div className="panel card">
          <div className="panel-header">
            <h3>Quick Actions</h3>
            <span className="panel-chip">Shortcuts</span>
          </div>
          <div className="quick-action-grid">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className="quick-action">
                <span className="quick-action__icon">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="content-grid dashboard-two-col">
        <div className="panel card">
          <div className="panel-header">
            <h3>Students Needing Attention</h3>
            <span className="panel-chip">Priority</span>
          </div>
          {Array.isArray(d.studentsNeedingAttention) && d.studentsNeedingAttention.length ? (
            <div className="list-stack">
              {d.studentsNeedingAttention.slice(0, 5).map((student) => (
                <div key={student.studentId || student.name || Math.random()} className="list-item">
                  <div>
                    <strong>{student.studentName || student.name || 'Student'}</strong>
                    <div className="muted">{student.email || student.studentId || 'No email available'}</div>
                  </div>
                  <span className="status-badge status-badge--warning">{student.score ?? student.averageScore ?? 'Review'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No students currently flagged for intervention.</p>
          )}
        </div>

        <div className="panel card">
          <div className="panel-header">
            <h3>Recent Assessments</h3>
            <span className="panel-chip">Latest</span>
          </div>
          {Array.isArray(d.recentAssessments) && d.recentAssessments.length ? (
            <div className="list-stack">
              {d.recentAssessments.slice(0, 5).map((assessment) => (
                <div key={assessment._id || assessment.id || assessment.title || Math.random()} className="list-item">
                  <div>
                    <strong>{assessment.title || 'Assessment'}</strong>
                    <div className="muted">{assessment.type || 'Assessment'} • {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'Recent'}</div>
                  </div>
                  <span className="status-badge">{assessment.totalQuestions ?? assessment.questions?.length ?? assessment.results?.length ?? 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No recent assessments found.</p>
          )}
        </div>
      </div>
    </div>
  )
}