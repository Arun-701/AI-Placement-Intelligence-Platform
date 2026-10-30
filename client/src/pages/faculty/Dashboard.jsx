import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { api } from '../../api'
import './Dashboard.css'

const readinessTypes = [
  { key: 'High', label: 'Ready', color: '#34c99a' },
  { key: 'Medium', label: 'Needs Practice', color: '#3978ff' },
  { key: 'Low', label: 'At Risk', color: '#ffb11b' },
  { key: 'Not Started', label: 'Not Started', color: '#aab6c8' },
]

function Icon({ name, className = '' }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.3 4.3" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
    assessment: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
    completed: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
    score: <><path d="M4 20V11M10 20V5M16 20v-8M22 20H2" /></>,
    performance: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    readiness: <><path d="M12 3v3M12 18v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="5" /></>,
    actions: <><path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z" /></>,
    attention: <><path d="m12 3 9 16H3l9-16Z" /><path d="M12 9v4m0 3h.01" /></>,
    recent: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    skills: <><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4" /><circle cx="12" cy="12" r="3" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  )
}

function StatCard({ title, value, subtitle, tone, icon }) {
  return (
    <article className={`faculty-kpi faculty-kpi--${tone}`}>
      <div className="faculty-kpi__icon"><Icon name={icon} /></div>
      <div className="faculty-kpi__content">
        <div className="faculty-kpi__label">{title}</div>
        <div className="faculty-kpi__value">{value}</div>
        <div className="faculty-kpi__subtitle">{subtitle}</div>
      </div>
    </article>
  )
}

function PanelHeader({ icon, title, action, to, detail }) {
  return (
    <div className="faculty-panel__header">
      <div className="faculty-panel__heading">
        <span className="faculty-panel__icon"><Icon name={icon} /></span>
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
      </div>
      {to && <Link className="faculty-panel__action" to={to}>{action}<Icon name="arrow" /></Link>}
    </div>
  )
}

