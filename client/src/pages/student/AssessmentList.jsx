import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../../api'
import './AssessmentList.css'

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const getCategory = (assessment) => assessment.category
  || assessment.subject
  || assessment.assessmentType
  || assessment.assessment?.category
  || assessment.assessment?.subject
  || assessment.assessment?.assessmentType
  || ''

const isCompleted = (assessment) => Boolean(assessment.attempted || assessment.resultId)
const isAvailable = (assessment) => assessment.isAvailable === true
const isExpired = (assessment, now) => assessment.expired === true
  || (dateValue(assessment.endDate) !== null && dateValue(assessment.endDate) <= now)
const getAssessmentId = (assessment) => String(assessment.assessmentId || assessment.assessment?._id || assessment._id || '')
const getResultId = (assessment) => assessment.resultId || (assessment.attempted ? assessment._id : null)
const dateValue = (value) => {
  if (!value) return null
  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : null
}

function AssessmentIcon() {
  return (
    <span className="assessment-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h4" />
      </svg>
    </span>
  )
}

function AssessmentAction({ assessment, now, requestingAssessmentId, requestToAttend }) {
  if (isCompleted(assessment)) {
    const resultId = getResultId(assessment)
    return resultId
      ? <Link className="assessment-action result-action" to={`/student/assessments/result/${resultId}`}>View Result</Link>
      : <span className="assessment-action muted-action">Completed</span>
  }

  if (isExpired(assessment, now)) {
    if (assessment.requestStatus === 'Requested') {
      return <button className="assessment-action sent-action" type="button" disabled>Request Sent</button>
    }
    if (assessment.requestStatus === 'Assigned') {
      return <button className="assessment-action sent-action" type="button" disabled>Retest Assigned</button>
    }
    if (assessment.requestStatus === 'Cancelled') return null
    if (assessment.canRequestAttendance && assessment.retestAvailable) {
      return (
        <button
          className="assessment-action request-action"
          type="button"
          disabled={requestingAssessmentId === assessment._id}
          onClick={() => requestToAttend(assessment._id)}
        >
          {requestingAssessmentId === assessment._id ? 'Sending...' : 'Request Retest'}
        </button>
      )
    }
    return <span className="assessment-action muted-action">No retest available</span>
  }

  if (assessment.startDate && dateValue(assessment.startDate) > now) {
    return (
      <button
        className="assessment-action start-action"
        type="button"
        onClick={() => window.alert(`This test will start on ${formatDate(assessment.startDate)}.`)}
      >
        Start Test
      </button>
    )
  }

  return <Link className="assessment-action start-action" to={`/student/assessments/${assessment._id}/take`}>Start Test</Link>
}

function getStatus(assessment, now) {
  if (isCompleted(assessment)) return 'Completed'
  if (isExpired(assessment, now)) return 'Expired'
  if (assessment.startDate && dateValue(assessment.startDate) > now) return 'Upcoming'
  if (isAvailable(assessment)) return 'Available'
  return 'Live'
}

function StatusBadges({ assessment, now }) {
  const status = getStatus(assessment, now)
  const expired = status === 'Expired'
  return (
    <div className="assessment-status-stack">
      <span className={`assessment-status status-${status.toLowerCase()}`}>{status}</span>
      {expired && assessment.requestStatus === 'Requested' && (
        <span className="assessment-status status-requested">Retest Requested</span>
      )}
      {expired && assessment.requestStatus === 'Cancelled' && (
        <span className="assessment-status status-rejected">Retest Rejected</span>
      )}
      {expired && assessment.requestStatus === 'Assigned' && (
        <span className="assessment-status status-assigned">Retest Approved</span>
      )}
      {expired && assessment.requestMessage && assessment.requestStatus === 'Cancelled' && (
        <small className="assessment-request-message">{assessment.requestMessage}</small>
      )}
    </div>
  )
}

function AssessmentRow({ assessment, now, requestingAssessmentId, requestToAttend }) {
  const title = assessment.title || assessment.assessment?.title || 'Assessment'
  const category = getCategory(assessment)
  const topics = Array.isArray(assessment.topicAnalysis) ? assessment.topicAnalysis.map((topic) => topic.topic).filter(Boolean) : []
  const description = assessment.description || (topics.length ? topics.join(', ') : '')
  const deadline = assessment.endDate || assessment.submittedAt || assessment.startDate

  return (
    <article className="assessment-row">
      <div className="assessment-row-name" data-label="Assessment">
        <AssessmentIcon />
        <div>
          <strong>{title}</strong>
          <small>{description || 'Assessment'}</small>
        </div>
      </div>
      <div className="assessment-row-category" data-label="Category">
        {category ? <span className="assessment-category-badge">{category}</span> : <span className="assessment-cell-muted">—</span>}
      </div>
      <div className="assessment-row-fact" data-label="Duration">{assessment.duration ? `${assessment.duration} min` : '—'}</div>
      <div className="assessment-row-fact" data-label="Marks">{assessment.totalMarks ?? assessment.assessment?.totalMarks ?? '—'}</div>
      <div className="assessment-row-date" data-label="Deadline"><time>{formatDate(deadline)}</time></div>
      <div className="assessment-row-status" data-label="Status"><StatusBadges assessment={assessment} now={now} /></div>
      <div className="assessment-row-action" data-label="Action">
        <AssessmentAction assessment={assessment} now={now} requestingAssessmentId={requestingAssessmentId} requestToAttend={requestToAttend} />
      </div>
    </article>
  )
}

