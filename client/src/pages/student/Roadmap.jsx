import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import './Roadmap.css'

const statuses = ['Pending', 'In Progress', 'Completed']
const ROADMAP_VIEW_STORAGE_KEY = 'student-roadmap-view'

const readRoadmapView = (studentId) => {
  if (!studentId) return 'generated'
  try {
    const storageKey = `${ROADMAP_VIEW_STORAGE_KEY}:${studentId}`
    const storedView = localStorage.getItem(storageKey)
    if (storedView !== null && storedView !== 'search' && storedView !== 'generated') {
      localStorage.removeItem(storageKey)
    }
    return storedView === 'search' || storedView === 'generated' ? storedView : 'generated'
  } catch {
    console.warn('Unable to read the saved roadmap view preference.')
    return 'generated'
  }
}

const storeRoadmapView = (studentId, view) => {
  if (!studentId) return
  try {
    localStorage.setItem(`${ROADMAP_VIEW_STORAGE_KEY}:${studentId}`, view)
  } catch {
    console.warn('Unable to save the roadmap view preference.')
  }
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    assessment: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6m-6 4h3" /></>,
    role: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    stages: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="7" cy="5" r="2" /><circle cx="17" cy="12" r="2" /><circle cx="9" cy="19" r="2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    level: <><path d="M4 20V14h4v6m4 0V9h4v11m4 0V4h-4" /></>,
    code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5m-2-12-4 14" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h7" /></>,
    network: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="m8 7 3 8m5-8-3 8m-5-9h8" /></>,
    project: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4V2h8v2M7 10h10M7 14h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    flask: <><path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M8 15h8" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    chart: <><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
    brain: <><path d="M9 4a3 3 0 0 0-5 2 3.5 3.5 0 0 0 0 6 3 3 0 0 0 2 5 3 3 0 0 0 5 2V5a3 3 0 0 0-2-1Zm6 0a3 3 0 0 1 5 2 3.5 3.5 0 0 1 0 6 3 3 0 0 1-2 5 3 3 0 0 1-5 2V5a3 3 0 0 1 2-1Z" /><path d="M7 8h2m-4 5h4m6-5h2m-2 5h4" /></>,
    lightbulb: <><path d="M9 18h6m-5 4h4m-6.5-7.5A7 7 0 1 1 16.5 14c-.8.6-1.3 1.5-1.5 2.5h-6c-.2-1-.7-1.9-1.5-2.5Z" /><path d="M12 4v2m-5.7.3 1.4 1.4m10-.0 1.4-1.4" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.star}</svg>
}

const popularRoles = [
  { title: 'Data Analyst', icon: 'chart', tone: 'orange' },
  { title: 'Java Developer', icon: 'code', tone: 'blue' },
  { title: 'Frontend Developer', icon: 'monitor', tone: 'green' },
  { title: 'Backend Developer', icon: 'database', tone: 'purple' },
  { title: 'Machine Learning Engineer', icon: 'brain', tone: 'pink' },
]

