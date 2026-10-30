import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { getFacultyAssessmentDashboardMetrics, isFacultyAssessmentExpiringSoon } from '../../assessmentMetrics'
import { getAssignedSetIndexes, getUnassignedSetIndexes } from '../../assessmentSets'
import AssessmentSectionNav from '../admin/AssessmentSectionNav'
import { AssessmentHeroIllustration, AssessmentIcon } from '../admin/AssessmentDashboardVisuals'
import FacultyAssessmentUploadReview from './AssessmentUploadReview'
import '../admin/Assessments.css'
import './FacultyPages.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function FacultyAssessments({ uploadOnly = false }) {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState([])
  const [tab, setTab] = useState('ALL')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(!uploadOnly)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/faculty/assessments?refresh=${Date.now()}`)
      if (!response.ok) {
        setError(response.data?.message || 'Unable to load assessments')
        return
      }
      setAssessments(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch {
      setError('Unable to load assessments. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!uploadOnly) Promise.resolve().then(load)
  }, [load, uploadOnly])

  const deleteAssessment = async (assessment) => {
    if (!window.confirm(`Delete the assessment "${assessment.title}"? Its questions, student accounts, assignments, and results will not be deleted.`)) return
    setBusyId(assessment._id)
    setError('')
    try {
      const response = await api.del(`/faculty/assessments/${assessment._id}`)
      if (!response.ok) {
        setError(response.data?.message || 'Unable to delete assessment')
        return
      }
      setStatus('Assessment deleted successfully.')
      await load()
    } catch {
      setError('Unable to delete assessment. Check your connection and try again.')
    } finally {
      setBusyId('')
    }
  }

  const metrics = getFacultyAssessmentDashboardMetrics(assessments)
  const visibleAssessments = assessments.filter((assessment) => (
    tab === 'ALL'
    || (tab === 'ASSIGNED' && getAssignedSetIndexes(assessment).size > 0)
    || (tab === 'NOT_ASSIGNED' && getUnassignedSetIndexes(assessment).length > 0)
    || (tab === 'FACULTY_CREATED' && assessment.assignedFaculty)
    || (tab === 'ADMIN_CREATED' && assessment.createdByAdmin)
    || (tab === 'EXPIRING_SOON' && isFacultyAssessmentExpiringSoon(assessment))
  ))

  return (
    <section className={`faculty-page faculty-assessments-page${uploadOnly ? ' faculty-assessment-upload-page' : ' admin-assessments-page admin-assessment-workflow-page'}`}>
      {!uploadOnly && (
        <>
          <div className="assessments-hero">
            <div className="assessments-hero-copy">
              <span className="assessments-hero-badge"><AssessmentIcon name="assessment" /> Assessment workspace</span>
              <h1>Assessments</h1>
              <p>Create, assign, and track assessment participation</p>
            </div>
            <AssessmentHeroIllustration />
          </div>
          {error && <div className="alert error faculty-page-alert" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}
          {status && <div className="alert success">{status}</div>}
          <div className="assessment-sticky-controls">
            <div className="assessments-section-nav">
              <AssessmentSectionNav basePath="/faculty/assessments" />
            </div>
            <div className="role-tabs assessment-filter-tabs">
              <button type="button" aria-pressed={tab === 'ASSIGNED'} className={`assessment-filter-card assigned${tab === 'ASSIGNED' ? ' active' : ''}`} onClick={() => setTab(tab === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}>
                <span className="assessment-filter-icon"><AssessmentIcon name="assigned" /></span>
                <span className="assessment-filter-label">Assigned</span>
                <strong>{loading ? '…' : `${metrics.assigned}/${metrics.total}`}</strong>
              </button>
              <button type="button" aria-pressed={tab === 'NOT_ASSIGNED'} className={`assessment-filter-card not-assigned${tab === 'NOT_ASSIGNED' ? ' active' : ''}`} onClick={() => setTab(tab === 'NOT_ASSIGNED' ? 'ALL' : 'NOT_ASSIGNED')}>
                <span className="assessment-filter-icon"><AssessmentIcon name="unassigned" /></span>
                <span className="assessment-filter-label">Not Assigned</span>
                <strong>{loading ? '…' : `${metrics.notAssigned}/${metrics.total}`}</strong>
              </button>
              <button type="button" aria-pressed={tab === 'FACULTY_CREATED'} className={`assessment-filter-card faculty${tab === 'FACULTY_CREATED' ? ' active' : ''}`} onClick={() => setTab(tab === 'FACULTY_CREATED' ? 'ALL' : 'FACULTY_CREATED')}>
                <span className="assessment-filter-icon"><AssessmentIcon name="faculty" /></span>
                <span className="assessment-filter-label">Created by Faculty</span>
                <strong>{loading ? '…' : metrics.facultyCreated}</strong>
              </button>
              <button type="button" aria-pressed={tab === 'ADMIN_CREATED'} className={`assessment-filter-card admin${tab === 'ADMIN_CREATED' ? ' active' : ''}`} onClick={() => setTab(tab === 'ADMIN_CREATED' ? 'ALL' : 'ADMIN_CREATED')}>
                <span className="assessment-filter-icon"><AssessmentIcon name="admin" /></span>
                <span className="assessment-filter-label">Created by Admin</span>
                <strong>{loading ? '…' : metrics.adminCreated}</strong>
              </button>
              <button type="button" aria-pressed={tab === 'EXPIRING_SOON'} className={`assessment-filter-card expiring${tab === 'EXPIRING_SOON' ? ' active' : ''}`} onClick={() => setTab(tab === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON')}>
                <span className="assessment-filter-icon"><AssessmentIcon name="clock" /></span>
                <span className="assessment-filter-label">Expiring Soon</span>
                <strong>{loading ? '…' : metrics.expiringSoon}</strong>
              </button>
            </div>
          </div>
        </>
      )}

      {uploadOnly ? (
        <FacultyAssessmentUploadReview onCreated={load} />
      ) : (
        <>
          {loading ? (
            <div className="faculty-content-state" role="status">Loading assessments…</div>
          ) : visibleAssessments.length === 0 ? (
            <div className="card assessments-empty-state"><p className="muted">No assessments in this view.</p></div>
          ) : (
            <div className="assessment-card-grid">
              {visibleAssessments.map((assessment) => {
                const assignedSetIndexes = getAssignedSetIndexes(assessment)
                const unassignedSetIndexes = getUnassignedSetIndexes(assessment)
                const totalSetCount = assessment.setMetrics?.totalSetCount ?? assessment.questionSets?.length ?? 0
                const assignedSetCount = assessment.setMetrics?.assignedSetCount ?? assignedSetIndexes.size
                const expiredSetIndexes = assessment.setMetrics?.expiredSetIndexes || []
                const statusLabel = !assignedSetCount
                  ? 'NOT ASSIGNED'
                  : expiredSetIndexes.length
                    ? `${expiredSetIndexes.length}/${totalSetCount} EXPIRED`
                    : `${assignedSetCount}/${totalSetCount} ASSIGNED`
                const statusTone = !assignedSetCount ? 'not-assigned' : expiredSetIndexes.length ? 'expired' : 'assigned'
                const busy = busyId === assessment._id
                return (
                  <article className="assessment-card" key={assessment._id}>
                    <div className="assessment-card-main">
                      <span className="assessment-document-icon"><AssessmentIcon name="assessment" /></span>
                      <div className="assessment-card-copy">
                        <h2>{assessment.title}</h2>
                        <div className="assessment-card-meta">
                          <span>{assessment.department || 'No department'}</span>
                          <span>{assessment.totalQuestions ?? assessment.questions?.length ?? 0} questions</span>
                          <span>{assessment.duration} minutes</span>
                        </div>
                      </div>
                      <span className={`assessment-status-pill ${statusTone}`}>{statusLabel}</span>
                    </div>
                    {totalSetCount > 1 && (
                      <div className="assessment-set-summary">
                        <span>Assigned: <strong>{assignedSetCount}/{totalSetCount}</strong></span>
                        <span>Available: <strong>{assessment.setMetrics?.availableSetCount ?? unassignedSetIndexes.length}/{totalSetCount}</strong></span>
                        {expiredSetIndexes.length > 0 && <span>Expired: <strong>{expiredSetIndexes.length}</strong></span>}
                        {tab === 'EXPIRING_SOON' && assessment.setMetrics?.expiringSoonSetIndexes?.length > 0 && (
                          <span className="assessment-expiring-sets">
                            Expiring soon: {assessment.setMetrics.expiringSoonSetIndexes.map((setIndex) => `Set ${setIndex + 1}`).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="assessment-card-stats">
                      <div className="assessment-card-stat deadline"><span className="assessment-stat-icon"><AssessmentIcon name="calendar" /></span><span className="assessment-stat-copy"><span>Deadline</span><strong>{formatDeadline(assessment.endDate)}</strong></span></div>
                      <div className="assessment-card-stat assigned"><span className="assessment-stat-icon"><AssessmentIcon name="student" /></span><span className="assessment-stat-copy"><span>Assigned</span><strong>{assessment.assignedCount ?? assessment.assignedStudents?.length ?? 0}</strong></span></div>
                      <div className="assessment-card-stat attended"><span className="assessment-stat-icon"><AssessmentIcon name="check" /></span><span className="assessment-stat-copy"><span>Attended</span><strong>{assessment.attendedCount ?? 0}</strong></span></div>
                      <div className="assessment-card-stat not-attended"><span className="assessment-stat-icon"><AssessmentIcon name="close" /></span><span className="assessment-stat-copy"><span>Not attended</span><strong>{assessment.notAttendedCount ?? 0}</strong></span></div>
                      {assessment.averagePercentage != null && <div className="assessment-card-stat average"><span className="assessment-stat-icon"><AssessmentIcon name="percent" /></span><span className="assessment-stat-copy"><span>Average</span><strong>{assessment.averagePercentage}%</strong></span></div>}
                    </div>
                    <div className="assessment-card-actions">
                      {assignedSetIndexes.size > 0 && <button className="assessment-action-button result" onClick={() => navigate(`/faculty/assessments/results/${assessment._id}`)}><AssessmentIcon name="result" />View Results</button>}
                      {unassignedSetIndexes.length > 0 && <button className="assessment-action-button assign" onClick={() => navigate(`/faculty/assessments/assign/${assessment._id}`)}><AssessmentIcon name="plus" />{assignedSetIndexes.size ? 'Assign Remaining Sets' : 'Assign'}</button>}
                      <button className="assessment-action-button edit" onClick={() => navigate(`/faculty/assessments/edit/${assessment._id}`)}><AssessmentIcon name="edit" />Edit</button>
                      <button className="assessment-action-button delete" disabled={Boolean(busyId)} onClick={() => deleteAssessment(assessment)}><AssessmentIcon name="delete" />{busy ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
