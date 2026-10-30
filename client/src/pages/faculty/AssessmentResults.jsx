import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { getAssignedSetIndexes, getQuestionSetQuestionIds } from '../../assessmentSets'
import AssessmentIllustration from '../admin/AssessmentIllustration'
import '../admin/AssessmentWorkflow.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function FacultyAssessmentResults() {
  const { assessmentId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSetIndex = searchParams.get('setIndex')
  const parsedSetIndex = requestedSetIndex === null ? null : Number(requestedSetIndex)
  const selectedSetIndex = Number.isInteger(parsedSetIndex) && parsedSetIndex >= 0 ? parsedSetIndex : null
  const requestedStudentId = searchParams.get('studentId')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(location.state?.status || '')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [selection, setSelection] = useState({ scope: '', studentIds: [] })
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const selectionScope = `${assessmentId}:${selectedSetIndex ?? 'overview'}`
  const selectedStudentIds = selection.scope === selectionScope ? selection.studentIds : []

  const loadDetails = useCallback(async () => {
    const response = await api.get(`/faculty/assessments/${assessmentId}/details?refresh=${Date.now()}`)
    if (response.ok) {
      setDetails(response.data.data)
      setError('')
    } else {
      setError(response.data?.message || 'Unable to load assessment results')
    }
  }, [assessmentId])

  useEffect(() => {
    Promise.resolve().then(loadDetails).catch(() => setError('Unable to load assessment results'))
  }, [loadDetails])

  useEffect(() => {
    if (!details || !requestedStudentId) return
    document.getElementById(`assessment-request-student-${requestedStudentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [details, requestedStudentId])

  if (error && !details) return <div className="alert error" role="alert">{error}</div>
  if (!details) return <div className="loading">Loading assessment results...</div>

  const { assessment } = details
  const isMultiSetAssessment = assessment.questionSets?.length > 1
    || (assessment.questionSets?.length === 1 && assessment.usesMultiSetAssignment)
  const assignedSetIndexes = getAssignedSetIndexes(assessment)

  if (isMultiSetAssessment && selectedSetIndex === null) {
    return (
      <div className="admin-assessment-results-page admin-assessment-workflow-page faculty-assessment-workflow-page">
        <div className="page-title assessment-workflow-page-title">
          <h1>Assessment Results</h1>
          <AssessmentIllustration variant="results" />
          <Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link>
        </div>
        <div className="grid">
          {[...assignedSetIndexes].sort((left, right) => left - right).map((setIndex) => {
            const assignment = (assessment.setAssignments || []).find((set) => Number(set.setIndex) === setIndex)
            return (
              <div className="card" key={setIndex}>
                <h3>Set {setIndex + 1}</h3>
                <p className="muted">
                  {assignment?.departments?.join(', ') || 'Assigned'} · {assignment?.assignedStudents?.length || 0} students
                </p>
                <Link className="btn small mt" to={`/faculty/assessments/results/${assessmentId}?setIndex=${setIndex}`}>
                  View Result
                </Link>
              </div>
            )
          })}
          {assignedSetIndexes.size === 0 && <div className="card"><p className="muted">No question sets have been assigned yet.</p></div>}
        </div>
      </div>
    )
  }

  const selectedSetAssignment = isMultiSetAssessment
    ? (assessment.setAssignments || []).find((set) =>
      Number(set.setIndex) === selectedSetIndex && assignedSetIndexes.has(selectedSetIndex)
    )
    : null
  if (isMultiSetAssessment && !selectedSetAssignment) {
    return <div className="alert error" role="alert">This question set is not assigned.</div>
  }
  const assignedStudentIds = selectedSetAssignment
    ? new Set((selectedSetAssignment.assignedStudents || []).map((student) => String(student?._id || student)))
    : null
  const scopedStudents = assignedStudentIds
    ? details.students.filter((entry) =>
      Number(entry.setIndex) === selectedSetIndex &&
      assignedStudentIds.has(String(entry.student._id))
    )
    : details.students
  const scopedResults = scopedStudents.map((entry) => entry.result).filter(Boolean)
  const scopedPercentages = scopedResults
    .map((result) => result.percentage)
    .filter((percentage) => percentage !== null && percentage !== undefined && percentage !== "")
    .map(Number)
    .filter(Number.isFinite)
  const scopedAverage = scopedPercentages.length
    ? Number((scopedPercentages.reduce((sum, percentage) => sum + percentage, 0) / scopedPercentages.length).toFixed(2))
    : null
  const displayedAssessment = selectedSetAssignment ? {
    ...assessment,
    department: selectedSetAssignment.departments?.join(', ') || '',
    totalQuestions: getQuestionSetQuestionIds(assessment.questionSets[selectedSetIndex]).length,
    assignedCount: scopedStudents.length,
    attendedCount: scopedResults.length,
    notAttendedCount: Math.max(0, scopedStudents.length - scopedResults.length),
    averagePercentage: scopedAverage,
  } : assessment
  const departments = [...new Set(scopedStudents.map((entry) => entry.student.department).filter(Boolean))].sort()
  const students = scopedStudents.filter((entry) => (
    (selectedSetAssignment ? Number(entry.setIndex) === selectedSetIndex : true) && (
    statusFilter === 'ALL' ||
    (statusFilter === 'ATTENDED' && entry.status === 'Completed') ||
    (statusFilter === 'NOT_ATTENDED' && entry.status === 'Not Attended') ||
    (statusFilter === 'REQUESTED' && entry.status === 'Requested') ||
    (statusFilter === 'ASSIGNED' && entry.status === 'Assigned') ||
    (statusFilter === 'CANCELLED' && entry.status === 'Cancelled')
    ) && (departmentFilter === 'ALL' || entry.student.department === departmentFilter)
  ))
  const eligibleStudentIds = scopedStudents
    .filter((entry) => entry.status === 'Requested' && entry.requestStatus === 'Requested')
    .map((entry) => String(entry.student._id))
  const selectedEligibleIds = selectedStudentIds.filter((studentId) => eligibleStudentIds.includes(studentId))
  const visibleRequestedIds = students
    .filter((entry) => entry.status === 'Requested' && entry.requestStatus === 'Requested')
    .map((entry) => String(entry.student._id))
  const allVisibleRequestedSelected = visibleRequestedIds.length > 0
    && visibleRequestedIds.every((studentId) => selectedEligibleIds.includes(studentId))
  const toggleStudent = (studentId) => {
    const id = String(studentId)
    setSelection((previous) => {
      const selected = previous.scope === selectionScope
        ? previous.studentIds.filter((selectedId) => eligibleStudentIds.includes(selectedId))
        : []
      return {
        scope: selectionScope,
        studentIds: selected.includes(id)
          ? selected.filter((selectedId) => selectedId !== id)
          : [...selected, id],
      }
    })
  }
  const toggleAllRequested = () => {
    setSelection({
      scope: selectionScope,
      studentIds: allVisibleRequestedSelected
        ? selectedEligibleIds.filter((id) => !visibleRequestedIds.includes(id))
        : [...new Set([...selectedEligibleIds, ...visibleRequestedIds])],
    })
  }

  const cancelSelectedRequests = async () => {
    if (cancelBusy || !selectedEligibleIds.length) return
    setCancelBusy(true)
    setError('')
    setStatus('')
    try {
      const response = await api.post(`/faculty/assessments/${assessmentId}/cancel-requests`, {
        studentIds: selectedEligibleIds,
      })
      if (!response.ok) {
        setError(response.data?.message || 'Unable to cancel retest request')
        return
      }
      setCancelDialogOpen(false)
      setSelection({ scope: selectionScope, studentIds: [] })
      setStatus(response.data?.message || 'Retest request(s) cancelled successfully.')
      await loadDetails()
    } catch {
      setError('Unable to cancel retest request. Check your connection and try again.')
    } finally {
      setCancelBusy(false)
    }
  }

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Student', 'Department', 'Status', 'Max Score', 'Score', 'Percentage'], ...students.map((entry) => [entry.student.name, entry.student.department || '', entry.status, entry.result?.totalMarks ?? '', entry.result?.score ?? '', entry.result ? `${entry.result.percentage}%` : ''])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const setSuffix = selectedSetAssignment ? `-set-${selectedSetIndex + 1}` : ''
    anchor.download = `assessment-results-${assessment.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'assessment'}${setSuffix}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const assignSelectedRetest = () => {
    const firstSelectedEntry = scopedStudents.find((entry) =>
      selectedEligibleIds.includes(String(entry.student._id))
    )
    navigate(`/faculty/assessments/assign/${assessmentId}`, {
      state: {
        reattempt: true,
        studentIds: selectedEligibleIds,
        sourceSetIndex: selectedSetIndex ?? firstSelectedEntry?.setIndex,
      },
    })
  }

  return (
    <div className="admin-assessment-results-page admin-assessment-workflow-page faculty-assessment-workflow-page">
      <div className="page-title assessment-workflow-page-title">
        <div><h1>Assessment Results</h1>{selectedSetAssignment && <div className="subtitle">Set {selectedSetIndex + 1}</div>}</div>
        <AssessmentIllustration variant="results" />
        <div className="row">
          {selectedSetAssignment && <Link className="btn secondary" to={`/faculty/assessments/results/${assessmentId}`}>Back to Sets</Link>}
          <Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link>
        </div>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {status && <div className="alert success" role="status">{status}</div>}
      {selectedSetAssignment ? (
        <div className="card mb assessment-result-details-panel">
          <div className="assessment-info-tile">
            <span className="assessment-info-icon department" aria-hidden="true">▣</span>
            <div><span className="assessment-info-label">Department</span><strong>{displayedAssessment.department || 'Not assigned'}</strong></div>
          </div>
          <div className="assessment-info-tile">
            <span className="assessment-info-icon deadline" aria-hidden="true">◷</span>
            <div><span className="assessment-info-label">Deadline</span><strong>{formatDeadline(selectedSetAssignment.endDate)}</strong></div>
          </div>
        </div>
      ) : (
        <div className="card mb assessment-result-details-panel overview-panel">
          <h3>{assessment.title}</h3>
          <div className="assessment-info-tile">
            <span className="assessment-info-icon department" aria-hidden="true">▣</span>
            <div><span className="assessment-info-label">Department</span><strong>{displayedAssessment.department || 'Not assigned'}</strong></div>
          </div>
          <div className="assessment-info-tile">
            <span className="assessment-info-icon deadline" aria-hidden="true">◷</span>
            <div><span className="assessment-info-label">Deadline</span><strong>{formatDeadline(assessment.endDate)}</strong></div>
          </div>
        </div>
      )}
      <div className="grid cols-4 mb assessment-kpi-grid">
        <div className="card assessment-result-metric assigned"><span className="assessment-kpi-chip" aria-hidden="true">♙</span><div className="assessment-kpi-value">{displayedAssessment.assignedCount}</div><div className="assessment-kpi-label">Assigned Students</div></div>
        <div className="card assessment-result-metric attended"><span className="assessment-kpi-chip" aria-hidden="true">✓</span><div className="assessment-kpi-value">{displayedAssessment.attendedCount}</div><div className="assessment-kpi-label">Attended Students</div></div>
        <div className="card assessment-result-metric not-attended"><span className="assessment-kpi-chip" aria-hidden="true">×</span><div className="assessment-kpi-value">{displayedAssessment.notAttendedCount}</div><div className="assessment-kpi-label">Not Attended</div></div>
        <div className="card assessment-result-metric average"><span className="assessment-kpi-chip" aria-hidden="true">％</span><div className="assessment-kpi-value">{displayedAssessment.averagePercentage ?? '—'}{displayedAssessment.averagePercentage !== null ? '%' : ''}</div><div className="assessment-kpi-label">Average Performance</div></div>
      </div>
      <div className="card assessment-results-table-card">
        <div className="row between">
          <h3>{selectedSetAssignment ? `Set ${selectedSetIndex + 1} Student Results` : 'Set 1 Student Results'}</h3>
          <div className="results-filters">
            <label>Status <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All</option>
              <option value="ATTENDED">Completed</option>
              <option value="NOT_ATTENDED">Not Attended</option>
              <option value="REQUESTED">Requested</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="CANCELLED">Cancelled</option>
            </select></label>
            <label>Department <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="ALL">All Departments</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select></label>
            <button
              className="btn small secondary"
              disabled={!visibleRequestedIds.length || cancelBusy}
              aria-pressed={allVisibleRequestedSelected}
              onClick={toggleAllRequested}
            >
              {allVisibleRequestedSelected ? 'Deselect All' : 'Select All'}
            </button>
            {selectedEligibleIds.length > 0 && (
              <>
                <button
                  className="btn small primary"
                  disabled={cancelBusy}
                  onClick={assignSelectedRetest}
                >
                  Assign Questions
                </button>
                <button className="btn small secondary" disabled={cancelBusy} onClick={() => setCancelDialogOpen(true)}>
                  Cancel Request ({selectedEligibleIds.length})
                </button>
              </>
            )}
            <button className="btn small secondary" disabled={!students.length} onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        {students.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Status</th><th>Max Score</th><th>Score Obtained</th><th>Percentage</th></tr></thead>
              <tbody>
                {students.map((entry, index) => {
                  const studentId = String(entry.student._id)
                  const selectable = entry.status === 'Requested' && entry.requestStatus === 'Requested'
                  const selected = selectable && selectedEligibleIds.includes(studentId)
                  const isRequestTarget = studentId === requestedStudentId
                  return (
                    <tr
                      key={studentId}
                      id={isRequestTarget ? `assessment-request-student-${studentId}` : undefined}
                      className={`assessment-result-student-row${selectable ? ' selectable' : ''}${selected ? ' selected' : ''}${isRequestTarget ? ' request-focus' : ''}`}
                      aria-selected={selectable ? selected : undefined}
                      tabIndex={selectable ? 0 : undefined}
                      onClick={() => selectable && toggleStudent(studentId)}
                      onKeyDown={(event) => {
                        if (selectable && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          toggleStudent(studentId)
                        }
                      }}
                    >
                      <td>{index + 1}</td>
                      <td>{entry.student.name}</td>
                      <td><span className={`assessment-result-status ${entry.status === 'Completed' ? 'completed' : entry.status === 'Requested' ? 'requested' : entry.status === 'Cancelled' ? 'cancelled' : entry.status === 'Assigned' ? 'assigned' : 'not-attended'}`}>{entry.status}</span></td>
                      <td><strong>{entry.result?.totalMarks ?? '—'}</strong></td>
                      <td><strong>{entry.result?.score ?? '—'}</strong></td>
                      <td><span className="assessment-result-percentage">{entry.result?.percentage !== null && entry.result?.percentage !== undefined ? `${entry.result.percentage}%` : '—'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="muted mt">No students match the selected filters.</p>}
      </div>
      {cancelDialogOpen && (
        <div className="assessment-request-dialog-backdrop">
          <section
            className="assessment-request-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="faculty-cancel-request-title"
            aria-describedby="faculty-cancel-request-description"
          >
            <h2 id="faculty-cancel-request-title">Cancel Retest Request?</h2>
            <p id="faculty-cancel-request-description">
              Are you sure you want to cancel the retest request for {scopedStudents
                .filter((entry) => selectedEligibleIds.includes(String(entry.student._id)))
                .map((entry) => entry.student.name)
                .join(', ')}?
            </p>
            <div className="assessment-request-dialog-actions">
              <button className="btn primary" disabled={cancelBusy} onClick={cancelSelectedRequests}>
                {cancelBusy ? 'Cancelling...' : 'Cancel Request'}
              </button>
              <button className="btn secondary" disabled={cancelBusy} onClick={() => setCancelDialogOpen(false)}>
                Keep Request
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