function LearningJourneyIllustration() {
  return (
    <div className="roadmap-journey-illustration" aria-hidden="true">
      <svg className="roadmap-journey-scene" viewBox="0 0 520 300" fill="none">
        <path className="roadmap-journey-cloud cloud-one" d="M48 75c-1-11 8-20 19-20 5-14 26-15 34-2 14-3 24 7 23 19H48Z" />
        <path className="roadmap-journey-cloud cloud-two" d="M385 74c0-9 7-16 16-16 4-12 22-13 29-2 12-2 20 6 19 16h-64Z" />
        <circle cx="441" cy="220" r="48" fill="#F0EEFF" />
        <circle cx="105" cy="230" r="53" fill="#EEF5FF" />
        <path className="roadmap-journey-path-shadow" d="M83 238c61-9 76-79 148-67 46 8 60 52 108 43 39-8 52-69 100-84" />
        <path className="roadmap-journey-path" d="M83 238c61-9 76-79 148-67 46 8 60 52 108 43 39-8 52-69 100-84" />
        <g className="roadmap-journey-pin pin-one" transform="translate(91 188)">
          <path d="M15 0C6.7 0 0 6.6 0 14.8 0 26 15 39 15 39s15-13 15-24.2C30 6.6 23.3 0 15 0Z" fill="#4386EA" />
          <circle cx="15" cy="14" r="5" fill="white" />
        </g>
        <g className="roadmap-journey-pin pin-two" transform="translate(224 116)">
          <path d="M13 0C5.8 0 0 5.7 0 12.8 0 22.5 13 34 13 34s13-11.5 13-21.2C26 5.7 20.2 0 13 0Z" fill="#8B72E8" />
          <circle cx="13" cy="12" r="4.5" fill="white" />
        </g>
        <g className="roadmap-journey-pin pin-three" transform="translate(418 93)">
          <path d="M16 0C7.2 0 0 7 0 15.7 0 27.5 16 41 16 41s16-13.5 16-25.3C32 7 24.8 0 16 0Z" fill="#3479D8" />
          <circle cx="16" cy="15" r="5.3" fill="white" />
        </g>
        <g className="roadmap-journey-mini-card card-fundamentals">
          <rect x="19" y="38" width="139" height="51" rx="10" fill="white" stroke="#E4EAF4" />
          <rect x="29" y="49" width="29" height="29" rx="8" fill="#EAF2FF" />
          <path d="M37 56h13m-13 5h13m-13 5h8" stroke="#4380D7" strokeWidth="1.8" strokeLinecap="round" />
          <text x="66" y="60" fill="#263852">Learn Fundamentals</text>
          <text className="roadmap-journey-step" x="66" y="73" fill="#8491A5">STEP 01</text>
        </g>
        <g className="roadmap-journey-mini-card card-projects">
          <rect x="181" y="207" width="128" height="51" rx="10" fill="white" stroke="#E4EAF4" />
          <rect x="191" y="218" width="29" height="29" rx="8" fill="#F0ECFF" />
          <path d="m200 229-3 3 3 3m10-6 3 3-3 3m-3-8-3 10" stroke="#8068CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text x="228" y="229" fill="#263852">Build Projects</text>
          <text className="roadmap-journey-step" x="228" y="242" fill="#8491A5">STEP 02</text>
        </g>
        <g className="roadmap-journey-mini-card card-ready">
          <rect x="342" y="202" width="143" height="51" rx="10" fill="white" stroke="#E4EAF4" />
          <rect x="352" y="213" width="29" height="29" rx="8" fill="#EAF7F0" />
          <path d="m360 228 4 4 8-9" stroke="#3D9A6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="389" y="224" fill="#263852">Get Job Ready</text>
          <text className="roadmap-journey-step" x="389" y="237" fill="#8491A5">STEP 03</text>
        </g>
        <path d="m471 117 2.2 5.8L479 125l-5.8 2.2L471 133l-2.2-5.8L463 125l5.8-2.2 2.2-5.8Z" fill="#F2B856" />
        <circle cx="155" cy="146" r="3" fill="#A99AEF" />
        <circle cx="366" cy="115" r="3" fill="#86B6F2" />
      </svg>
    </div>
  )
}

