import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { api } from '../../api'
import { formatReadinessPercentage } from '../../readinessUtils'
import './Dashboard.css'

const dashboardEndpoints = [
  ['dashboard', '/dashboard/student'],
  ['assessments', '/assessment/my'],
  ['coding', '/student/coding-profile'],
  ['roadmap', '/roadmap/me'],
]

const routeSearchItems = [
  { title: 'Dashboard', detail: 'Student Portal', to: '/student' },
  { title: 'Assessments', detail: 'Assigned assessments', to: '/student/assessments' },
  { title: 'Resume AI', detail: 'Upload and analyze your resume', to: '/student/resume' },
  { title: 'Coding Profile', detail: 'Connected coding platforms', to: '/student/coding' },
  { title: 'Learning Roadmap', detail: 'Personalized learning plan', to: '/student/roadmap' },
  { title: 'AI Mentor', detail: 'Career guidance', to: '/student/ai-chat' },
  { title: 'Notifications', detail: 'Updates and assignments', to: '/student/notifications' },
  { title: 'Announcements', detail: 'College announcements', to: '/student/announcements' },
  { title: 'Profile', detail: 'Student information', to: '/student/profile' },
]

const quotes = [
  'Small, consistent steps create remarkable progress.',
  'Preparation turns opportunity into momentum.',
  'Build the skills your future self will rely on.',
]

const numberOrNull = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') continue
    const result = Number(value)
    if (Number.isFinite(result)) return result
  }
  return null
}

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0))

const formatDate = (value) => {
  if (!value) return 'Date not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date not set'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const getRoadmapItems = (roadmap) => {
  const items = [
    ...(Array.isArray(roadmap?.roadmapItems) ? roadmap.roadmapItems : []),
    ...(Array.isArray(roadmap?.recommendations?.courses) ? roadmap.recommendations.courses : []),
    ...(Array.isArray(roadmap?.recommendations?.practiceTopics) ? roadmap.recommendations.practiceTopics : []),
    ...(Array.isArray(roadmap?.recommendations?.learningResources) ? roadmap.recommendations.learningResources : []),
    ...(Array.isArray(roadmap?.recommendations?.miniProjects) ? roadmap.recommendations.miniProjects : []),
  ]
  const seen = new Set()
  return items.filter((item) => {
    const key = item?._id || item?.title
    if (!key || seen.has(String(key))) return false
    seen.add(String(key))
    return true
  })
}

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    assessment: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h4" /></>,
    resume: <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5m-2-12-4 14" /></>,
    roadmap: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="19" r="2" /><path d="M8 5h4a4 4 0 0 1 4 4v1M8 19h4a4 4 0 0 0 4-4v-1" /></>,
    mentor: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-4-.9L4 20l1.2-3.4A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
    announcement: <><path d="m3 11 18-5v12L3 13v-2Zm0 2v4h5l2 4h4l-3-6M21 9l-2 1" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8m-8 4h6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>
}

function SectionHeading({ title, to, action = 'View All' }) {
  return (
    <div className="student-dash-heading">
      <h2>{title}</h2>
      {to && <Link to={to}>{action}<Icon name="arrow" size={16} /></Link>}
    </div>
  )
}

function MetricCard({ icon, tone, label, value, note, progress }) {
  return (
    <article className={`student-dash-metric ${tone}`}>
      <div className="student-dash-metric-top">
        <span className="student-dash-metric-icon"><Icon name={icon} /></span>
        <span className="student-dash-metric-label">{label}</span>
      </div>
      <strong className="student-dash-metric-value">{value}</strong>
      <div className="student-dash-metric-bottom">
        <span>{note}</span>
        {progress !== null && <div className="student-dash-track" aria-label={`${label} ${progress}%`}><span style={{ width: `${clampPercent(progress)}%` }} /></div>}
      </div>
    </article>
  )
}

