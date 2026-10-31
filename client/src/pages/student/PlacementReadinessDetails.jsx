import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import './PlacementReadinessDetails.css'

const pageEndpoints = [
  ['dashboard', '/dashboard/student'],
  ['profile', '/student/profile'],
  ['coding', '/student/coding-profile'],
]

const componentDetails = {
  cgpa: {
    title: 'CGPA',
    fullTitle: 'Academic Performance',
    shortTitle: 'Academics',
    icon: 'academic',
    tone: 'academic',
    route: '/student/profile',
    action: 'View Academic Details',
    actionLabel: 'Update',
  },
  resume: {
    title: 'Resume',
    shortTitle: 'Resume',
    icon: 'resume',
    tone: 'resume',
    route: '/student/resume',
    action: 'View Resume Analysis',
    actionLabel: 'Update',
  },
  assessment: {
    title: 'Assessment',
    fullTitle: 'Assessments',
    shortTitle: 'Assessments',
    icon: 'assessment',
    tone: 'assessment',
    route: '/student/assessment-history',
    action: 'View Assessment History',
    actionLabel: 'Start Now',
  },
  technicalSkills: {
    title: 'Technical Skills',
    shortTitle: 'Skills',
    icon: 'code',
    tone: 'skills',
    route: '/student/roadmap',
    action: 'View Skill Analysis',
    actionLabel: 'View Skills',
  },
  codingProfile: {
    title: 'Coding Profile',
    shortTitle: 'Coding',
    icon: 'chart',
    tone: 'coding',
    route: '/student/coding',
    action: 'View Coding Analytics',
    actionLabel: 'Practice',
  },
}

const percentValue = (value) => (
  value !== null && value !== undefined && value !== '' && typeof value !== 'boolean'
    && Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Number(value)))
    : null
)

const hasNumber = (value) => (
  value !== null && value !== undefined && value !== ''
  && typeof value !== 'boolean' && Number.isFinite(Number(value))
)

const formatPercent = (value) => {
  const score = percentValue(value)
  if (score === null) return '—'
  return `${Number.isInteger(score) ? score : score.toFixed(2)}%`
}

const uniqueStrings = (items) => [...new Map(
  (Array.isArray(items) ? items : [])
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => [item.trim().toLocaleLowerCase(), item.trim()])
).values()]

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    back: <><path d="M19 12H5m7 7-7-7 7-7" /></>,
    academic: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 2.4 8.5 2.4 12 0v-5M22 9v6" /></>,
    resume: <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    assessment: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h4" /></>,
    skills: <><path d="m12 3 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3Z" /><path d="m19 16 .7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" /></>,
    code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-2-12-4 14" /></>,
    chart: <><path d="M3 3v18h18M8 15l4-4 4 3 5-7" /><circle cx="8" cy="15" r="1" /><circle cx="12" cy="11" r="1" /><circle cx="16" cy="14" r="1" /><circle cx="21" cy="7" r="1" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" /></>,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M4 5v4h4" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m15 9 6-6m-4 0h4v4" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    bulb: <><path d="M9 18h6m-5 4h4m-6.5-7.5A7 7 0 1 1 16.5 14c-.8.6-1.3 1.5-1.5 2.5h-6c-.2-1-.7-1.9-1.5-2.5Z" /><path d="M12 4v2m-5.5.5 1.4 1.4m8.2-1.4-1.4 1.4" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}

function MetricBar({ score, label }) {
  const normalizedScore = percentValue(score)
  return (
    <div className="readiness-metric-bar" role="img" aria-label={`${label}: ${formatPercent(normalizedScore)}`}>
      <span style={{ width: `${normalizedScore ?? 0}%` }} />
    </div>
  )
}