const getMilestones = (roadmap) => roadmap?.milestones || roadmap?.roadmap?.milestones || roadmap?.roadmapItems || []
const getProgress = (milestones) => {
  const total = milestones.length
  const completed = milestones.filter((milestone) => milestone.status === 'Completed').length
  return { total, completed, percentage: total ? Math.round((completed / total) * 100) : 0 }
}
const formatDuration = (roadmap, milestones) => {
  const duration = roadmap?.estimatedDuration || roadmap?.duration
  if (duration) return duration
  const estimates = milestones.map((milestone) => milestone.estimatedTime).filter(Boolean)
  return estimates.length ? 'Varies by stage' : 'Not specified'
}
const getDifficulty = (roadmap) => roadmap?.difficultyLevel || roadmap?.difficulty || 'Not specified'
const getTopicIcon = (milestone) => {
  const topic = `${milestone.title || ''} ${milestone.category || ''}`.toLowerCase()
  if (/project|build|portfolio/.test(topic)) return 'project'
  if (/data|algorithm|coding|program|java|python|javascript|react|sql|api/.test(topic)) return 'code'
  if (/network|system|architecture/.test(topic)) return 'network'
  if (/test|assessment|practice/.test(topic)) return 'flask'
  if (/resource|learn|course|fundamental/.test(topic)) return 'book'
  return 'star'
}

function ProgressBar({ value, label }) {
  return <div className="roadmap-progress-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
    <span style={{ width: `${value}%` }} />
  </div>
}