const statusTabs = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'available', label: 'Available' },
  { id: 'completed', label: 'Completed' },
  { id: 'expired', label: 'Expired' },
]

const compareNullable = (left, right, direction = 1) => {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return (left - right) * direction
}

function sortAssessments(assessments, sort) {
  return [...assessments].sort((left, right) => {
    if (sort === 'deadline-latest') return compareNullable(dateValue(left.endDate), dateValue(right.endDate), -1)
    if (sort === 'score-high') return compareNullable(Number.isFinite(Number(left.percentage)) ? Number(left.percentage) : null, Number.isFinite(Number(right.percentage)) ? Number(right.percentage) : null, -1)
    if (sort === 'score-low') return compareNullable(Number.isFinite(Number(left.percentage)) ? Number(left.percentage) : null, Number.isFinite(Number(right.percentage)) ? Number(right.percentage) : null)
    if (sort === 'recent') return compareNullable(dateValue(left.submittedAt), dateValue(right.submittedAt), -1)
    if (sort === 'title') return String(left.title || '').localeCompare(String(right.title || ''))
    return compareNullable(dateValue(left.endDate), dateValue(right.endDate))
  })
}

function LoadingAssessments() {
  return <div className="assessment-loading" aria-label="Loading assessments" aria-busy="true"><div /><div /><div /><div /></div>
}