function RadarChart({ factors }) {
  const center = { x: 150, y: 122 }
  const radius = 76
  const angleFor = (index) => (Math.PI * 2 * index / factors.length) - Math.PI / 2
  const pointFor = (index, value) => {
    const angle = angleFor(index)
    const distance = radius * (percentValue(value) ?? 0) / 100
    return `${center.x + Math.cos(angle) * distance},${center.y + Math.sin(angle) * distance}`
  }
  const gridPoints = (scale) => factors.map((_, index) => {
    const angle = angleFor(index)
    const distance = radius * scale
    return `${center.x + Math.cos(angle) * distance},${center.y + Math.sin(angle) * distance}`
  }).join(' ')
  const targetScore = factors.length ? percentValue(factors[0].targetScore) : null
  const target = targetScore === null
    ? null
    : factors.map((_, index) => pointFor(index, targetScore)).join(' ')

  return (
    <div className="readiness-radar-wrap">
      <svg className="readiness-radar" viewBox="0 0 300 244" role="img" aria-label="Radar chart of current readiness scores compared with the target">
        {[0.25, 0.5, 0.75, 1].map((scale) => <polygon key={scale} points={gridPoints(scale)} />)}
        {factors.map((factor, index) => {
          const angle = angleFor(index)
          return <line key={factor.key} x1={center.x} y1={center.y} x2={center.x + Math.cos(angle) * radius} y2={center.y + Math.sin(angle) * radius} />
        })}
        {target && <polygon className="readiness-radar-target" points={target} />}
        <polygon className="readiness-radar-value" points={factors.map((factor, index) => pointFor(index, factor.score)).join(' ')} />
        {factors.map((factor, index) => {
          const [cx, cy] = pointFor(index, factor.score).split(',')
          return <circle key={factor.key} cx={cx} cy={cy} r="3.5" />
        })}
        {factors.map((factor, index) => {
          const angle = angleFor(index)
          const x = center.x + Math.cos(angle) * (radius + 15)
          const y = center.y + Math.sin(angle) * (radius + 15)
          return <text key={`label-${factor.key}`} x={x} y={y} textAnchor={x < center.x - 8 ? 'end' : x > center.x + 8 ? 'start' : 'middle'}>{componentDetails[factor.key]?.shortTitle || factor.componentName}</text>
        })}
      </svg>
      <div className="readiness-radar-legend">
        <span><i className="legend-current" />Current</span>
        {targetScore !== null && <span><i className="legend-target" />Target {formatPercent(targetScore)}</span>}
      </div>
      <div className="readiness-radar-scores">{factors.map((factor) => <span key={factor.key}>{componentDetails[factor.key]?.shortTitle || factor.componentName}<strong>{factor.available ? formatPercent(factor.score) : 'N/A'}</strong></span>)}</div>
    </div>
  )
}

function DetailCard({ factor, children }) {
  const detail = componentDetails[factor.key]
  return (
    <article className={`readiness-detail-card tone-${detail.tone}`}>
      <header className="readiness-detail-heading">
        <span className="readiness-detail-icon"><Icon name={detail.icon} size={16} /></span>
        <div><h3>{detail.title}<small>{factor.weight}%</small></h3></div>
        <strong className="readiness-detail-score">{formatPercent(factor.available ? factor.score : null)}</strong>
      </header>
      <MetricBar score={factor.score} label={detail.title} />
      {children}
      <Link className="readiness-inline-link" to={detail.route}>{detail.action}<Icon name="arrow" size={13} /></Link>
    </article>
  )
}

function InsightItem({ icon, tone, title, description, to }) {
  const content = (
    <>
      <span className={`readiness-insight-icon tone-${tone}`}><Icon name={icon} size={15} /></span>
      <span className="readiness-insight-copy"><strong>{title}</strong><small>{description}</small></span>
      {to && <Icon name="arrow" size={13} />}
    </>
  )
  return to
    ? <Link className={`readiness-insight-item tone-${tone}`} to={to}>{content}</Link>
    : <div className={`readiness-insight-item tone-${tone}`}>{content}</div>
}

function DetailPoint({ children, positive = false }) {
  return (
    <li className={positive ? 'point-positive' : 'point-improve'}>
      <Icon name={positive ? 'check' : 'alert'} size={13} />
      <span>{children}</span>
    </li>
  )
}