function Milestone({ milestone, index, onToggle, onAssess, busy }) {
  const badge = milestone.status === 'Completed' ? 'complete' : milestone.status === 'In Progress' ? 'progress' : 'pending'
  const icon = getTopicIcon(milestone)
  return (
    <article className="roadmap-milestone">
      <div className="roadmap-milestone-timeline">
        <span className={`roadmap-number ${badge}`}>{index + 1}</span>
        {index > 0 && <span className="roadmap-timeline-line" />}
      </div>
      <div className={`roadmap-topic-icon tone-${icon}`}><Icon name={icon} size={19} /></div>
      <div className="roadmap-milestone-main">
        <div className="roadmap-milestone-title-row">
          <h3>{milestone.title}</h3>
          <span className={`roadmap-status-badge ${badge}`}>{milestone.status || 'Pending'}</span>
        </div>
        {milestone.description && <p>{milestone.description}</p>}
        <div className="roadmap-milestone-meta">
          {milestone.estimatedTime && <span><Icon name="clock" size={13} />{milestone.estimatedTime}</span>}
          {milestone.adaptiveReadiness?.level && <span className="roadmap-readiness">Readiness: {milestone.adaptiveReadiness.level}{Number.isFinite(Number(milestone.adaptiveReadiness.accuracy)) ? ` · ${milestone.adaptiveReadiness.accuracy}%` : ''}</span>}
        </div>
        {Array.isArray(milestone.learningResources) && milestone.learningResources.length > 0 && (
          <div className="roadmap-resources">
            <strong>Learning resources</strong>
            <div>{milestone.learningResources.map((resource) => (
              <a key={`${resource.title}-${resource.url}`} href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title}</a>
            ))}</div>
          </div>
        )}
        <div className="roadmap-milestone-actions">
          <div className="roadmap-status-controls" aria-label={`Set ${milestone.title} status`}>
            {statuses.map((status) => <button
              type="button"
              key={status}
              className={milestone.status === status ? 'selected' : ''}
              onClick={() => onToggle(milestone._id, status)}
              disabled={busy || milestone.status === status}
            >{status}</button>)}
          </div>
          <button className="roadmap-assess-button" type="button" disabled={busy} onClick={() => onAssess(milestone._id)}>
            {busy ? 'Generating...' : 'Assess Milestone'}<Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Roadmap() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentId = user?._id || user?.id
  const [roadmap, setRoadmap] = useState(null)
  const [roadmapView, setRoadmapView] = useState(() => readRoadmapView(studentId))
  const [targetRole, setTargetRole] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [adaptiveGenerating, setAdaptiveGenerating] = useState(false)
  const [updatingMilestone, setUpdatingMilestone] = useState('')
  const [domains, setDomains] = useState([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [domainsError, setDomainsError] = useState('')
  const [showDomains, setShowDomains] = useState(false)
  const [showAllRoles, setShowAllRoles] = useState(false)
  const domainPickerRef = useRef(null)
  const rolesListRef = useRef(null)
  const roleInputRef = useRef(null)
  const domainsLoadedRef = useRef(false)

  const milestones = useMemo(() => getMilestones(roadmap), [roadmap])
  const progress = useMemo(() => getProgress(milestones), [milestones])
  const role = roadmap?.careerGoal || roadmap?.targetRole || ''
  const overviewDuration = formatDuration(roadmap, milestones)
  const difficulty = getDifficulty(roadmap)
  const changeRoadmapView = (view) => {
    setRoadmapView(view)
    storeRoadmapView(studentId, view)
  }

  useEffect(() => {
    let active = true
    Promise.all([api.get('/roadmap/me'), api.get('/roadmap/progress')])
      .then(([roadmapResponse, progressResponse]) => {
        if (!active) return
        if (roadmapResponse.ok && roadmapResponse.data?.data) {
          setRoadmap(roadmapResponse.data.data)
          setTargetRole(roadmapResponse.data.data.careerGoal || '')
        } else if (roadmapResponse.status !== 404) {
          setError(roadmapResponse.data?.message || 'Unable to load your roadmap.')
        }
        if (progressResponse.ok && progressResponse.data?.data && !roadmapResponse.ok) {
          setError(progressResponse.data?.message || 'Unable to load roadmap progress.')
        }
      })
      .catch(() => {
        if (active) setError('Unable to load your roadmap. Check your connection and try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const closeDomains = (event) => {
      if (domainPickerRef.current?.contains(event.target)) return
      setShowDomains(false)
      if (!rolesListRef.current?.contains(event.target)) setShowAllRoles(false)
    }
    document.addEventListener('mousedown', closeDomains)
    return () => document.removeEventListener('mousedown', closeDomains)
  }, [])

  const loadDomains = async () => {
    if (domainsLoadedRef.current || domainsLoading) return
    setDomainsLoading(true)
    setDomainsError('')
    try {
      const response = await api.get('/roadmap/domains')
      if (response.ok) {
        setDomains(Array.isArray(response.data?.data) ? response.data.data : [])
        domainsLoadedRef.current = true
      } else setDomainsError(response.data?.message || 'Unable to load supported roles. You can still enter a role manually.')
    } catch {
      setDomainsError('Unable to load supported roles. You can still enter a role manually.')
    } finally {
      setDomainsLoading(false)
    }
  }

  const filteredDomains = domains.filter((domain) =>
    domain.displayName?.toLowerCase().includes(targetRole.trim().toLowerCase()),
  )

  const handleRoleFocus = () => {
    setShowDomains(true)
    setShowAllRoles(false)
    loadDomains()
  }

  const handleRoleChange = (event) => {
    setTargetRole(event.target.value)
    setError('')
    setShowDomains(true)
    setShowAllRoles(false)
    loadDomains()
  }

  const selectRole = (domain) => {
    setTargetRole(domain.displayName)
    setError('')
    setShowDomains(false)
    setShowAllRoles(false)
    roleInputRef.current?.blur()
  }

  const selectPopularRole = (roleName) => {
    setTargetRole(roleName)
    setError('')
    setShowDomains(false)
    setShowAllRoles(false)
    roleInputRef.current?.blur()
  }

  const viewAllRoles = () => {
    setShowDomains(false)
    setShowAllRoles((visible) => !visible)
    loadDomains()
  }

  const generate = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    if (!targetRole.trim()) {
      setError('Enter a target career role to generate a roadmap.')
      return
    }
    setGenerating(true)
    try {
      const response = await api.post('/roadmap/generate', { targetRole: targetRole.trim() })
      if (!response.ok || !response.data?.data) {
        setError(response.data?.message || 'Failed to generate roadmap.')
        return
      }
      setRoadmap(response.data.data)
      setTargetRole(response.data.data.careerGoal || targetRole.trim())
      setShowDomains(false)
      setShowAllRoles(false)
      changeRoadmapView('generated')
      roleInputRef.current?.blur()
      setInfo('Your personalized roadmap is ready.')
    } catch {
      setError('Unable to generate your roadmap. Check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }

  const changeSearch = () => {
    setTargetRole('')
    setError('')
    setInfo('')
    setShowDomains(false)
    setShowAllRoles(false)
    changeRoadmapView('search')
  }

  const toggleStatus = async (milestoneId, status) => {
    if (!milestoneId) {
      setError('This roadmap stage has no saved identifier and cannot be updated.')
      return
    }
    setError('')
    setInfo('')
    setUpdatingMilestone(milestoneId)
    try {
      const response = await api.patch(`/roadmap/milestone/${milestoneId}`, { status })
      if (!response.ok || !response.data?.data) {
        setError(response.data?.message || 'Unable to update this milestone.')
        return
      }
      setRoadmap(response.data.data)
      setInfo('Milestone progress saved.')
    } catch {
      setError('Unable to save milestone progress. Check your connection and try again.')
    } finally {
      setUpdatingMilestone('')
    }
  }

  const startAdaptiveAssessment = async (mode, milestoneId) => {
    if (!roadmap?._id) {
      setError('Save or generate a roadmap before creating an assessment.')
      return
    }
    setError('')
    setInfo('')
    setAdaptiveGenerating(true)
    try {
      const response = await api.post('/adaptive-assessment/generate', {
        mode,
        roadmapId: roadmap._id,
        ...(milestoneId ? { milestoneId } : {}),
      })
      if (!response.ok) {
        setError(response.data?.message || 'Unable to generate adaptive assessment.')
        return
      }
      if (!response.data?.assessment?.id) {
        setError('The assessment service returned an invalid response.')
        return
      }
      navigate(`/student/adaptive-assessment/${response.data.assessment.id}`)
    } catch {
      setError('Network error while requesting AI question generation.')
    } finally {
      setAdaptiveGenerating(false)
    }
  }

  if (loading) return <div className="roadmap-page"><div className="roadmap-loading">Loading your learning roadmap...</div></div>

  if (!roadmap || roadmapView === 'search') {
    return (
      <div className="roadmap-page roadmap-search-view">
        <header className="roadmap-page-heading roadmap-search-heading">
          <div>
            <span className="roadmap-eyebrow">YOUR PERSONALIZED LEARNING PLAN</span>
            <h1>Learning Roadmap</h1>
            <p>Plan. Learn. Practice. Achieve your career goals.</p>
          </div>
          {roadmap && <button type="button" className="roadmap-text-action" onClick={() => { changeRoadmapView('generated'); setTargetRole(role); setShowDomains(false); setShowAllRoles(false); setError('') }}>Keep current roadmap</button>}
        </header>
        {error && <div className="roadmap-alert error" role="alert">{error}</div>}
        {info && <div className="roadmap-alert success" role="status">{info}</div>}
        <section className="roadmap-generate-card roadmap-ai-hero">
          <div className="roadmap-hero-top">
            <div className="roadmap-hero-copy">
              <span className="roadmap-ai-badge"><Icon name="sparkle" size={15} />AI-Powered Roadmap</span>
              <h2>Generate Your Personalized Roadmap</h2>
              <p>Tell us your target career role and we&apos;ll create a step-by-step learning plan tailored to industry skills, tools, and best practices.</p>
              <div className="roadmap-feature-highlights">
                <div className="roadmap-feature-highlight"><span className="blue"><Icon name="book" size={17} /></span><strong>Structured<br />Learning Path</strong></div>
                <div className="roadmap-feature-highlight"><span className="purple"><Icon name="network" size={17} /></span><strong>Industry Relevant<br />Skills</strong></div>
                <div className="roadmap-feature-highlight"><span className="green"><Icon name="check" size={17} /></span><strong>Track Your<br />Progress</strong></div>
              </div>
            </div>
            <LearningJourneyIllustration />
          </div>
          <form className="roadmap-role-form roadmap-role-form-search" onSubmit={generate}>
            <div className="roadmap-domain-picker" ref={domainPickerRef}>
              <label htmlFor="roadmap-target-role">Target career role</label>
              <div className="roadmap-role-input-wrap">
                <Icon name="search" size={17} />
                <input
                  ref={roleInputRef}
                  id="roadmap-target-role"
                  value={targetRole}
                  onChange={handleRoleChange}
                  onFocus={handleRoleFocus}
                  placeholder="e.g. Data Analyst, Java Developer, Frontend Developer"
                  aria-label="Enter a target career role"
                  aria-expanded={showDomains}
                  aria-controls="roadmap-domain-options"
                  autoComplete="off"
                />
              </div>
              {showDomains && (
                <div className="roadmap-domain-menu" id="roadmap-domain-options" role="listbox">
                  {domainsLoading && <div className="roadmap-domain-message">Loading supported roles...</div>}
                  {!domainsLoading && domainsError && <div className="roadmap-domain-message">{domainsError}</div>}
                  {!domainsLoading && !domainsError && filteredDomains.length === 0 && <div className="roadmap-domain-message">No matching suggestions. You can use your custom role.</div>}
                  {!domainsLoading && !domainsError && filteredDomains.map((domain) => (
                    <button type="button" className="roadmap-domain-option" key={domain.key} role="option" aria-selected={targetRole === domain.displayName} onClick={() => selectRole(domain)}>{domain.displayName}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="roadmap-primary-button" disabled={generating || !targetRole.trim()}>
              {generating ? <><span className="roadmap-button-spinner" />Generating roadmap...</> : <><Icon name="sparkle" size={16} />Generate Roadmap<Icon name="arrow" size={16} /></>}
            </button>
          </form>
          <div className="roadmap-preserve-note"><Icon name="lightbulb" size={17} /><span>Your current roadmap and saved milestone progress remain in place until a new roadmap is generated.</span></div>
        </section>

        <section className="roadmap-popular-section" ref={rolesListRef}>
          <header className="roadmap-popular-heading">
            <div><h2>Popular Career Roles</h2><p>Not sure what to choose? Try one of these popular career roles.</p></div>
            <button type="button" className="roadmap-view-roles-button" onClick={viewAllRoles} aria-expanded={showAllRoles}>View All Roles<Icon name="arrow" size={15} /></button>
          </header>
          <div className="roadmap-popular-roles">
            {popularRoles.map((popularRole) => (
              <button type="button" className="roadmap-popular-role" key={popularRole.title} onClick={() => selectPopularRole(popularRole.title)}>
                <span className={`roadmap-popular-role-icon ${popularRole.tone}`}><Icon name={popularRole.icon} size={20} /></span>
                <strong>{popularRole.title}</strong>
                <span className="roadmap-popular-role-arrow"><Icon name="arrow" size={14} /></span>
              </button>
            ))}
          </div>
          {showAllRoles && (
            <div className="roadmap-all-roles-panel">
              <div className="roadmap-all-roles-heading"><strong>Supported career roles</strong><button type="button" onClick={() => setShowAllRoles(false)} aria-label="Close supported roles">×</button></div>
              {domainsLoading && <p className="roadmap-domain-message">Loading supported roles...</p>}
              {!domainsLoading && domainsError && <p className="roadmap-domain-message">{domainsError}</p>}
              {!domainsLoading && !domainsError && domains.length === 0 && <p className="roadmap-domain-message">No predefined roles are available. You can enter a custom role above.</p>}
              {!domainsLoading && !domainsError && domains.length > 0 && (
                <div className="roadmap-all-roles-list">
                  {domains.map((domain) => <button type="button" key={domain.key} onClick={() => selectRole(domain)}>{domain.displayName}<Icon name="arrow" size={14} /></button>)}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="roadmap-page">
      <header className="roadmap-page-heading generated">
        <div><span className="roadmap-eyebrow">Your selected career role</span><h1>Learning Roadmap</h1><p>{role || 'Personalized roadmap'} · Build your skills in focused stages and track your progress.</p></div>
        <button type="button" className="roadmap-change-button" onClick={changeSearch}><Icon name="refresh" size={16} />Change Search</button>
      </header>

      {error && <div className="roadmap-alert error" role="alert">{error}</div>}
      {info && <div className="roadmap-alert success" role="status">{info}</div>}

      <div className="roadmap-content-grid">
        <main className="roadmap-main-column">
          <section className="roadmap-progress-card">
            <div className="roadmap-card-heading"><div><span className="roadmap-eyebrow">Your learning journey</span><h2>Overall Progress</h2></div><span className="roadmap-progress-percent">{progress.percentage}<small>%</small></span></div>
            <ProgressBar value={progress.percentage} label="Overall roadmap progress" />
            <p>{progress.completed} of {progress.total} milestones completed</p>
          </section>

          <section className="roadmap-assessment-card">
            <div className="roadmap-assessment-icon"><Icon name="assessment" size={22} /></div>
            <div className="roadmap-assessment-copy"><h2>Adaptive AI Assessment</h2><p>Generate AI questions based on your roadmap readiness. Correct answers remain hidden until you submit.</p></div>
            <button type="button" className="roadmap-primary-button" disabled={adaptiveGenerating || milestones.length === 0} onClick={() => startAdaptiveAssessment('overall')}>
              {adaptiveGenerating ? 'Generating...' : <>Overall Assessment<Icon name="arrow" size={16} /></>}
            </button>
          </section>

          <section className="roadmap-milestones-section">
            <div className="roadmap-section-heading"><div><span className="roadmap-eyebrow">Your learning plan</span><h2>Learning Milestones</h2><p>Follow the stages in order and track your progress.</p></div><span className="roadmap-stage-count">{progress.total} stages</span></div>
            {milestones.length === 0 ? (
              <div className="roadmap-empty-state">This roadmap has no milestones yet.</div>
            ) : (
              <div className="roadmap-milestone-list">
                {milestones.map((milestone, index) => <Milestone
                  key={milestone._id || `${milestone.title}-${index}`}
                  milestone={milestone}
                  index={index}
                  onToggle={toggleStatus}
                  onAssess={(id) => startAdaptiveAssessment('milestone', id)}
                  busy={updatingMilestone === milestone._id || adaptiveGenerating}
                />)}
              </div>
            )}
          </section>
        </main>

        <aside className="roadmap-overview-card">
          <div className="roadmap-card-heading"><div><span className="roadmap-eyebrow">At a glance</span><h2>Roadmap Overview</h2></div></div>
          <div className="roadmap-overview-rows">
            {[
              { icon: 'role', label: 'Target Role', value: role || 'Not specified', tone: 'blue' },
              { icon: 'stages', label: 'Total Stages', value: progress.total, tone: 'purple' },
              { icon: 'calendar', label: 'Estimated Duration', value: overviewDuration, tone: 'orange' },
              { icon: 'level', label: 'Difficulty Level', value: difficulty, tone: 'green' },
            ].map(({ icon, label, value, tone }) => <div className="roadmap-overview-row" key={label}>
              <span className={`roadmap-overview-icon ${tone}`}><Icon name={icon} size={16} /></span>
              <span><small>{label}</small><strong>{value}</strong></span>
            </div>)}
          </div>
          <div className="roadmap-overview-progress">
            <div><strong>Your Progress</strong><b>{progress.percentage}%</b></div>
            <ProgressBar value={progress.percentage} label="Roadmap overview progress" />
            <small>{progress.completed} of {progress.total} milestones completed</small>
          </div>
          {roadmap.summary && <p className="roadmap-overview-summary">{roadmap.summary}</p>}
        </aside>
      </div>
    </div>
  )
}
