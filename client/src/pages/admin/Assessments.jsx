import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'
import { AssessmentHeroIllustration, AssessmentIcon } from './AssessmentDashboardVisuals'
import { getAssessmentResultsPath } from '../../assessmentSets'
import { formatSetRatio, getAssessmentSetTotals, isAssessmentExpiringSoon } from '../../assessmentMetrics'
import './AssessmentWorkflow.css'
import './Assessments.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

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