function EmptyState({ children, to, action }) {
  return (
    <div className="student-dash-empty">
      <p>{children}</p>
      {to && <Link className="student-dash-text-link" to={to}>{action}<Icon name="arrow" size={15} /></Link>}
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div className="student-dashboard" aria-label="Loading dashboard" aria-busy="true">
      <div className="student-dash-skeleton student-dash-skeleton-header" />
      <div className="student-dash-skeleton student-dash-skeleton-welcome" />
      <div className="student-dash-skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="student-dash-skeleton" key={item} />)}</div>
      <div className="student-dash-skeleton student-dash-skeleton-panel" />
      <div className="student-dash-skeleton-grid student-dash-skeleton-lower"><div className="student-dash-skeleton" /><div className="student-dash-skeleton" /></div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { unreadCount = 0 } = useOutletContext() || {}
  const [data, setData] = useState({})
  const [sectionErrors, setSectionErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      const responses = await Promise.allSettled(dashboardEndpoints.map(([, path]) => api.get(path)))
      if (!active) return

      const nextData = {}
      const nextErrors = {}
      responses.forEach((result, index) => {
        const [key, path] = dashboardEndpoints[index]
        if (result.status === 'fulfilled' && result.value.ok) {
          nextData[key] = result.value.data?.data ?? null
        } else {
          nextErrors[key] = true
          console.warn(`Student dashboard section failed to load: ${key} (${path})`)
        }
      })
      setData(nextData)
      setSectionErrors(nextErrors)
      setLoading(false)
    }

    loadDashboard().catch(() => {
      if (!active) return
      console.warn('Student dashboard request batch failed.')
      setSectionErrors(Object.fromEntries(dashboardEndpoints.map(([key]) => [key, true])))
      setLoading(false)
    })

    return () => { active = false }
  }, [])

  if (loading) return <LoadingDashboard />

  const dashboard = data.dashboard || {}
  const profilePayload = user || {}
  const student = dashboard.student || {}
  const readiness = dashboard.overallPlacementReadiness || dashboard.placementReadiness || {}
  const coding = data.coding || profilePayload.codingProfile || {}
  const roadmap = data.roadmap || dashboard.learningRoadmapSummary || null
  const assessmentResponse = data.assessments?.assessments ? data.assessments : data.assessments?.data || {}
  const allAssessments = Array.isArray(assessmentResponse.assessments) ? assessmentResponse.assessments : []
  const now = currentTime || 0
  const isRelevant = (assessment) => assessment.attempted || (
    !assessment.expired && assessment.requestStatus !== 'Cancelled' &&
    (!assessment.endDate || new Date(assessment.endDate).getTime() >= now)
  )
  const relevantAssessments = allAssessments.filter(isRelevant)
  const completedAssessments = allAssessments.filter((assessment) => assessment.attempted).length
  const upcomingAssessments = allAssessments
    .filter((assessment) => !assessment.attempted && !assessment.expired && assessment.requestStatus !== 'Cancelled')
    .filter((assessment) => !assessment.endDate || new Date(assessment.endDate).getTime() >= now)
    .sort((left, right) => new Date(left.startDate || 0) - new Date(right.startDate || 0))
    .slice(0, 4)

  const studentName = profilePayload.fullName || student.name || user?.fullName || user?.name || 'Student'
  const department = profilePayload.department || student.department || user?.department || ''
  const year = profilePayload.year || student.year || user?.year
  const academicLine = [department, year ? `Year ${year}` : ''].filter(Boolean).join(' · ')
  const readinessScore = numberOrNull(readiness.score)
  const profileProgress = numberOrNull(profilePayload.profileCompletion)
  const resumeScore = numberOrNull(dashboard.resumeSummary?.resumeScore, dashboard.resumeScore, student.resumeScore)
  const resumeUploaded = Boolean(profilePayload.resume || resumeScore !== null)
  const verifiedPlatforms = (coding.platforms || []).filter((platform) => platform.profileVerified)
  const hasCodingStats = verifiedPlatforms.length > 0 || Number(coding.totalProblemsSolved) > 0 || Number(coding.score) > 0
  const codingScore = hasCodingStats ? numberOrNull(coding.score, dashboard.codingSummary?.score) : null
  const assessmentRatio = relevantAssessments.length ? Math.round((completedAssessments / relevantAssessments.length) * 100) : null
  const roadmapProgress = numberOrNull(roadmap?.progress?.completionPercentage, roadmap?.progress?.percentage)
  const roadmapItems = getRoadmapItems(roadmap)
  const recommendedItems = roadmapItems
    .filter((item) => item.status !== 'Completed')
    .concat(roadmapItems.filter((item) => item.status === 'Completed'))
    .slice(0, 4)
  const skillPerformance = Array.isArray(dashboard.skillPerformance) ? dashboard.skillPerformance : []
  const quote = quotes[new Date().getDate() % quotes.length]
  const initials = studentName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const insights = []
  const weakestSkill = [...skillPerformance].sort((left, right) => left.score - right.score)[0]
  const strongestSkill = [...skillPerformance].sort((left, right) => right.score - left.score)[0]
  if (resumeScore !== null && resumeScore < 70) insights.push({ title: 'Resume score can improve', detail: `Your latest resume analysis scored ${resumeScore}%.`, to: '/student/resume', action: 'Review resume' })
  if (weakestSkill && weakestSkill.score < 70) insights.push({ title: `Practice ${weakestSkill.category}`, detail: `Assessment topic accuracy is ${weakestSkill.score}%.`, to: '/student/assessments', action: 'Practice now' })
  if (upcomingAssessments.length > 0) insights.push({ title: 'Assessment coming up', detail: `${upcomingAssessments.length} active assessment${upcomingAssessments.length === 1 ? '' : 's'} available to take.`, to: '/student/assessments', action: 'View assessments' })
  if (codingScore === null) insights.push({ title: 'Connect a coding profile', detail: 'Verified coding activity will appear here after you connect a platform.', to: '/student/coding', action: 'Connect profile' })
  if (roadmapItems.some((item) => item.status === 'Pending' || item.status === 'In Progress')) {
    const nextItem = roadmapItems.find((item) => item.status === 'In Progress') || roadmapItems.find((item) => item.status === 'Pending')
    insights.push({ title: 'Continue your roadmap', detail: `Next up: ${nextItem.title}.`, to: '/student/roadmap', action: 'Open roadmap' })
  }
  if (strongestSkill && strongestSkill.score >= 70) insights.push({ title: `Strongest area: ${strongestSkill.category}`, detail: `Current assessment topic accuracy is ${strongestSkill.score}%.`, to: '/student/assessments', action: 'See performance' })

  const roadmapSearchItems = roadmapItems.map((item) => ({ title: item.title, detail: `Roadmap · ${item.status || 'Pending'}`, to: '/student/roadmap' }))
  const assessmentSearchItems = upcomingAssessments.map((item) => ({ title: item.title, detail: `Assessment · ${item.assessmentType || 'Assigned'}`, to: '/student/assessments' }))
  const searchItems = [...routeSearchItems, ...assessmentSearchItems, ...roadmapSearchItems]
  const searchResults = query.trim()
    ? searchItems.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : []
  const partialFailure = Object.keys(sectionErrors).length > 0
  const availableForStart = (assessment) => {
    const startsAt = assessment.startDate ? new Date(assessment.startDate).getTime() : 0
    const endsAt = assessment.endDate ? new Date(assessment.endDate).getTime() : Number.POSITIVE_INFINITY
    return !assessment.attempted && !assessment.expired && assessment.requestStatus !== 'Cancelled' && startsAt <= now && endsAt >= now
  }

  return (
    <div className="student-dashboard">
      <header className="student-dash-topbar">
        <div>
          <span className="student-dash-overline">STUDENT OVERVIEW</span>
          <h1>Dashboard</h1>
        </div>
        <div className="student-dash-topbar-actions">
          <div className="student-dash-search-wrap">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }}
              placeholder="Search assessments, topics, or features..."
              aria-label="Search assessments, topics, or features"
            />
            {searchResults.length > 0 && (
              <div className="student-dash-search-results">
                {searchResults.map((item) => (
                  <Link key={`${item.to}-${item.title}-${item.detail}`} to={item.to} onClick={() => setQuery('')}>
                    <span>{item.title}<small>{item.detail}</small></span><Icon name="arrow" size={15} />
                  </Link>
                ))}
              </div>
            )}
            {query.trim() && searchResults.length === 0 && <div className="student-dash-search-empty">No matching sections or items.</div>}
          </div>
          <Link className="student-dash-bell" to="/student/notifications" aria-label={`${unreadCount} unread notifications`}>
            <Icon name="bell" size={20} />
            {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
          <Link className="student-dash-user" to="/student/profile" aria-label="Open student profile">
            <span className="student-dash-avatar">{initials || 'S'}</span>
            <span className="student-dash-user-copy"><strong>{studentName}</strong><small>{academicLine || profilePayload.email || user?.email || 'Student account'}</small></span>
          </Link>
        </div>
      </header>

      {partialFailure && <div className="student-dash-partial-error" role="status">Some dashboard details could not load. Other available sections are still shown.</div>}

      <section className="student-dash-welcome">
        <div>
          <span className="student-dash-eyebrow">YOUR PLACEMENT JOURNEY</span>
          <h2>Welcome back, {studentName}!</h2>
          <p>Track your progress, improve your skills, and get ready for your dream career.</p>
        </div>
        <aside className="student-dash-quote">
          <span><Icon name="spark" size={17} /> A thought for today</span>
          <p>“{quote}”</p>
        </aside>
      </section>

      <section className="student-dash-metrics" aria-label="Key performance indicators">
        <MetricCard icon="chart" tone="blue" label="Placement Readiness" value={formatReadinessPercentage(readinessScore)} note={readiness.level || 'Current score'} progress={readinessScore} />
        <MetricCard icon="assessment" tone="green" label="Assessments Completed" value={`${completedAssessments} / ${relevantAssessments.length}`} note={relevantAssessments.length ? 'Completed / relevant' : 'No assigned assessments'} progress={assessmentRatio} />
        <MetricCard icon="resume" tone="purple" label="Resume Score" value={resumeScore === null ? '—' : `${Math.round(resumeScore)}%`} note={!resumeUploaded ? 'Resume not uploaded' : resumeScore === null ? 'Analysis not available' : 'Latest stored analysis'} progress={resumeScore} />
        <MetricCard icon="code" tone="orange" label="Coding Score" value={codingScore === null ? '—' : `${Math.round(codingScore)}%`} note={codingScore === null ? 'No verified coding stats' : `${coding.totalProblemsSolved || 0} problems solved`} progress={codingScore} />
      </section>

      <section className="student-dash-panel student-dash-journey">
        <div className="student-dash-heading"><div><span className="student-dash-overline">MILESTONES</span><h2>Your progress</h2></div><Link to="/student/profile">Complete your profile<Icon name="arrow" size={16} /></Link></div>
        <div className="student-dash-steps">
          {[
            { label: 'Profile', value: profileProgress === null ? 'Not available' : `${Math.round(profileProgress)}% complete`, complete: profileProgress === 100, to: '/student/profile' },
            { label: 'Assessments', value: relevantAssessments.length ? `${completedAssessments}/${relevantAssessments.length} completed` : 'No assigned assessments', complete: relevantAssessments.length > 0 && completedAssessments === relevantAssessments.length, to: '/student/assessments' },
            { label: 'Resume', value: resumeScore === null ? (resumeUploaded ? 'Analysis pending' : 'Not uploaded') : `${Math.round(resumeScore)}% score`, complete: resumeScore !== null, to: '/student/resume' },
            { label: 'Coding', value: codingScore === null ? 'Not connected' : `${Math.round(codingScore)}% score`, complete: codingScore !== null, to: '/student/coding' },
            { label: 'Placement ready', value: readinessScore === null ? 'Not calculated' : `${formatReadinessPercentage(readinessScore)} readiness`, complete: readinessScore !== null && readinessScore >= 70, to: '/student' },
          ].map((step, index) => (
            <Link className={`student-dash-step${step.complete ? ' is-complete' : ''}`} key={step.label} to={step.to}>
              <span className="student-dash-step-marker">{step.complete ? <Icon name="check" size={16} /> : String(index + 1).padStart(2, '0')}</span>
              <span><strong>{step.label}</strong><small>{step.value}</small></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="student-dash-columns">
        <section className="student-dash-panel">
          <SectionHeading title="Skill-wise Performance" to="/student/assessments" action="Assessment history" />
          {skillPerformance.length === 0 ? (
            <EmptyState to="/student/assessments" action="Browse assessments">Assessment category scores will appear after you complete assessments with topic results.</EmptyState>
          ) : (
            <div className="student-dash-skill-list">
              {skillPerformance.map((skill) => (
                <div className="student-dash-skill" key={skill.category}>
                  <div><strong>{skill.category}</strong><span>{skill.questionCount} questions</span><b>{skill.score}%</b></div>
                  <div className="student-dash-track"><span style={{ width: `${clampPercent(skill.score)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="student-dash-panel">
          <SectionHeading title="Upcoming Assessments" to="/student/assessments" />
          {upcomingAssessments.length === 0 ? (
            <EmptyState to="/student/assessments" action="View assessments">No active or upcoming assessments are assigned right now.</EmptyState>
          ) : (
            <div className="student-dash-assessment-list">
              {upcomingAssessments.map((assessment) => {
                const canStart = availableForStart(assessment)
                const startDate = assessment.startDate ? new Date(assessment.startDate) : null
                return (
                  <article className="student-dash-assessment" key={assessment._id}>
                    <div className="student-dash-assessment-date"><strong>{startDate && !Number.isNaN(startDate.getTime()) ? startDate.toLocaleDateString(undefined, { day: '2-digit' }) : '—'}</strong><span>{startDate && !Number.isNaN(startDate.getTime()) ? startDate.toLocaleDateString(undefined, { month: 'short' }) : 'DATE'}</span></div>
                    <div className="student-dash-assessment-info"><h3>{assessment.title}</h3><p>{assessment.assessmentType || 'Assessment'} · {assessment.duration || '—'} min</p><small><Icon name="clock" size={14} />{formatDate(assessment.startDate)}</small></div>
                    {canStart
                      ? <Link className="student-dash-button" to={`/student/assessments/${assessment._id}/take`}>Start</Link>
                      : <button className="student-dash-button is-disabled" type="button" disabled>{startDate && startDate.getTime() > now ? 'Starts soon' : 'View'}</button>}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="student-dash-columns">
        <section className="student-dash-panel">
          <SectionHeading title="AI Insights" to="/student/resume" action="Resume AI" />
          {insights.length === 0 ? (
            <EmptyState to="/student/assessments" action="Get started">Complete your assessments and resume analysis to receive personalized AI insights.</EmptyState>
          ) : (
            <div className="student-dash-insights">
              {insights.slice(0, 5).map((insight) => (
                <article className="student-dash-insight" key={insight.title}>
                  <span className="student-dash-insight-icon"><Icon name="spark" size={17} /></span>
                  <div><strong>{insight.title}</strong><p>{insight.detail}</p><Link to={insight.to}>{insight.action}<Icon name="arrow" size={14} /></Link></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="student-dash-panel">
          <SectionHeading title="Recommended Learning" to="/student/roadmap" />
          {!roadmap || roadmapItems.length === 0 ? (
            <EmptyState to="/student/roadmap" action="Create roadmap">Create your personalized learning roadmap to see recommended next steps.</EmptyState>
          ) : (
            <>
              <div className="student-dash-roadmap-progress"><span>{roadmap.careerGoal || 'Learning roadmap'}</span><strong>{roadmapProgress === null ? 'Progress not available' : `${Math.round(roadmapProgress)}% overall`}</strong></div>
              <div className="student-dash-learning-list">
                {recommendedItems.map((item) => (
                  <Link className="student-dash-learning-item" to="/student/roadmap" key={item._id || item.title}>
                    <span className="student-dash-learning-icon"><Icon name="book" size={18} /></span>
                    <span className="student-dash-learning-copy"><strong>{item.title}</strong><small>{item.category || item.priority || 'Roadmap item'}</small></span>
                    <span className={`student-dash-status status-${String(item.status || 'Pending').toLowerCase().replaceAll(' ', '-')}`}>{item.status || 'Pending'}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="student-dash-panel student-dash-quick-panel">
        <SectionHeading title="Quick Access" />
        <div className="student-dash-quick-grid">
          {[
            { title: 'Take Assessment', detail: 'Start an assigned test', icon: 'assessment', to: '/student/assessments', tone: 'blue' },
            { title: 'Analyze Resume', detail: 'Get AI feedback', icon: 'resume', to: '/student/resume', tone: 'purple' },
            { title: 'Coding Profile', detail: 'Connect and analyze', icon: 'code', to: '/student/coding', tone: 'orange' },
            { title: 'Learning Roadmap', detail: 'Follow your plan', icon: 'roadmap', to: '/student/roadmap', tone: 'green' },
            { title: 'AI Mentor', detail: 'Get career guidance', icon: 'mentor', to: '/student/ai-chat', tone: 'purple' },
            { title: 'Notifications', detail: `${unreadCount} new update${unreadCount === 1 ? '' : 's'}`, icon: 'bell', to: '/student/notifications', tone: 'blue' },
          ].map((action) => (
            <Link className={`student-dash-quick-action ${action.tone}`} to={action.to} key={action.title}>
              <span><Icon name={action.icon} size={19} /></span>
              <span><strong>{action.title}</strong><small>{action.detail}</small></span>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="student-dash-readiness-footer">
        <div className="student-dash-readiness-ring" style={{ '--readiness': `${clampPercent(readinessScore)}%` }}>
          <span>{formatReadinessPercentage(readinessScore)}</span>
        </div>
        <div><span className="student-dash-overline">PLACEMENT READINESS</span><h2>{readiness.level || 'Your next step starts here'}</h2><p>{readiness.explanation || 'Your readiness score will reflect your profile, resume, and assessment progress.'}</p></div>
        <Link to="/student/readiness" aria-label="View Details">
          View Details<Icon name="arrow" size={16} />
        </Link>
      </section>
    </div>
  )
}