function LoadingState() {
  return <div className="readiness-page-loading" role="status" aria-busy="true">Loading your placement readiness details…</div>
}

export default function PlacementReadinessDetails() {
  const { user } = useAuth()
  const [data, setData] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchDetails = useCallback(async (isActive = () => true) => {
    const responses = await Promise.allSettled(pageEndpoints.map(([, path]) => api.get(path)))
    const nextData = {}
    const nextErrors = {}
    responses.forEach((result, index) => {
      const [key, path] = pageEndpoints[index]
      if (result.status === 'fulfilled' && result.value.ok && result.value.data?.data) {
        nextData[key] = result.value.data.data
      } else {
        nextErrors[key] = result.status === 'fulfilled'
          ? result.value.data?.message || `Unable to load ${key} details.`
          : `Unable to load ${key} details. Check your connection and try again.`
        console.warn(`Placement readiness details failed to load: ${key} (${path})`)
      }
    })
    if (!isActive()) return
    setData(nextData)
    setErrors(nextErrors)
    if (!nextData.dashboard) {
      setError(nextErrors.dashboard || 'Placement readiness details are unavailable right now.')
    } else {
      setError('')
    }
    setLoading(false)
  }, [])

  const refreshDetails = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchDetails()
    } finally {
      setRefreshing(false)
    }
  }, [fetchDetails])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => fetchDetails(() => active))
    return () => { active = false }
  }, [fetchDetails, user?.id])

  const dashboard = data.dashboard || {}
  const profile = data.profile?.student || {}
  const coding = data.coding || {}
  const readiness = dashboard.overallPlacementReadiness || {}
  const factors = useMemo(() => (
    Array.isArray(readiness.breakdown)
      ? readiness.breakdown
      : Array.isArray(dashboard.placementReadinessBreakdown)
        ? dashboard.placementReadinessBreakdown
        : []
  ), [dashboard.placementReadinessBreakdown, readiness.breakdown])
  const score = percentValue(readiness.score)
  const targetScore = percentValue(readiness.targetScore)
  const atTarget = score !== null && targetScore !== null && score >= targetScore
  const strongest = factors.filter((factor) => factor.available && percentValue(factor.score) !== null)
    .reduce((best, factor) => !best || factor.score > best.score ? factor : best, null)
  const improvementAreas = factors.filter((factor) => !factor.available || percentValue(factor.score) < targetScore)
    .sort((left, right) => (percentValue(left.score) ?? -1) - (percentValue(right.score) ?? -1))
  const actions = improvementAreas.map((factor) => {
    const detail = componentDetails[factor.key]
    return {
      ...detail,
      key: factor.key,
      priority: !factor.available || percentValue(factor.score) < 40 ? 'High' : 'Medium',
      note: factor.available
        ? `Current score ${formatPercent(factor.score)}. Target: ${formatPercent(targetScore)}.`
        : 'No score is available yet. Complete or update this section.',
    }
  })
  const assessmentSummary = dashboard.assessmentSummary || {}
  const skillPerformance = Array.isArray(dashboard.skillPerformance) ? dashboard.skillPerformance : []
  const strongTopics = [...skillPerformance].filter((topic) => hasNumber(topic.score)).sort((a, b) => b.score - a.score).slice(0, 3)
  const weakTopics = [...skillPerformance].filter((topic) => hasNumber(topic.score)).sort((a, b) => a.score - b.score).slice(0, 3)
  const skills = uniqueStrings(profile.skills)
  const roadmapGaps = Array.isArray(dashboard.skillGapSummary) ? dashboard.skillGapSummary : []
  const resumeAnalysis = profile.resumeAnalysis || {}
  const resumeStrengths = uniqueStrings(resumeAnalysis.strengths)
  const resumeWeaknesses = uniqueStrings(resumeAnalysis.weaknesses)
  const resumeMissingSkills = uniqueStrings(
    Array.isArray(resumeAnalysis.missingSkills)
      ? resumeAnalysis.missingSkills
      : [...(resumeAnalysis.missingSkills?.required || []), ...(resumeAnalysis.missingSkills?.preferred || [])]
  )
  const platformLabels = { leetcode: 'LeetCode', codechef: 'CodeChef', hackerrank: 'HackerRank', codeforces: 'Codeforces', github: 'GitHub' }
  const platforms = Array.isArray(coding.platforms) ? coding.platforms : []
  const connectedPlatforms = platforms.filter((platform) => platform.profileUrl || platform.profileVerified)
  const studentName = profile.fullName || dashboard.student?.name || user?.fullName || user?.name || 'Student'
  const latestAnalysisDate = formatDate(profile.lastResumeAnalysisDate)
  const readinessMessage = error
    ? 'Your latest readiness result could not be loaded.'
    : atTarget
      ? 'You have reached the high-readiness benchmark. Keep each area moving forward.'
      : improvementAreas[0]
        ? `Focus next on ${componentDetails[improvementAreas[0].key]?.shortTitle.toLowerCase() || 'your preparation'} to move toward your ${formatPercent(targetScore)} target.`
        : 'Keep your preparation data up to date to get useful, personalized guidance.'
  const assessmentAverage = hasNumber(assessmentSummary.averageScore) ? Number(assessmentSummary.averageScore) : null
  const resumeFactor = factors.find((factor) => factor.key === 'resume')
  const codingFactor = factors.find((factor) => factor.key === 'codingProfile')
  const skillFactor = factors.find((factor) => factor.key === 'technicalSkills')
  const resumeInsight = resumeAnalysis.summary || (resumeWeaknesses.length
    ? `Focus on ${resumeWeaknesses.slice(0, 2).join(' and ')}.`
    : 'Run Resume AI to review your latest ATS feedback.')
  const codingInsight = connectedPlatforms.length
    ? `${connectedPlatforms.map((platform) => platformLabels[String(platform.platform || '').toLowerCase()] || platform.platform).join(', ')}${hasNumber(coding.totalProblemsSolved) ? ` · ${Number(coding.totalProblemsSolved).toLocaleString()} problems solved` : ''}.`
    : 'Connect a supported profile with coding performance metrics.'
  const technicalInsight = skills.length
    ? `${skills.slice(0, 3).join(', ')}${skills.length > 3 ? ` +${skills.length - 3} more` : ''}${roadmapGaps.length ? ` · focus: ${roadmapGaps.slice(0, 2).map((gap) => gap.title || gap.domain).join(', ')}` : ''}.`
    : 'Add your technical skills and review your learning roadmap.'

  if (loading) return <LoadingState />

  if (error) {
    return (
      <div className="placement-readiness-page">
        <header className="readiness-page-header">
          <div><p className="readiness-breadcrumb">Student <span>/</span> Placement Readiness</p><h1>Placement Readiness</h1></div>
          <Link className="readiness-back-button" to="/student"><Icon name="back" />Back to Dashboard</Link>
        </header>
        <div className="readiness-error-state" role="alert">
          <strong>We couldn’t load your readiness details.</strong>
          <p>{error}</p>
          <button type="button" onClick={refreshDetails} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Try again'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="placement-readiness-page">
      <header className="readiness-page-header">
        <div>
          <p className="readiness-breadcrumb"><Link to="/student">Student</Link><span>/</span>Placement Readiness</p>
          <h1>Placement Readiness</h1>
          <p className="readiness-page-description">A clear view of your preparation across academics, resume, assessments, skills, and coding.</p>
        </div>
        <div className="readiness-header-actions">
        <Link className="readiness-back-button" to="/student"><Icon name="back" />Back to Dashboard</Link>
        </div>
      </header>

      {(errors.profile || errors.coding) && <div className="readiness-partial-error" role="status">Some profile or coding details could not be loaded. The readiness result and available data are still shown.</div>}

      <section className="readiness-overview-card">
        <div className="readiness-overview-main">
          <div className="readiness-score-ring" style={{ '--readiness-score': `${score ?? 0}%` }} role="img" aria-label={`Overall placement readiness ${formatPercent(score)}`}>
            <div><strong>{formatPercent(score)}</strong><span>OVERALL SCORE</span></div>
          </div>
          <div className="readiness-overview-copy">
            <div className="readiness-summary-title">
              <span className={`readiness-level-pill level-${String(readiness.level || 'low').toLowerCase()}`}>{readiness.level || 'Not available'}</span>
              <strong>{readiness.level === 'Low' ? 'Your next step starts here' : 'You are on the right track!'}</strong>
            </div>
            <p className="readiness-summary-copy">{readinessMessage}</p>
            <p className="readiness-summary-detail">{studentName}, keep building on your latest saved preparation data.</p>
            {targetScore !== null && (
              <div className="readiness-summary-progress">
                <div><span>Current progress</span><strong>{formatPercent(score)}</strong></div>
                <MetricBar score={score} label="Current readiness" />
                <span>{atTarget ? 'Target reached' : `${formatPercent(Math.max(0, targetScore - (score ?? 0)))} to target`}</span>
              </div>
            )}
          </div>
          {targetScore !== null && (
            <div className="readiness-target-summary">
              <span className="readiness-target-icon"><Icon name="target" size={22} /></span>
              <span>Target</span>
              <strong>{formatPercent(targetScore)}</strong>
            </div>
          )}
        </div>
      </section>

      <div className="readiness-main-grid">
        <section className="readiness-panel readiness-breakdown-panel">
          <div className="readiness-section-heading"><h2><Icon name="chart" size={17} />Readiness Breakdown</h2></div>
          {factors.length ? (
            <div className="readiness-factor-list">
              {factors.map((factor) => {
                const detail = componentDetails[factor.key] || { title: factor.componentName, icon: 'chart', tone: 'academic' }
                return (
                  <article className={`readiness-factor tone-${detail.tone}`} key={factor.key}>
                    <span className="readiness-factor-icon"><Icon name={detail.icon} size={16} /></span>
                    <div className="readiness-factor-name"><strong>{detail.title}</strong><small>({factor.weight}%)</small></div>
                    <MetricBar score={factor.score} label={detail.title} />
                    <strong className="readiness-factor-score">{formatPercent(factor.available ? factor.score : null)}</strong>
                  </article>
                )
              })}
            </div>
          ) : <p className="readiness-empty-inline">The readiness component breakdown is not available.</p>}
          <p className="readiness-contribution-note">Weighted factor contributions total <strong>{formatPercent(score)}</strong>.</p>
        </section>

        <section className="readiness-panel readiness-radar-panel">
          <div className="readiness-section-heading">
            <h2><Icon name="chart" size={17} />Skill Readiness Radar</h2>
          </div>
          {factors.length ? <RadarChart factors={factors.map((factor) => ({ ...factor, targetScore }))} /> : <p className="readiness-empty-inline">The component profile is not available yet.</p>}
        </section>

        <section className="readiness-panel readiness-insights-panel">
          <div className="readiness-section-heading">
            <h2><Icon name="bulb" size={17} />Key Insights</h2>
          </div>
          <div className="readiness-insight-list">
            <InsightItem
              icon={strongest ? 'check' : 'bulb'}
              tone="success"
              title={strongest ? `Strongest: ${componentDetails[strongest.key]?.shortTitle}` : 'Build your readiness profile'}
              description={strongest ? `${formatPercent(strongest.score)} current component score.` : 'Complete a section to identify your strongest area.'}
            />
            <InsightItem
              icon="alert"
              tone="info"
              title="Areas to improve"
              description={improvementAreas.length ? improvementAreas.slice(0, 3).map((factor) => componentDetails[factor.key]?.shortTitle).join(', ') : 'Available factors meet the target.'}
            />
            <InsightItem
              icon="assessment"
              tone={assessmentAverage !== null && assessmentAverage >= 60 ? 'success' : 'warning'}
              title={assessmentSummary.completedAssessments ? `${assessmentSummary.completedAssessments} assessments completed` : 'Complete more assessments'}
              description={assessmentAverage !== null ? `Average performance: ${formatPercent(assessmentAverage)}.` : 'Assessment score is unavailable until a valid assessment is completed.'}
              to="/student/assessments"
            />
            <InsightItem
              icon="resume"
              tone={resumeFactor?.available && percentValue(resumeFactor.score) >= 70 ? 'success' : 'warning'}
              title={resumeFactor?.available ? `Resume ATS: ${formatPercent(resumeFactor.score)}` : 'Improve Resume Profile'}
              description={resumeInsight}
              to="/student/resume"
            />
            <InsightItem
              icon="code"
              tone={codingFactor?.available && percentValue(codingFactor.score) >= 60 ? 'success' : 'danger'}
              title={codingFactor?.available ? `Coding: ${formatPercent(codingFactor.score)}` : 'Improve Coding Profile'}
              description={codingInsight}
              to="/student/coding"
            />
            <InsightItem
              icon="skills"
              tone={skillFactor?.available && percentValue(skillFactor.score) >= 60 ? 'success' : 'warning'}
              title={skills.length ? `${skills.length} saved technical skills` : 'Build Technical Skills'}
              description={technicalInsight}
              to="/student/roadmap"
            />
          </div>
        </section>
      </div>

      <section className="readiness-detail-section">
        <div className="readiness-section-heading"><h2><Icon name="assessment" size={17} />Detailed Component Analysis</h2></div>
        <div className="readiness-detail-grid">
          {factors.map((factor) => {
            const totalProblems = hasNumber(coding.totalProblemsSolved) ? Number(coding.totalProblemsSolved) : null
            const improvementPoints = [...resumeWeaknesses, ...resumeMissingSkills]
            const contribution = `${Number(factor.contribution).toFixed(2)} pts`

            if (factor.key === 'cgpa') {
              return <DetailCard factor={factor} key={factor.key}>
                <div className="readiness-detail-metric"><span>Current CGPA</span><strong>{hasNumber(profile.cgpa) ? `${Number(profile.cgpa).toFixed(2)} / 10` : 'Not provided'}</strong></div>
                <ul className="readiness-detail-points">
                  <DetailPoint positive={factor.available && percentValue(factor.score) >= 70}>{factor.available ? `Academic score ${formatPercent(factor.score)} · ${contribution}` : 'Add your CGPA to include academic performance.'}</DetailPoint>
                  <DetailPoint positive={factor.available && percentValue(factor.score) >= 70}>{factor.available && percentValue(factor.score) >= 70 ? 'Academic performance is a current strength.' : 'Focus on consistent results to improve this component.'}</DetailPoint>
                </ul>
              </DetailCard>
            }
            if (factor.key === 'resume') {
              return <DetailCard factor={factor} key={factor.key}>
                <div className="readiness-detail-metric"><span>Latest ATS score</span><strong>{formatPercent(factor.available ? factor.score : null)}</strong></div>
                <ul className="readiness-detail-points">
                  <DetailPoint positive={resumeStrengths.length > 0}>{resumeStrengths[0] || (latestAnalysisDate ? `Last analysis ${latestAnalysisDate}.` : 'No successful ATS analysis is available.')}</DetailPoint>
                  <DetailPoint positive={false}>{improvementPoints[0] || (factor.available ? 'Review Resume AI for more improvement feedback.' : 'Run Resume AI to receive an ATS score.')}</DetailPoint>
                </ul>
                {resumeAnalysis.summary && <p className="readiness-detail-summary">{resumeAnalysis.summary}</p>}
              </DetailCard>
            }
            if (factor.key === 'assessment') {
              return <DetailCard factor={factor} key={factor.key}>
                <div className="readiness-detail-metric"><span>Completed · average</span><strong>{assessmentSummary.completedAssessments ?? 0} · {formatPercent(factor.available ? factor.score : null)}</strong></div>
                <ul className="readiness-detail-points">
                  <DetailPoint positive={strongTopics.length > 0}>{strongTopics[0] ? `${strongTopics[0].category}: ${formatPercent(strongTopics[0].score)}` : 'Complete assessments to identify strengths.'}</DetailPoint>
                  <DetailPoint positive={false}>{weakTopics[0] ? `Practice ${weakTopics[0].category} (${formatPercent(weakTopics[0].score)}).` : 'Topic feedback is not available yet.'}</DetailPoint>
                </ul>
              </DetailCard>
            }
            if (factor.key === 'technicalSkills') {
              return <DetailCard factor={factor} key={factor.key}>
                <div className="readiness-detail-metric"><span>Skill coverage · saved</span><strong>{formatPercent(factor.available ? factor.score : null)} · {skills.length}</strong></div>
                <ul className="readiness-detail-points">
                  <DetailPoint positive={skills.length > 0}>{skills.length ? `Skills: ${skills.slice(0, 2).join(', ')}${skills.length > 2 ? ` +${skills.length - 2}` : ''}.` : 'Add technical skills to your profile.'}</DetailPoint>
                  <DetailPoint positive={false}>{roadmapGaps[0] ? `Roadmap focus: ${roadmapGaps[0].title || roadmapGaps[0].domain}.` : 'Review your roadmap for learning recommendations.'}</DetailPoint>
                </ul>
              </DetailCard>
            }
            return <DetailCard factor={factor} key={factor.key}>
              <div className="readiness-detail-metric"><span>Problems solved</span><strong>{totalProblems === null ? 'Not reported' : totalProblems.toLocaleString()}</strong></div>
              <ul className="readiness-detail-points">
                <DetailPoint positive={connectedPlatforms.length > 0}>{connectedPlatforms.length ? `${connectedPlatforms.map((platform) => platformLabels[String(platform.platform || '').toLowerCase()] || platform.platform).join(', ')} connected.` : 'Connect a supported coding profile.'}</DetailPoint>
                <DetailPoint positive={factor.available}>{factor.available ? `Performance score ${formatPercent(factor.score)} · ${contribution}.` : 'Verified coding performance is not available.'}</DetailPoint>
              </ul>
            </DetailCard>
          })}
        </div>
      </section>

      <div className="readiness-lower-grid">
        <section className="readiness-panel readiness-actions-panel">
          <div className="readiness-section-heading"><h2><Icon name="target" size={17} />Recommended Actions</h2><Link to="/student/roadmap">View Full Plan<Icon name="arrow" size={13} /></Link></div>
          {actions.length ? (
            <div className="readiness-action-list">{actions.map((action, index) => (
              <Link to={action.route} className="readiness-action" key={action.key}>
                <span className={`readiness-action-number priority-${action.priority.toLowerCase()}`}>{index + 1}</span>
                <span className="readiness-action-copy"><strong>{action.title}: {action.action}</strong><small>{action.note}</small></span>
                <span className={`readiness-priority priority-${action.priority.toLowerCase()}`}>{action.priority}</span>
                <span className="readiness-action-button">{action.actionLabel}</span>
              </Link>
            ))}</div>
          ) : <p className="readiness-empty-inline">All available factors meet the current readiness target.</p>}
        </section>

        <section className="readiness-panel readiness-timeline-panel">
          <div className="readiness-section-heading"><h2><Icon name="chart" size={17} />Placement Readiness Timeline</h2></div>
          <div className="readiness-timeline-empty">
            <span><Icon name="history" size={22} /></span>
            <strong>Historical readiness data unavailable</strong>
            <p>A progress chart will appear here when actual readiness history is available.</p>
          </div>
          <div className="readiness-timeline-legend"><span><i className="legend-current" />Actual</span>{targetScore !== null && <span><i className="legend-target" />Target {formatPercent(targetScore)}</span>}</div>
        </section>
      </div>
    </div>
  )
}
