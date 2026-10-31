import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { formatReadinessPercentage } from '../readinessUtils'
import githubLogo from '../assets/platform-icons/github.svg'
import leetCodeLogo from '../assets/platform-icons/leetcode.svg'
import codeChefLogo from '../assets/platform-icons/codechef.svg'
import hackerRankLogo from '../assets/platform-icons/hackerrank.svg'
import './StudentDetails.css'

const valueOrDash = (value) => value === null || value === undefined || value === '' ? '—' : value

const safeExternalUrl = (value) => {
  if (typeof value !== 'string') return ''
  try {
    if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return ''
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

const getUsername = (url) => {
  try {
    return new URL(safeExternalUrl(url)).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

const isAvailableNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))

function Icon({ name, size = 17 }) {
  const paths = {
    arrow: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    academic: <><path d="m2 10 10-5 10 5-10 5-10-5Z" /><path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5" /><path d="M22 10v6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.1-5.5 7-5.5s6.3 2 7 5.5" /></>,
    code: <><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m14 4-4 16" /></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7M8 15h8M8 18h6" /></>,
    book: <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v17H5.5A2.5 2.5 0 0 1 3 17.5z" /><path d="M3 17.5A2.5 2.5 0 0 1 5.5 15H20M8 7h8M8 10h6" /></>,
    chart: <><path d="M4 20V11M10 20V4M16 20v-7M22 20H2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    phone: <><path d="M7 3h10v18H7z" /><path d="M10 6h4M11 18h2" /></>,
    external: <><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  }
  return <svg className="student-details-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.chart}</svg>
}

function InfoField({ label, value }) {
  return <div className="student-details-field"><span>{label}</span><strong>{valueOrDash(value)}</strong></div>
}

function SectionCard({ id, title, icon, children, className = '', action }) {
  return (
    <section className={`student-details-card ${className}`} id={id}>
      <header className="student-details-card-heading">
        <h2><span className="student-details-section-icon"><Icon name={icon} /></span>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function MetricBar({ label, value, tone = 'blue', weight, contribution }) {
  const score = isAvailableNumber(value) ? Math.max(0, Math.min(100, Number(value))) : null
  const scoreLabel = score === null
    ? 'Unavailable'
    : weight === undefined
      ? `${score}%`
      : `${score}% · ${weight}% weight (${contribution} pts)`
  return (
    <div className={`student-details-metric tone-${tone}`}>
      <div className="student-details-metric-label"><span>{label}</span><strong>{scoreLabel}</strong></div>
      <div className="student-details-meter" role="img" aria-label={`${label}: ${score === null ? 'unavailable' : `${score}%`}`}>
        <span style={{ width: `${score ?? 0}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ children }) {
  return <p className="student-details-empty">{children}</p>
}

function DetailList({ title, items, tone = 'green' }) {
  if (!items?.length) return null
  return (
    <div className={`student-details-list list-${tone}`}>
      <h3><span><Icon name={tone === 'green' ? 'check' : 'chart'} size={13} /></span>{title}</h3>
      <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
    </div>
  )
}

const platformConfigs = [
  { key: 'github', name: 'GitHub', logo: githubLogo, accent: 'github' },
  { key: 'leetcode', name: 'LeetCode', logo: leetCodeLogo, accent: 'leetcode' },
  { key: 'codechef', name: 'CodeChef', logo: codeChefLogo, accent: 'codechef' },
  { key: 'hackerrank', name: 'HackerRank', logo: hackerRankLogo, accent: 'hackerrank' },
]

function CodingPlatformCard({ config, profile, stats }) {
  const url = safeExternalUrl(profile?.url || stats?.profileUrl)
  const username = getUsername(url)
  const statistic = (label) => stats?.statistics?.find((item) => item.label.toLowerCase() === label.toLowerCase())?.value
  const metrics = config.key === 'github'
    ? [
      ['Public repositories', statistic('Public repositories') ?? statistic('Public repos')],
      ['Followers', statistic('Followers')],
      ['Following', statistic('Following')],
      ['Contributions', statistic('Contributions')],
    ]
    : config.key === 'leetcode'
      ? [
      ['Problems solved', stats?.totalSolved ?? stats?.problemsSolved],
      ['Easy', stats?.easySolved],
      ['Medium', stats?.mediumSolved],
      ['Hard', stats?.hardSolved],
      ['Contest rating', stats?.currentRating],
    ]
      : config.key === 'codechef'
        ? [
      ['Problems solved', stats?.totalSolved ?? stats?.problemsSolved],
      ['Rating', stats?.currentRating ?? statistic('Current rating')],
      ['Global rank', statistic('Global rank')],
      ['Stars', statistic('Stars')],
    ]
        : [
      ['Problems solved', stats?.totalSolved ?? stats?.problemsSolved],
      ['Badges', stats?.badgesCount],
      ['Certificates', stats?.certificatesCount],
    ]

  const availableMetrics = metrics.filter(([, value]) => isAvailableNumber(value))
  const connected = Boolean(url)

  return (
    <article className={`student-details-platform-card platform-${config.accent}`}>
      <div className="student-details-platform-brand">
        <span className={`student-details-platform-logo logo-${config.accent}`}><img src={config.logo} alt="" /></span>
        <div><h3>{config.name}</h3><span>{connected ? (username || 'Profile connected') : 'Not connected'}</span></div>
      </div>
      {connected ? (
        <>
          {availableMetrics.length > 0 ? (
            <dl className="student-details-platform-metrics">
              {availableMetrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Number(value).toLocaleString()}</dd></div>)}
            </dl>
          ) : <p className="student-details-platform-unavailable">No stored statistics available.</p>}
          <a className="student-details-platform-action" href={url} target="_blank" rel="noreferrer">View Profile <Icon name="external" size={13} /></a>
        </>
      ) : <p className="student-details-platform-unavailable">No profile link is available.</p>}
    </article>
  )
}

export default function StudentDetails({ role }) {
  const { id } = useParams()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isAdmin = role === 'admin'
  const backPath = isAdmin ? '/admin/students' : '/faculty/students'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/${role}/students/${encodeURIComponent(id)}/details`)
      if (!response.ok) {
        setError(response.data?.message || 'Unable to load student details.')
        return
      }
      setDetails(response.data?.data || null)
      if (!response.data?.data) setError('Student details are unavailable.')
    } catch {
      setError('Unable to load student details. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [id, role])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  const student = details?.student
  const resume = details?.resume
  const roadmap = details?.roadmap
  const readiness = details?.readiness
  const codingProfile = details?.codingProfile
  const initials = String(student?.name || 'Student')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  const readinessScore = isAvailableNumber(readiness?.percentage) ? Number(readiness.percentage) : null
  const roadmapItems = Array.isArray(roadmap?.items) ? roadmap.items : []
  const assessmentHistory = Array.isArray(details?.assessmentHistory) ? details.assessmentHistory : []
  const platforms = Array.isArray(codingProfile?.platforms) ? codingProfile.platforms : []
  const codingProfiles = Array.isArray(codingProfile?.profiles) ? codingProfile.profiles : []
  const skills = Array.isArray(student?.skills) ? student.skills : []
  const platformMap = new Map(platforms.map((platform) => [platform.platform.toLowerCase(), platform]))
  const profileMap = new Map(codingProfiles.map((profile) => [profile.platform.toLowerCase(), profile]))
  const roadmapProgress = isAvailableNumber(roadmap?.progress?.completionPercentage) ? Number(roadmap.progress.completionPercentage) : null
  const readinessTone = readiness?.level?.toLowerCase() || 'unavailable'

  return (
    <main className="student-details-page">
      <nav className="student-details-breadcrumb" aria-label="Breadcrumb">
        <Link to={backPath}>{isAdmin ? 'Admin' : 'Faculty'}</Link><span>/</span>
        <Link to={backPath}>Students</Link><span>/</span><span>Student Details</span>
      </nav>

      <div className="student-details-page-heading">
        <div><h1>Student Details</h1><p>Complete profile overview, coding activity, assessment performance and placement readiness.</p></div>
        <Link className="student-details-back" to={backPath}><Icon name="arrow" size={15} />Back to Students</Link>
      </div>

      {loading ? (
        <div className="student-details-state" role="status">Loading student details…</div>
      ) : error ? (
        <div className="student-details-error" role="alert"><span>{error}</span><button type="button" onClick={() => { void load() }}>Retry</button></div>
      ) : student && (
        <>
          <section className="student-details-overview" id="overview">
            <div className="student-details-avatar" aria-hidden="true">{initials || '?'}</div>
            <div className="student-details-overview-copy">
              <div className="student-details-name-line"><h2>{valueOrDash(student.name)}</h2><span className={`student-details-verification ${student.emailVerified ? 'is-verified' : ''}`}><Icon name={student.emailVerified ? 'check' : 'shield'} size={12} />{student.emailVerified ? 'Email verified' : 'Not verified'}</span></div>
              <div className="student-details-overview-contact"><span><Icon name="user" size={14} />{valueOrDash(student.email)}</span><span><Icon name="phone" size={14} />{valueOrDash(student.phone)}</span></div>
            </div>
            <div className="student-details-overview-meta">
              <div><Icon name="academic" /><span><small>Department</small><strong>{valueOrDash(student.department)}</strong></span></div>
              <div><Icon name="academic" /><span><small>College</small><strong>{valueOrDash(student.college)}</strong></span></div>
              <div><Icon name="calendar" /><span><small>Year / Section</small><strong>{valueOrDash(student.year)} / {valueOrDash(student.section)}</strong></span></div>
            </div>
            <div className="student-details-readiness-summary">
              <div className="student-details-donut" style={{ '--readiness': `${readinessScore ?? 0}%` }}><strong>{formatReadinessPercentage(readinessScore)}</strong></div>
              <div><strong>Placement Readiness</strong><span className={`student-details-readiness-level tone-${readinessTone}`}>{valueOrDash(readiness?.level)}</span></div>
            </div>
          </section>

          <nav className="student-details-section-nav" aria-label="Student detail sections">
            {[['overview', 'Overview', 'chart'], ['academic', 'Academic', 'academic'], ['coding', 'Coding Profile', 'code'], ['resume', 'Resume', 'file'], ['roadmap', 'Learning Roadmap', 'book'], ['assessments', 'Assessments', 'chart'], ['readiness', 'Readiness', 'shield']].map(([target, label, icon]) => <a key={target} className={target === 'overview' ? 'is-active' : ''} href={`#${target}`}><Icon name={icon} size={13} />{label}</a>)}
          </nav>

          <div className="student-details-grid">
            <SectionCard id="academic" title="Personal and Academic Information" icon="user" className="student-details-academic-card">
              <div className="student-details-fields">
                <InfoField label="Full name" value={student.name} /><InfoField label="Email address" value={student.email} />
                <InfoField label="Phone number" value={student.phone} /><InfoField label="Registration number" value={student.studentId} />
                <InfoField label="Department" value={student.department} /><InfoField label="College name" value={student.college} />
                <InfoField label="Degree" value={student.degree} /><InfoField label="Current year" value={student.year} />
                <InfoField label="Current semester" value={student.semester} /><InfoField label="Section" value={student.section} />
                <InfoField label="CGPA" value={student.cgpa} /><InfoField label="Graduation year" value={student.graduationYear} />
              </div>
              {skills.length > 0 && <div className="student-details-skills"><strong>Skills</strong><div>{skills.map((skill, index) => <span className="student-details-chip" key={`${skill}-${index}`}>{skill}</span>)}</div></div>}
            </SectionCard>

            <SectionCard id="coding" title="Coding Profile & Activity" icon="code" className="student-details-coding-card" action={<span className="student-details-card-hint">Verified platform metrics</span>}>
              <div className="student-details-platform-grid">
                {platformConfigs.map((config) => <CodingPlatformCard key={config.key} config={config} profile={profileMap.get(config.name.toLowerCase()) || profileMap.get(config.key)} stats={platformMap.get(config.name.toLowerCase()) || platformMap.get(config.key)} />)}
              </div>
              <div className="student-details-activity">
                <div className="student-details-subheading"><h3><Icon name="clock" size={15} />Recent Coding Activity</h3></div>
                <EmptyState>No recent coding activity available. Connected profile summaries do not include event-level history.</EmptyState>
              </div>
            </SectionCard>

            <SectionCard id="resume" title="Resume and Resume AI" icon="file" className="student-details-resume-card">
              {resume?.uploaded ? (
                <>
                  <div className="student-details-resume-file">
                    <span className="student-details-file-icon"><Icon name="file" size={20} /></span>
                    <div><strong>{resume.fileName}</strong><span>Resume uploaded{resume.size ? ` · ${(resume.size / 1024).toFixed(0)} KB` : ''}</span></div>
                    <span className="student-details-access-label">Staff file access unavailable</span>
                  </div>
                  <div className="student-details-resume-scores">
                    <MetricBar label="ATS score" value={resume.atsScore} tone="blue" />
                    <MetricBar label="Job match" value={resume.jobMatchScore} tone="purple" />
                  </div>
                  {resume.analysisSummary && <p className="student-details-analysis-summary">{resume.analysisSummary}</p>}
                  <div className="student-details-resume-insights">
                    <DetailList title="Strengths" items={resume.strengths} tone="green" />
                    <DetailList title="Areas to improve" items={[...(resume.weaknesses || []), ...(resume.missingSkills || [])]} tone="orange" />
                  </div>
                  {resume.recommendations?.length > 0 && <DetailList title="Suggestions" items={resume.recommendations} tone="blue" />}
                </>
              ) : <EmptyState>No resume has been uploaded.</EmptyState>}
            </SectionCard>

            <SectionCard id="roadmap" title="Learning Roadmap" icon="book" className="student-details-roadmap-card">
              {roadmap ? (
                <>
                  <div className="student-details-roadmap-title">
                    <strong>{valueOrDash(roadmap.careerGoal || roadmap.summary || 'Learning roadmap')}</strong>
                    <span>{roadmapProgress === null ? 'Progress unavailable' : `${roadmapProgress}% complete`}</span>
                  </div>
                  {roadmapProgress !== null && <div className="student-details-roadmap-progress"><span style={{ width: `${Math.max(0, Math.min(100, roadmapProgress))}%` }} /></div>}
                  {roadmap?.progress && <div className="student-details-roadmap-counts"><span>{roadmap.progress.completedItems ?? 0} completed</span><span>{roadmap.progress.pendingItems ?? 0} pending</span></div>}
                  {roadmapItems.length ? <ul className="student-details-roadmap-list">{roadmapItems.map((item, index) => {
                    const isComplete = item.status?.toLowerCase() === 'completed'
                    return <li key={`${item.title}-${index}`}><span className={`student-details-roadmap-status ${isComplete ? 'is-complete' : ''}`}><Icon name={isComplete ? 'check' : 'clock'} size={13} /></span><div><strong>{item.title}</strong><span>{[item.category, item.week ? `Week ${item.week}` : '', item.status].filter(Boolean).join(' · ')}</span></div></li>
                  })}</ul> : <EmptyState>No learning topics are available in this roadmap.</EmptyState>}
                </>
              ) : <EmptyState>No learning roadmap is available.</EmptyState>}
            </SectionCard>

            <SectionCard id="assessments" title="Assessment History" icon="chart" className="student-details-assessment-card">
              {assessmentHistory.length ? <div className="student-details-table-wrap"><table className="student-details-assessment-table">
                <thead><tr><th>Assessment</th><th>Date</th><th>Score</th><th>Result</th></tr></thead>
                <tbody>{assessmentHistory.map((result) => <tr key={result.id}>
                  <td><strong>{result.name}</strong><span>{result.type || 'Assessment'}</span></td>
                  <td>{result.date ? new Date(result.date).toLocaleDateString() : '—'}</td>
                  <td><strong>{result.marksObtained} / {result.totalMarks}</strong><span>{result.percentage}%</span></td>
                  <td>{result.passed === null ? <span className="student-details-result-status is-unavailable">Not available</span> : <span className={`student-details-result-status ${result.passed ? 'is-pass' : 'is-fail'}`}>{result.passed ? 'Passed' : 'Not passed'}</span>}</td>
                </tr>)}</tbody>
              </table></div> : <EmptyState>No completed assessment results are available.</EmptyState>}
            </SectionCard>

            <SectionCard id="readiness" title="Placement Readiness Breakdown" icon="chart" className="student-details-readiness-card">
              <div className="student-details-readiness-title"><div><strong>{formatReadinessPercentage(readinessScore)}</strong><span>Overall readiness</span></div><span className={`student-details-readiness-level tone-${readinessTone}`}>{valueOrDash(readiness?.level)}</span></div>
              <MetricBar label="CGPA" value={readiness?.breakdown?.cgpa?.score} weight={readiness?.breakdown?.cgpa?.weight} contribution={readiness?.breakdown?.cgpa?.contribution} />
              <MetricBar label="Resume AI ATS" value={readiness?.breakdown?.resume?.score} weight={readiness?.breakdown?.resume?.weight} contribution={readiness?.breakdown?.resume?.contribution} tone="orange" />
              <MetricBar label="Assessment performance" value={readiness?.breakdown?.assessment?.score} weight={readiness?.breakdown?.assessment?.weight} contribution={readiness?.breakdown?.assessment?.contribution} tone="purple" />
              <MetricBar label="Technical skills" value={readiness?.breakdown?.technicalSkills?.score} weight={readiness?.breakdown?.technicalSkills?.weight} contribution={readiness?.breakdown?.technicalSkills?.contribution} tone="teal" />
              <MetricBar label="Coding profile" value={readiness?.breakdown?.codingProfile?.score} weight={readiness?.breakdown?.codingProfile?.weight} contribution={readiness?.breakdown?.codingProfile?.contribution} tone="green" />
              <p className="student-details-additional-label">Additional indicators · not scoring inputs</p>
              <MetricBar label="Roadmap progress" value={roadmapProgress} tone="teal" />
              <div className="student-details-profile-status"><span>Profile state</span><strong className={student.profileCompleted ? 'is-complete' : ''}>{student.profileCompleted ? 'Complete' : 'Incomplete'} · {student.profileCompletion}%</strong></div>
              {readiness?.explanation && <p className="student-details-readiness-explanation">{readiness.explanation}</p>}
              <p className="student-details-readiness-note">Readiness is the sum of each available component score multiplied by its weight. Unavailable components contribute zero.</p>
            </SectionCard>
          </div>
        </>
      )}
    </main>
  )
}
