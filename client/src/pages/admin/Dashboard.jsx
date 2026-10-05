import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import { isAssessmentExpiringSoon } from '../../assessmentMetrics'
import './Dashboard.css'

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

function DonutChart({ items, totalLabel = 'Total' }) {
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

export default function AdminDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)
  const [assessmentsList, setAssessmentsList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/statistics'),
      api.get(`/admin/assessments?refresh=${Date.now()}`)
    ]).then(([dashboardResponse, statsResponse, assessmentsResponse]) => {
      if (!active) return
      if (dashboardResponse.ok) setDashboard(dashboardResponse.data.data)
      if (statsResponse.ok) setStats(statsResponse.data.data)
      if (assessmentsResponse && assessmentsResponse.ok) setAssessmentsList(assessmentsResponse.data.data)
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [])

  const d = dashboard || {}
  const s = stats || {}
  const studentOverview = s.studentOverview || d.studentOverview || {}
  const facultyOverview = s.facultyOverview || d.facultyOverview || {}
  const assessmentOverview = s.assessmentOverview || d.assessmentOverview || {}
  const readinessDistribution = s.placementReadinessDistribution || d.placementReadinessDistribution || {}
  const departmentList = Array.isArray(studentOverview.departments) ? studentOverview.departments : []

  const assessmentAssignmentMetrics = (assessmentsList || []).reduce((metrics, assessment) => {
    if (assessment.department && assessment.assignedStudents?.length) metrics.assigned += 1
    else metrics.notAssigned += 1
    return metrics
  }, { assigned: 0, notAssigned: 0 })

  const computeAssessmentMetrics = (list) => {
    const byFaculty = list.filter((a) => a.assignedFaculty)
    const byAdmin = list.filter((a) => a.createdByAdmin)

    const calc = (arr) => {
      const total = arr.length
      const assigned = arr.filter((a) => Array.isArray(a.assignedStudents) && a.assignedStudents.length > 0).length
      const notAssigned = total - assigned
      const expiringSoon = arr.filter(isAssessmentExpiringSoon).length
      return { total, assigned, notAssigned, expiringSoon }
    }

    return { faculty: calc(byFaculty), admin: calc(byAdmin) }
  }

  const assessmentMetrics = computeAssessmentMetrics(assessmentsList || [])
  const assessmentStatusEntries = Object.entries(assessmentOverview.statusCounts || {})
    .map(([label, value]) => ({ label, value: Number(value) || 0, color: ['#2563eb', '#16a34a', '#8b5cf6', '#f59e0b', '#ef4444'][Math.abs(label.length) % 5] }))
  const readinessEntries = Object.entries(readinessDistribution)
    .map(([label, value]) => ({ label, value: Number(value) || 0, color: label === 'High' ? '#16a34a' : label === 'Medium' ? '#f59e0b' : '#2563eb' }))
  const maximumDepartmentCount = Math.max(...departmentList.map((department) => Number(department.count) || 0), 1)

  const quickActions = useMemo(() => [
    { label: 'Create Assessment', to: '/admin/assessments/upload', icon: '⇪' },
    { label: 'Assign Assessment', to: '/admin/assessments', icon: '＋' },
    { label: 'Manage Students', to: '/admin/students', icon: '👥' },
    { label: 'Manage Faculties', to: '/admin/faculties', icon: '🎓' },
    { label: 'Reports', to: '/admin/reports', icon: '📊' },
    { label: 'Assignment History', to: '/admin/assignment-history', icon: '🕘' }
  ], [])

  if (loading && !dashboard && !stats) {
    return <div className="loading">Loading admin dashboard...</div>
  }

  const displayName = user?.name ? String(user.name).split(' ')[0] : (user?.email ? String(user.email).split('@')[0] : '')

  return (
    <div className="dashboard-shell admin-dashboard">
      <img className="admin-dashboard-illustration" src="/admin-dashboard-technology.jpg" alt="" aria-hidden="true" />
      <div className="page-title">
        <div>
          <h1>{displayName ? `Welcome back, ${displayName}!` : 'Welcome back!'}</h1>
          <div className="subtitle">Platform overview and learning operations</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Students" value={studentOverview.totalStudents ?? '–'} subtitle={`${studentOverview.activeStudents ?? 0} active`} tone="blue" icon="👥" />
        <StatCard title="Total Faculty" value={facultyOverview.totalFaculties ?? '–'} subtitle={`${facultyOverview.activeFaculties ?? 0} active`} tone="green" icon="🎓" />
        <StatCard title="Assessments" value={`${assessmentAssignmentMetrics.assigned} / ${assessmentAssignmentMetrics.notAssigned}`} subtitle="Assigned / Not Assigned" tone="purple" icon="🧪" />
        <StatCard title="Student Requests" value={d.studentRequestCount ?? 0} subtitle="Pending requests" tone="orange" icon="📨" />
      </div>

      <div className="content-grid dashboard-two-col assessment-readiness-grid">
        <div className="panel card">
          <div className="panel-header">
            <div className="panel-heading"><span className="dashboard-panel-icon status-icon" aria-hidden="true">✓</span><h3>Assessment Status</h3></div>
            <span className="panel-chip">Live</span>
          </div>
          <div className="assessment-status-table-wrap">
            <table className="assessment-status-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Metric</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Faculty</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Admin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px' }}>Assigned</td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.faculty.assigned ?? 0}</strong></td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.admin.assigned ?? 0}</strong></td>
                </tr>
                <tr style={{ background: 'transparent' }}>
                  <td style={{ padding: '10px 12px' }}>Not Assigned</td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.faculty.notAssigned ?? 0}</strong></td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.admin.notAssigned ?? 0}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px' }}>Expiring Soon</td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.faculty.expiringSoon ?? 0}</strong></td>
                  <td style={{ padding: '10px 12px' }}><strong>{assessmentMetrics.admin.expiringSoon ?? 0}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel card">
          <div className="panel-header">
            <div className="panel-heading"><span className="dashboard-panel-icon readiness-icon" aria-hidden="true">◉</span><h3>Student Readiness</h3></div>
            <span className="panel-chip">{studentOverview.averagePlacementReadiness ?? '–'}% avg</span>
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

      <div className="content-grid dashboard-two-col department-actions-grid">
        <div className="panel card">
          <div className="panel-header">
            <div className="panel-heading"><span className="dashboard-panel-icon department-icon" aria-hidden="true">▥</span><h3>Department Distribution</h3></div>
            <span className="panel-chip">Students</span>
          </div>
          {departmentList.length ? (
            <div className="department-chart" role="list" aria-label="Students by department">
              {departmentList.map((department, index) => {
                const count = Number(department.count) || 0
                const height = count ? Math.max((count / maximumDepartmentCount) * 100, 8) : 0
                const label = department.department || 'Unassigned'
                return (
                  <div className="department-column-item" role="listitem" key={department.department || 'unknown'}>
                    <strong className="department-column-count">{count}</strong>
                    <div className="department-column-track">
                      <div className={`department-column department-column--${index % 4}`} style={{ height: `${height}%` }} />
                    </div>
                    <span className="department-column-label" title={label}>{label}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="empty-state">No department distribution data is available.</p>
          )}
        </div>

        <div className="panel card">
          <div className="panel-header">
            <div className="panel-heading"><span className="dashboard-panel-icon actions-icon" aria-hidden="true">✦</span><h3>Quick Actions</h3></div>
            <span className="panel-chip">Tools</span>
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
    </div>
  )
}