export default function AssessmentList() {
  const [items, setItems] = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingAssessmentId, setRequestingAssessmentId] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('deadline-soon')
  const [selectedTab, setSelectedTab] = useState('all')
  const [now, setNow] = useState(0)
  const { unreadCount = 0 } = useOutletContext() || {}

  useEffect(() => {
    let active = true
    const load = async () => {
      const [assessmentResponse, historyResponse] = await Promise.allSettled([
        api.get('/assessment/my'),
        api.get('/assessment/history'),
      ])
      if (!active) return

      if (assessmentResponse.status === 'fulfilled' && assessmentResponse.value.ok) {
        const payload = assessmentResponse.value.data?.data
        setItems(Array.isArray(payload?.assessments) ? payload.assessments : Array.isArray(payload) ? payload : [])
      } else {
        console.warn('Unable to load student assessments.')
        setError('Unable to load your assessments right now. Please try again.')
      }

      if (historyResponse.status === 'fulfilled' && historyResponse.value.ok) {
        const payload = historyResponse.value.data?.data
        setHistoryItems(Array.isArray(payload?.assessments) ? payload.assessments : Array.isArray(payload) ? payload : [])
      } else {
        console.warn('Unable to load assessment history.')
      }
      setNow(Date.now())
      setLoading(false)
    }

    load().catch(() => {
      if (!active) return
      console.warn('Assessment request failed unexpectedly.')
      setError('Unable to load your assessments right now. Please try again.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const requestToAttend = async (assessmentId) => {
    setRequestingAssessmentId(assessmentId)
    setError('')
    try {
      const response = await api.post(`/assessment/${assessmentId}/request-to-attend`, {})
      if (!response.ok) {
        setError(response.data?.message || 'Unable to request a retest.')
        return
      }
      setItems((current) => current.map((item) => item._id === assessmentId
        ? { ...item, requestStatus: response.data?.data?.status || 'Requested' }
        : item))
    } catch {
      setError('Unable to request a retest. Please try again.')
    } finally {
      setRequestingAssessmentId('')
    }
  }

  if (loading) return <LoadingAssessments />

  const historyRows = historyItems.map((result) => ({
    ...result,
    assessmentId: result.assessment?._id || result.assessment,
    title: result.assessment?.title || result.title,
    assessmentType: result.assessment?.assessmentType || result.assessmentType,
    totalMarks: result.assessment?.totalMarks ?? result.totalMarks,
    resultId: result._id,
    attempted: true,
  }))
  const includedResultIds = new Set(items.map((item) => String(item.resultId || '')).filter(Boolean))
  const missingHistoryRows = historyRows.filter((result) => !includedResultIds.has(String(result.resultId)))
  const allRows = [...items, ...missingHistoryRows]
  const completedRows = allRows.filter(isCompleted)
  const completedAssessmentIds = new Set(completedRows.map(getAssessmentId))
  const expiredRows = items.filter((item) => isExpired(item, now) && !isCompleted(item))
  const activeRows = items.filter((item) => !isExpired(item, now) && !isCompleted(item))
  const assignedRows = activeRows.filter((item) => item.isAssigned === true || item.reattemptAssigned === true || (item.isAssigned === undefined && item.isAvailable !== true))
  const availableRows = activeRows.filter(isAvailable)
  const counts = {
    all: assignedRows.length + availableRows.length + completedAssessmentIds.size + expiredRows.length,
    assigned: assignedRows.length,
    available: availableRows.length,
    completed: completedAssessmentIds.size,
    expired: expiredRows.length,
  }

  const categoryOptions = Array.from(new Set(allRows.map(getCategory).filter(Boolean))).sort((left, right) => left.localeCompare(right))
  const matchesSearch = (assessment) => {
    const normalized = search.trim().toLowerCase()
    const topicText = Array.isArray(assessment.topicAnalysis) ? assessment.topicAnalysis.map((topic) => topic.topic).join(' ') : ''
    const searchable = [
      assessment.title,
      assessment.description,
      assessment.subject,
      assessment.category,
      assessment.assessmentType,
      topicText,
    ].filter(Boolean).join(' ').toLowerCase()
    return (!normalized || searchable.includes(normalized))
      && (categoryFilter === 'all' || getCategory(assessment) === categoryFilter)
  }

  const tabRows = allRows.filter((assessment) => {
    if (selectedTab === 'assigned') return assignedRows.includes(assessment)
    if (selectedTab === 'available') return availableRows.includes(assessment)
    if (selectedTab === 'completed') return isCompleted(assessment)
    if (selectedTab === 'expired') return isExpired(assessment, now) && !isCompleted(assessment)
    return true
  })
  const visibleRows = sortAssessments(tabRows.filter(matchesSearch), sort)

  return (
    <div className="assessment-page">
      <header className="assessment-page-header">
        <div>
          <h1>My Assessments</h1>
          <p>Take your assigned tests, explore available assessments, and track your performance.</p>
        </div>
        <Link className="assessment-notification-button" to="/student/notifications" aria-label={`${unreadCount} unread notifications`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
          {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </Link>
      </header>

      <div className="assessment-controls">
        <label className="assessment-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assessments by title, subject, or keyword..." aria-label="Search assessments" />
        </label>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
          <option value="all">All Categories</option>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort assessments">
          <option value="deadline-soon">Deadline (Soonest)</option>
          <option value="deadline-latest">Deadline (Latest)</option>
          <option value="score-high">Highest Score</option>
          <option value="score-low">Lowest Score</option>
          <option value="recent">Recently Completed</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {error && <div className="assessment-page-error" role="alert">{error}</div>}

      <nav className="assessment-status-tabs" aria-label="Assessment status filters">
        {statusTabs.map((tab) => (
          <button
            className={selectedTab === tab.id ? 'active' : ''}
            type="button"
            key={tab.id}
            aria-pressed={selectedTab === tab.id}
            onClick={() => setSelectedTab(tab.id)}
          >
            {tab.label}<span>{counts[tab.id]}</span>
          </button>
        ))}
      </nav>

      <section className="assessment-list-panel" id="assessment-list">
        <div className="assessment-list-heading">
          <h2>{statusTabs.find((tab) => tab.id === selectedTab)?.label || 'All'} Assessments</h2>
          <span>{visibleRows.length} shown</span>
        </div>
        <div className="assessment-list-columns" aria-hidden="true">
          <span>Assessment</span><span>Category</span><span>Duration</span><span>Marks</span><span>Deadline / Date</span><span>Status</span><span>Action</span>
        </div>
        {visibleRows.length ? (
          <div className="assessment-list-rows">
            {visibleRows.map((assessment, index) => (
              <AssessmentRow
                key={`${getAssessmentId(assessment)}-${assessment.resultId || `row-${index}`}`}
                assessment={assessment}
                now={now}
                requestingAssessmentId={requestingAssessmentId}
                requestToAttend={requestToAttend}
              />
            ))}
          </div>
        ) : (
          <div className="assessment-empty-state">
            <strong>{items.length ? 'No assessments match these filters' : 'No assessments yet'}</strong>
            <p>{items.length ? 'Try another status, category, or search term.' : 'Assigned and available assessments will appear here.'}</p>
          </div>
        )}
      </section>
    </div>
  )
}