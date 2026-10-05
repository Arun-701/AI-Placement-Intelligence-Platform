import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'
import { getAssessmentResultsPath } from '../../assessmentSets'
import { formatSetRatio, getAssessmentSetTotals, isAssessmentExpiringSoon } from '../../assessmentMetrics'
import './AssessmentWorkflow.css'
import './Assessments.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

const iconShapes = {
  assessment: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
  assigned: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  unassigned: <><circle cx="12" cy="12" r="9" /><path d="M9 12h6" /></>,
  faculty: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  admin: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  student: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 11a3 3 0 1 0 0-6" /><path d="M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  percent: <><path d="m19 5-14 14" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  result: <><path d="M7 17 17 7M8 7h9v9" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
  delete: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>
}

function AssessmentIcon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconShapes[name]}</svg>
}

function AssessmentHeroIllustration() {
  return (
    <svg className="assessments-hero-illustration" viewBox="0 0 430 220" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="assessment-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#e7efff" /></linearGradient>
        <linearGradient id="assessment-book" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#83b8f4" /><stop offset="1" stopColor="#786fe0" /></linearGradient>
        <linearGradient id="assessment-shirt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#59a9d8" /><stop offset="1" stopColor="#526fbd" /></linearGradient>
      </defs>
      <path d="M66 176c-26-27-20-84 11-116 35-37 111-46 171-25 51 18 104 11 139 47 27 28 12 77-19 96-55 34-258 34-302-2Z" fill="#e3edff" />
      <circle cx="352" cy="60" r="49" fill="#eee6ff" />
      <circle cx="109" cy="48" r="17" fill="#d7f4ea" />
      <path d="m339 21 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#f3b85e" />
      <circle cx="310" cy="145" r="5" fill="#8d83eb" />
      <circle cx="93" cy="119" r="4" fill="#f0a8b8" />
      <path d="M75 164h93v19H75z" rx="5" fill="#5c83d2" />
      <path d="M82 150h88v17H82z" rx="5" fill="#f3bd67" />
      <path d="M89 137h74v16H89z" rx="5" fill="url(#assessment-book)" />
      <path d="M98 142h53m-60 13h61m-68 14h69" stroke="#fff" strokeLinecap="round" strokeWidth="3" opacity=".8" />
      <path d="M184 139c0-17 14-30 33-30h36c19 0 33 13 33 30v42h-102v-42Z" fill="url(#assessment-shirt)" />
      <path d="M204 91c0-22 12-37 31-37s31 15 31 37c0 19-12 32-31 32s-31-13-31-32Z" fill="#efc19d" />
      <path d="M202 91c-5-25 8-49 32-49 22 0 35 17 33 42-9-2-20-9-26-20-8 12-22 22-39 27Z" fill="#35466d" />
      <path d="M194 135c17 7 40 12 62 2l-14 45h-43l-5-47Z" fill="#f6f7fc" />
      <path d="M187 137c-9-13-6-28 2-41 4-7 13-9 19-4l7 5-16 46-12-6Z" fill="#efc19d" />
      <path d="M270 136c9-15 15-28 17-43 1-7 8-10 14-6 7 4 9 12 6 20l-16 45-21-16Z" fill="#efc19d" />
      <rect x="306" y="60" width="78" height="107" rx="9" fill="url(#assessment-paper)" stroke="#b9c9ed" strokeWidth="2.5" />
      <rect x="333" y="53" width="25" height="13" rx="5" fill="#8391cf" />
      <path d="M320 86h7l3 3 5-6m7 3h29M320 106h7l3 3 5-6m7 3h29M320 126h7l3 3 5-6m7 3h23" fill="none" stroke="#8298bf" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m322 43 25-13 26 13-26 13-25-13Z" fill="#5666ba" />
      <path d="M330 48v10c10 7 21 7 31 0V48" fill="#7481cd" />
      <path d="M373 44l8 20" stroke="#d59a49" strokeLinecap="round" strokeWidth="2.5" />
      <circle cx="382" cy="66" r="3" fill="#d59a49" />
      <path d="M175 183h216" stroke="#b4c7ea" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function AdminAssessments() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('ALL')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const assessmentResponse = await api.get(`/admin/assessments?refresh=${Date.now()}`)
    if (!assessmentResponse.ok) setError(assessmentResponse.data?.message || 'Unable to load assessments')
    else setItems(assessmentResponse.data?.data || [])
  }

  useEffect(() => {
    let cancelled = false
    api.get(`/admin/assessments?refresh=${Date.now()}`).then((response) => {
      if (cancelled) return
      if (!response.ok) setError(response.data?.message || 'Unable to load assessments')
      else setItems(response.data?.data || [])
    }).catch(() => { if (!cancelled) setError('Unable to load assessments') })
    return () => { cancelled = true }
  }, [])

  const isAdminCreated = (item) => Boolean(item.createdByAdmin)
  const isFacultyCreated = (item) => Boolean(item.assignedFaculty)
  const getSetMetrics = (item) => item.setMetrics || {
    totalSetCount: 0,
    assignedSetCount: 0,
    currentAssignedSetCount: 0,
    availableSetCount: 0,
    expiredSetIndexes: [],
    expiringSoonSetIndexes: [],
  }
  const adminCreatedItems = items.filter(isAdminCreated)
  const adminSetTotals = getAssessmentSetTotals(adminCreatedItems)
  const allSetTotals = getAssessmentSetTotals(items)
  const assessmentCounts = {
    assigned: adminSetTotals.assigned,
    notAssigned: adminSetTotals.notAssigned,
    faculty: items.filter(isFacultyCreated).length,
    admin: adminCreatedItems.length,
    expiringSoon: allSetTotals.expiringSoon
  }
  const filtered = items.filter((item) => tab === 'ALL'
    || (tab === 'ASSIGNED' && isAdminCreated(item) && getSetMetrics(item).assignedSetCount > 0)
    || (tab === 'NOT_ASSIGNED' && isAdminCreated(item) && getSetMetrics(item).availableSetCount > 0)
    || (tab === 'FACULTY_CREATED' && isFacultyCreated(item))
    || (tab === 'ADMIN_CREATED' && isAdminCreated(item))
    || (tab === 'EXPIRING_SOON' && isAssessmentExpiringSoon(item)))
  const deleteAssessment = async (item) => {
    if (!window.confirm(`Delete the assessment "${item.title}"? Its questions, student accounts, assignments, and results will not be deleted.`)) return
    setBusy(true); setError('')
    const response = await api.del(`/admin/assessments/${item._id}`)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to delete assessment')
    setStatus('Assessment deleted successfully.'); await load()
  }

  return <div className="admin-assessments-page admin-assessment-workflow-page">
    <div className="assessments-hero">
      <div className="assessments-hero-copy"><span className="assessments-hero-badge"><AssessmentIcon name="assessment" /> Assessment workspace</span><h1>Assessments</h1><p>Create, assign, and track assessment participation</p></div>
      <AssessmentHeroIllustration />
    </div>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    <div className="assessment-sticky-controls">
      <div className="assessments-section-nav"><AssessmentSectionNav /></div>
      <div className="role-tabs assessment-filter-tabs">
        <button className={`assessment-filter-card assigned${tab === 'ASSIGNED' ? ' active' : ''}`} onClick={() => setTab('ASSIGNED')}><span className="assessment-filter-icon"><AssessmentIcon name="assigned" /></span><span className="assessment-filter-label">Assigned</span><strong>{formatSetRatio(assessmentCounts.assigned, adminSetTotals.total)}</strong></button>
        <button className={`assessment-filter-card not-assigned${tab === 'NOT_ASSIGNED' ? ' active' : ''}`} onClick={() => setTab('NOT_ASSIGNED')}><span className="assessment-filter-icon"><AssessmentIcon name="unassigned" /></span><span className="assessment-filter-label">Not Assigned</span><strong>{formatSetRatio(assessmentCounts.notAssigned, adminSetTotals.total)}</strong></button>
        <button className={`assessment-filter-card faculty${tab === 'FACULTY_CREATED' ? ' active' : ''}`} onClick={() => setTab('FACULTY_CREATED')}><span className="assessment-filter-icon"><AssessmentIcon name="faculty" /></span><span className="assessment-filter-label">Created by Faculty</span><strong>{assessmentCounts.faculty}</strong></button>
        <button className={`assessment-filter-card admin${tab === 'ADMIN_CREATED' ? ' active' : ''}`} onClick={() => setTab('ADMIN_CREATED')}><span className="assessment-filter-icon"><AssessmentIcon name="admin" /></span><span className="assessment-filter-label">Created by Admin</span><strong>{assessmentCounts.admin}</strong></button>
        <button className={`assessment-filter-card expiring${tab === 'EXPIRING_SOON' ? ' active' : ''}`} onClick={() => setTab('EXPIRING_SOON')}><span className="assessment-filter-icon"><AssessmentIcon name="clock" /></span><span className="assessment-filter-label">Expiring Soon</span><strong>{assessmentCounts.expiringSoon}</strong></button>
      </div>
    </div>
    {filtered.length === 0 && <div className="card assessments-empty-state"><p className="muted">No assessments in this view.</p></div>}
    <div className="assessment-card-grid">{filtered.map((item) => {
      const setMetrics = getSetMetrics(item)
      const { totalSetCount, assignedSetCount, availableSetCount, expiredSetIndexes, expiringSoonSetIndexes } = setMetrics
      const hasUnassignedSets = assignedSetCount < totalSetCount
      const displayedStatus = !assignedSetCount
          ? 'NOT_ASSIGNED'
          : expiredSetIndexes.length
            ? `${expiredSetIndexes.length}/${totalSetCount} EXPIRED`
            : `${assignedSetCount}/${totalSetCount} ASSIGNED`
      const statusTone = !expiredSetIndexes.length && assignedSetCount
        ? 'assigned'
        : expiredSetIndexes.length
          ? 'expired'
          : 'not-assigned'
      return <article className="assessment-card" key={item._id}>
        <div className="assessment-card-main">
          <span className="assessment-document-icon"><AssessmentIcon name="assessment" /></span>
          <div className="assessment-card-copy">
            <h2>{item.title}</h2>
            <div className="assessment-card-meta"><span>{item.department || 'No department'}</span><span>{item.totalQuestions} questions</span><span>{item.duration} minutes</span></div>
          </div>
          <span className={`assessment-status-pill ${statusTone}`}>{displayedStatus}</span>
        </div>
        {totalSetCount > 1 && <div className="assessment-set-summary">
          <span>Assigned: <strong>{formatSetRatio(assignedSetCount, totalSetCount)}</strong></span>
          <span>Available: <strong>{formatSetRatio(availableSetCount, totalSetCount)}</strong></span>
          {expiredSetIndexes.length > 0 && (
            <span>Expired: <strong>{expiredSetIndexes.length}</strong></span>
          )}
          {tab === 'EXPIRING_SOON' && expiringSoonSetIndexes.length > 0 && (
            <span className="assessment-expiring-sets">
              Expiring soon: {expiringSoonSetIndexes.map((setIndex) => `Set ${setIndex + 1}`).join(', ')}
            </span>
          )}
        </div>}
        <div className="assessment-card-stats">
          <div className="assessment-card-stat deadline"><span className="assessment-stat-icon"><AssessmentIcon name="calendar" /></span><span className="assessment-stat-copy"><span>Deadline</span><strong>{formatDeadline(item.endDate)}</strong></span></div>
          <div className="assessment-card-stat assigned"><span className="assessment-stat-icon"><AssessmentIcon name="student" /></span><span className="assessment-stat-copy"><span>Assigned</span><strong>{item.assignedCount}</strong></span></div>
          <div className="assessment-card-stat attended"><span className="assessment-stat-icon"><AssessmentIcon name="check" /></span><span className="assessment-stat-copy"><span>Attended</span><strong>{item.attendedCount}</strong></span></div>
          <div className="assessment-card-stat not-attended"><span className="assessment-stat-icon"><AssessmentIcon name="close" /></span><span className="assessment-stat-copy"><span>Not attended</span><strong>{item.notAttendedCount}</strong></span></div>
          {item.averagePercentage !== null && <div className="assessment-card-stat average"><span className="assessment-stat-icon"><AssessmentIcon name="percent" /></span><span className="assessment-stat-copy"><span>Average</span><strong>{item.averagePercentage}%</strong></span></div>}
        </div>
        <div className="assessment-card-actions">
          {assignedSetCount > 0 && <button className="assessment-action-button result" onClick={() => navigate(getAssessmentResultsPath(item))}><AssessmentIcon name="result" />View Result</button>}
          {isAdminCreated(item) && hasUnassignedSets && <button className="assessment-action-button assign" onClick={() => navigate(`/admin/assessments/assign/${item._id}`)}><AssessmentIcon name="plus" />Assign</button>}
          {isAdminCreated(item) && <>
            <button className="assessment-action-button edit" onClick={() => navigate(`/admin/assessments/edit/${item._id}`)}><AssessmentIcon name="edit" />Edit</button>
            <button className="assessment-action-button delete" disabled={busy} onClick={() => deleteAssessment(item)}><AssessmentIcon name="delete" />Delete</button>
          </>}
        </div>
      </article>
    })}</div>
  </div>
}