function DonutChart({ items, total }) {
  const segments = items.filter((item) => item.value > 0)
  let cursor = 0
  const gradient = segments.map((item) => {
    const start = cursor
    cursor += item.value / total * 100
    return `${item.color} ${start}% ${cursor}%`
  }).join(', ')

  return (
    <div
      className={`faculty-donut${total ? '' : ' faculty-donut--empty'}`}
      style={{ background: total ? `conic-gradient(${gradient})` : undefined }}
      role="img"
      aria-label={total ? `Readiness distribution for ${total} students` : 'No readiness data available'}
    >
      <div className="faculty-donut__center">
        <strong>{total}</strong>
        <span>Students</span>
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function getErrorMessage(result, fallback) {
  if (result.status === 'rejected') return fallback
  if (!result.value.ok) return result.value.data?.message || fallback
  return fallback
}

export default function FacultyDashboard() {
  const { user } = useAuth()
  const { unreadCount = 0 } = useOutletContext() || {}
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [students, setStudents] = useState([])
  const [assessments, setAssessments] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setErrors({})
    const responses = await Promise.allSettled([
      api.get('/dashboard/faculty'),
      api.get('/faculty/results/dashboard/statistics'),
      api.get('/faculty/students'),
      api.get('/faculty/assessments'),
    ])
    const [dashboardResult, statsResult, studentsResult, assessmentsResult] = responses
    const nextErrors = {}

    const dashboardData = dashboardResult.status === 'fulfilled' && dashboardResult.value.ok
      ? dashboardResult.value.data?.data
      : null
    if (
      dashboardData?.faculty
      && dashboardData.studentReadinessDistribution
      && typeof dashboardData.studentReadinessDistribution === 'object'
      && dashboardData.assessmentCompletionStatistics
      && Array.isArray(dashboardData.skillPerformance)
      && Array.isArray(dashboardData.studentsNeedingAttention)
      && Array.isArray(dashboardData.recentAssessmentResults)
    ) {
      setDashboard(dashboardData)
    } else {
      nextErrors.dashboard = getErrorMessage(dashboardResult, 'Dashboard analytics are unavailable.')
    }

    const statisticsData = statsResult.status === 'fulfilled' && statsResult.value.ok
      ? statsResult.value.data?.data
      : null
    if (statisticsData?.overallStatistics && Array.isArray(statisticsData.assessmentStatistics)) {
      setStatistics(statisticsData)
    } else {
      nextErrors.statistics = getErrorMessage(statsResult, 'Assessment result statistics are unavailable.')
    }

    if (studentsResult.status === 'fulfilled' && studentsResult.value.ok && Array.isArray(studentsResult.value.data?.data?.students)) {
      const responseStudents = studentsResult.value.data?.data?.students
      setStudents(responseStudents)
    } else {
      nextErrors.students = getErrorMessage(studentsResult, 'Assigned students are unavailable.')
    }

    if (assessmentsResult.status === 'fulfilled' && assessmentsResult.value.ok && Array.isArray(assessmentsResult.value.data?.data)) {
      const responseAssessments = assessmentsResult.value.data?.data
      setAssessments(responseAssessments)
    } else {
      nextErrors.assessments = getErrorMessage(assessmentsResult, 'Assessments are unavailable.')
    }

    setErrors(nextErrors)
    setLoading(false)
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadDashboard)
  }, [loadDashboard])

  const readinessDistribution = dashboard?.studentReadinessDistribution || {}
  const readinessItems = readinessTypes.map((type) => ({
    ...type,
    value: Number(readinessDistribution[type.key]) || 0,
  }))
  const readinessTotal = readinessItems.reduce((sum, item) => sum + item.value, 0)
  const assessmentStats = Array.isArray(statistics?.assessmentStatistics) ? statistics.assessmentStatistics : []
  const overallStats = statistics?.overallStatistics
  const overallAveragePercentage = overallStats?.averagePercentageAllAssessments
  const hasAveragePercentage = overallStats
    && Number(overallStats.totalResults) > 0
    && overallAveragePercentage !== null
    && overallAveragePercentage !== undefined
    && overallAveragePercentage !== ''
    && Number.isFinite(Number(overallAveragePercentage))
  const assessmentPerformance = assessments
    .map((assessment) => {
      const stats = assessmentStats.find((item) => String(item.assessmentId) === String(assessment._id))
      const average = assessment.averagePercentage ?? stats?.averagePercentage
      return {
        ...assessment,
        average: average !== null && average !== undefined && average !== '' && Number.isFinite(Number(average)) ? Number(average) : null,
        attendedCount: Number(assessment.attendedCount ?? stats?.totalAttempts) || 0,
        assignedCount: Number(assessment.assignedCount) || 0,
      }
    })
    .slice(0, 5)
  const recentAssessments = assessments.slice(0, 5)
  const recentResults = useMemo(
    () => Array.isArray(dashboard?.recentAssessmentResults) ? dashboard.recentAssessmentResults : [],
    [dashboard],
  )
  const attentionStudents = Array.isArray(dashboard?.studentsNeedingAttention) ? dashboard.studentsNeedingAttention.slice(0, 5) : []
  const skillPerformance = Array.isArray(dashboard?.skillPerformance) ? dashboard.skillPerformance.slice(0, 6) : []

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    const matches = []
    students.forEach((student) => {
      if (`${student.name || ''} ${student.studentId || ''} ${student.department || ''}`.toLowerCase().includes(query)) {
        matches.push({ label: student.name || student.studentId || 'Student', detail: 'Student', to: '/faculty/students', key: `student-${student._id}` })
      }
    })
    assessments.forEach((assessment) => {
      if (`${assessment.title || ''} ${assessment.assessmentType || ''}`.toLowerCase().includes(query)) {
        matches.push({ label: assessment.title || 'Assessment', detail: assessment.assessmentType || 'Assessment', to: '/faculty/assessments', key: `assessment-${assessment._id}` })
      }
    })
    recentResults.forEach((result, index) => {
      if (`${result.studentName || ''} ${result.assessmentTitle || ''}`.toLowerCase().includes(query)) {
        matches.push({ label: result.studentName || 'Student result', detail: `${result.assessmentTitle || 'Assessment'} result`, to: '/faculty/results', key: `result-${result.studentId || index}` })
      }
    })
    return matches.slice(0, 6)
  }, [assessments, recentResults, search, students])

  const facultyName = dashboard?.faculty?.name || user?.name || 'Faculty'
  const department = dashboard?.faculty?.department || user?.department || 'Faculty Department'
  const initials = facultyName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'F'
  const hasContent = dashboard || statistics || students.length || assessments.length

  return (
    <div className="faculty-dashboard">
      <header className="faculty-topbar">
        <label className="faculty-search" onClick={(event) => event.stopPropagation()}>
          <Icon name="search" />
          <input
            type="search"
            aria-label="Search students, assessments, or results"
            placeholder="Search students, assessments, or results..."
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) navigate(searchResults[0].to)
              if (event.key === 'Escape') setSearchOpen(false)
            }}
          />
          {searchOpen && search && (
            <div className="faculty-search__results">
              {searchResults.length ? searchResults.map((item) => (
                <Link key={item.key} to={item.to} onClick={() => { setSearchOpen(false); setSearch('') }}>
                  <span>{item.label}</span><small>{item.detail}</small>
                </Link>
              )) : <p>No matching students, assessments, or recent results.</p>}
            </div>
          )}
        </label>
        <div className="faculty-topbar__right">
          <Link className="faculty-notification-button" to="/faculty/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
            <Icon name="bell" />
            {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
          <div className="faculty-profile-menu">
            <button type="button" className="faculty-profile-trigger" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
              <span className="faculty-profile-avatar">{initials}</span>
              <span className="faculty-profile-copy"><strong>{facultyName}</strong><small>{department}</small></span>
              <span className="faculty-profile-chevron">⌄</span>
            </button>
            {profileOpen && (
              <div className="faculty-profile-dropdown">
                <Link to="/faculty/profile" onClick={() => setProfileOpen(false)}>View faculty profile</Link>
                <span>{user?.email || 'Faculty account'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="faculty-dashboard__content" onClick={() => { if (searchOpen) setSearchOpen(false) }}>
        <div className="faculty-dashboard__intro">
          <div>
            <h1>Faculty Dashboard <span aria-hidden="true">✦</span></h1>
            <p>Track assigned students, assessment performance, and intervention needs.</p>
          </div>
          <div className="faculty-dashboard__date">
            <Icon name="recent" />
            <span>Performance overview</span>
          </div>
        </div>

        {loading && !hasContent ? (
          <div className="faculty-dashboard-state" role="status">Loading faculty dashboard…</div>
        ) : null}

        {!loading && !hasContent && Object.keys(errors).length > 0 && (
          <div className="faculty-dashboard-state faculty-dashboard-state--error" role="alert">
            <p>Faculty dashboard data could not be loaded.</p>
            <button type="button" onClick={loadDashboard}>Retry</button>
          </div>
        )}

        {Object.keys(errors).length > 0 && hasContent && (
          <div className="faculty-dashboard-alert" role="status">
            Some dashboard information is unavailable: {Object.values(errors).join(' ')}
            <button type="button" onClick={loadDashboard}>Retry</button>
          </div>
        )}

        {hasContent && (
          <>
            <section className="faculty-kpi-grid" aria-label="Faculty dashboard statistics">
              <StatCard title="Assigned Students" value={dashboard ? dashboard.totalAssignedStudents : '—'} subtitle="Current faculty roster" tone="blue" icon="students" />
              <StatCard title="Assessments" value={dashboard ? dashboard.totalAssignedAssessments : '—'} subtitle="Assigned or managed" tone="green" icon="assessment" />
              <StatCard title="Completed Attempts" value={overallStats ? overallStats.totalResults : '—'} subtitle="Submitted results" tone="purple" icon="completed" />
              <StatCard
                title="Average Score"
                value={hasAveragePercentage ? `${overallAveragePercentage}%` : '—'}
                subtitle={hasAveragePercentage ? 'Across completed assessments' : 'No scored submissions yet'}
                tone="orange"
                icon="score"
              />
            </section>

            <section className="faculty-dashboard-grid faculty-dashboard-grid--top">
              <article className="faculty-panel faculty-panel--performance">
                <PanelHeader icon="performance" title="Assessment Performance" action="View All" to="/faculty/assessments" />
                {errors.assessments ? <p className="faculty-panel__state">{errors.assessments}</p> : assessmentPerformance.length ? (
                  <div className="faculty-performance-list">
                    {assessmentPerformance.map((assessment, index) => (
                      <div className="faculty-performance-row" key={assessment._id}>
                        <div className="faculty-performance-row__title">
                          <span>{assessment.title || 'Assessment'}</span>
                          <strong>{assessment.average === null ? '—' : `${Math.round(assessment.average)}%`}</strong>
                        </div>
                        <div className="faculty-progress-track"><span className={`tone-${index % 4}`} style={{ width: `${Math.min(100, Math.max(0, assessment.average || 0))}%` }} /></div>
                        <small>{assessment.attendedCount} participating {assessment.attendedCount === 1 ? 'student' : 'students'}{assessment.assignedCount ? ` of ${assessment.assignedCount}` : ''}</small>
                      </div>
                    ))}
                  </div>
                ) : <p className="faculty-panel__state">{loading ? 'Loading assessment performance…' : 'No assessment score data is available yet.'}</p>}
              </article>

              <article className="faculty-panel faculty-panel--readiness">
                <PanelHeader icon="readiness" title="Student Readiness" action="View Students" to="/faculty/students" />
                <div className="faculty-readiness">
                  <DonutChart items={readinessItems} total={readinessTotal} />
                  <div className="faculty-readiness__legend">
                    {readinessItems.map((item) => (
                      <div className="faculty-readiness__item" key={item.key}>
                        <span className="faculty-readiness__dot" style={{ background: item.color }} />
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{readinessTotal ? `${Math.round(item.value / readinessTotal * 100)}%` : '—'}</small>
                      </div>
                    ))}
                  </div>
                </div>
                {!readinessTotal && <p className="faculty-panel__footnote">No students are available in the faculty roster.</p>}
              </article>

              <article className="faculty-panel faculty-panel--actions">
                <PanelHeader icon="actions" title="Quick Actions" />
                <div className="faculty-quick-actions">
                  <Link to="/faculty/students" className="faculty-quick-action tone-blue"><Icon name="students" /><strong>My Students</strong><small>View assigned students</small><Icon name="chevron" className="faculty-quick-action__arrow" /></Link>
                  <Link to="/faculty/assessments/upload" className="faculty-quick-action tone-green"><Icon name="assessment" /><strong>Create Assessment</strong><small>Upload or create a test</small><Icon name="chevron" className="faculty-quick-action__arrow" /></Link>
                  <Link to="/faculty/assessments" className="faculty-quick-action tone-purple"><Icon name="grid" /><strong>Assessments</strong><small>Manage assessments</small><Icon name="chevron" className="faculty-quick-action__arrow" /></Link>
                  <Link to="/faculty/results" className="faculty-quick-action tone-orange"><Icon name="score" /><strong>Results</strong><small>Review assessment results</small><Icon name="chevron" className="faculty-quick-action__arrow" /></Link>
                </div>
              </article>
            </section>

            <section className="faculty-dashboard-grid faculty-dashboard-grid--bottom">
              <article className="faculty-panel faculty-panel--attention">
                <PanelHeader icon="attention" title="Students Needing Attention" action="View All" to="/faculty/students" />
                {errors.dashboard ? <p className="faculty-panel__state">{errors.dashboard}</p> : attentionStudents.length ? (
                  <div className="faculty-table-scroll">
                    <table className="faculty-attention-table">
                      <thead><tr><th>Student</th><th>Last score</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                        {attentionStudents.map((student, index) => {
                          const atRisk = student.status === 'At Risk'
                          return (
                            <tr key={student.studentId || `${student.studentName}-${index}`}>
                              <td><span className={`faculty-student-initial faculty-student-initial--${index % 4}`}>{(student.studentName || 'S').trim().charAt(0).toUpperCase()}</span><strong>{student.studentName || 'Student'}</strong></td>
                              <td>{student.lastScore === null || student.lastScore === undefined ? '—' : `${student.lastScore}%`}</td>
                              <td><span className={`faculty-status-badge ${atRisk ? 'is-risk' : 'is-practice'}`}>{student.status || 'Needs Practice'}</span></td>
                              <td><Link className="faculty-row-action" to="/faculty/results" aria-label={`View results for ${student.studentName || 'student'}`}><Icon name="arrow" /></Link></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="faculty-panel__state">{loading ? 'Loading student interventions…' : 'No students currently flagged for intervention.'}</p>}
              </article>

              <article className="faculty-panel faculty-panel--recent">
                <PanelHeader icon="recent" title="Recent Assessments" action="View All" to="/faculty/assessments" />
                {errors.assessments ? <p className="faculty-panel__state">{errors.assessments}</p> : recentAssessments.length ? (
                  <div className="faculty-recent-list">
                    {recentAssessments.map((assessment) => {
                      const attended = Number(assessment.attendedCount) || 0
                      const assigned = Number(assessment.assignedCount) || 0
                      const progress = assigned ? Math.min(100, attended / assigned * 100) : null
                      return (
                        <div className="faculty-recent-row" key={assessment._id}>
                          <div className="faculty-recent-row__main">
                            <strong>{assessment.title || 'Assessment'}</strong>
                            <span>{assessment.assessmentType || 'Assessment'} · {formatDate(assessment.createdAt)}</span>
                          </div>
                          <div className="faculty-recent-row__submission">
                            <span>{attended}{assigned ? ` / ${assigned}` : ''}</span>
                            {progress === null ? <small>Submissions</small> : <div className="faculty-progress-track"><span style={{ width: `${progress}%` }} /></div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="faculty-panel__state">{loading ? 'Loading recent assessments…' : 'No recent assessments found.'}</p>}
              </article>

              <article className="faculty-panel faculty-panel--skills">
                <PanelHeader icon="skills" title="Skill-wise Performance" action="View Results" to="/faculty/results" detail="Topic accuracy from submitted assessments" />
                {errors.dashboard ? <p className="faculty-panel__state">{errors.dashboard}</p> : skillPerformance.length ? (
                  <div className="faculty-skills-list">
                    {skillPerformance.map((skill) => {
                      const score = Number(skill.score)
                      return (
                        <div className="faculty-skill-row" key={skill.category}>
                          <div className="faculty-skill-row__meta"><span>{skill.category}</span><strong>{Number.isFinite(score) ? `${Math.round(score)}%` : '—'}</strong></div>
                          <div className="faculty-progress-track"><span style={{ width: `${Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="faculty-panel__state">{loading ? 'Loading skill analytics…' : 'No topic-level score analytics are available yet.'}</p>}
                {skillPerformance.length > 0 && <p className="faculty-panel__footnote">Weighted by the number of questions in submitted results.</p>}
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
