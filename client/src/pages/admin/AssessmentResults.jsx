import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { getAssignedSetIndexes, getQuestionSetQuestionIds } from '../../assessmentSets'
import AssessmentIllustration from './AssessmentIllustration'
import './AssessmentWorkflow.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function AdminAssessmentResults() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSetIndex = searchParams.get('setIndex')
  const parsedSetIndex = requestedSetIndex === null ? null : Number(requestedSetIndex)
  const selectedSetIndex = Number.isInteger(parsedSetIndex) && parsedSetIndex >= 0 ? parsedSetIndex : null
  const requestedStudentId = searchParams.get('studentId')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [selection, setSelection] = useState({ scope: '', studentIds: [] })
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const selectionScope = `${assessmentId}:${selectedSetIndex ?? 'overview'}`
  const selectedStudentIds = selection.scope === selectionScope ? selection.studentIds : []

  const loadDetails = useCallback(async () => {
    const response = await api.get(`/admin/assessments/${assessmentId}/details`)
    if (response.ok) setDetails(response.data.data)
    else setError(response.data?.message || 'Unable to load assessment results')
  }, [assessmentId])

  useEffect(() => {
    Promise.resolve().then(loadDetails).catch(() => setError('Unable to load assessment results'))
  }, [loadDetails])

  useEffect(() => {
    if (!details || !requestedStudentId) return
    document.getElementById(`assessment-request-student-${requestedStudentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [details, requestedStudentId])

  if (error) return <div className="alert error">{error}</div>
  if (!details) return <div className="loading">Loading assessment results...</div>

  const assessment = details.assessment
  const isMultiSetAssessment = assessment.questionSets?.length > 1 || (assessment.questionSets?.length === 1 && assessment.usesMultiSetAssignment)
  const assignedSetIndexes = getAssignedSetIndexes(assessment)

  if (isMultiSetAssessment && selectedSetIndex === null) {
    return <div className="admin-assessment-results-page admin-assessment-workflow-page">
      <div className="page-title assessment-workflow-page-title"><h1>Assessment Results</h1><AssessmentIllustration variant="results" /><Link className="btn secondary" to="/admin/assessments">Back to Assessments</Link></div>
      <div className="grid">
        {[...assignedSetIndexes].sort((left, right) => left - right).map((setIndex) => {
          const assignment = (assessment.setAssignments || []).find((set) => Number(set.setIndex) === setIndex)
          return <div className="card" key={setIndex}><h3>Set {setIndex + 1}</h3><p className="muted">{assignment?.departments?.join(', ') || 'Assigned'} · {assignment?.assignedStudents?.length || 0} students</p><Link className="btn small mt" to={`/admin/assessments/results/${assessmentId}?setIndex=${setIndex}`}>View Result</Link></div>
        })}
        {assignedSetIndexes.size === 0 && <div className="card"><p className="muted">No question sets have been assigned yet.</p></div>}
      </div>
    </div>
  }

  const selectedSetAssignment = isMultiSetAssessment
    ? (assessment.setAssignments || []).find((set) => Number(set.setIndex) === selectedSetIndex && assignedSetIndexes.has(selectedSetIndex))
    : null
  if (isMultiSetAssessment && !selectedSetAssignment) return <div className="alert error">This question set is not assigned.</div>

  const assignedStudentIds = selectedSetAssignment
    ? new Set((selectedSetAssignment.assignedStudents || []).map((studentId) => String(studentId?._id || studentId)))
    : null
  const scopedStudents = assignedStudentIds
    ? details.students.filter((entry) => assignedStudentIds.has(String(entry.student._id)))
    : details.students
  const currentlyEligibleStudentIds = new Set(
    scopedStudents
      .filter((entry) => entry.status === 'Requested' && entry.requestStatus === 'Requested')
      .map((entry) => String(entry.student._id))
  )
  const selectedEligibleStudentIds = selectedStudentIds.filter((studentId) => currentlyEligibleStudentIds.has(studentId))
  const scopedResults = scopedStudents.map((entry) => entry.result).filter(Boolean)
  const scopedAverage = scopedResults.length
    ? Number((scopedResults.reduce((sum, result) => sum + (Number(result.percentage) || 0), 0) / scopedResults.length).toFixed(2))
    : null
  const selectedQuestionCount = selectedSetAssignment
    ? getQuestionSetQuestionIds(assessment.questionSets[selectedSetIndex]).length
    : assessment.totalQuestions
  const displayedAssessment = selectedSetAssignment ? {
    ...assessment,
    department: selectedSetAssignment.departments?.join(', ') || '',
    totalQuestions: selectedQuestionCount,
    assignedCount: scopedStudents.length,
    attendedCount: scopedResults.length,
    notAttendedCount: Math.max(0, scopedStudents.length - scopedResults.length),
    averagePercentage: scopedAverage,
  } : assessment
  const departments = [...new Set(scopedStudents.map((entry) => entry.student.department).filter(Boolean))].sort()
  const students = scopedStudents.filter((entry) => (
    statusFilter === 'ALL' ||
    (statusFilter === 'ATTENDED' && entry.status === 'Completed') ||
    (statusFilter === 'NOT_ATTENDED' && entry.status === 'Not Attended') ||
    (statusFilter === 'REQUESTED' && entry.status === 'Requested') ||
    (statusFilter === 'ASSIGNED' && entry.status === 'Assigned') ||
    (statusFilter === 'CANCELLED' && entry.status === 'Cancelled')
  ) && (departmentFilter === 'ALL' || entry.student.department === departmentFilter))
  const visibleRequestedStudentIds = students
    .filter((entry) => entry.status === 'Requested' && entry.requestStatus === 'Requested')
    .map((entry) => String(entry.student._id))
  const allVisibleRequestedSelected = visibleRequestedStudentIds.length > 0
    && visibleRequestedStudentIds.every((studentId) => selectedEligibleStudentIds.includes(studentId))
  const toggleRequestedStudent = (studentId) => {
    const normalizedId = String(studentId)
    setSelection((previous) => {
      const selected = previous.scope === selectionScope ? selectedEligibleStudentIds : []
      return {
        scope: selectionScope,
        studentIds: selected.includes(normalizedId)
          ? selected.filter((id) => id !== normalizedId)
          : [...selected, normalizedId],
      }
    })
  }
  const cancelSelectedRequests = async () => {
    setCancelBusy(true)
    setError('')
    try {
      const response = await api.post(`/admin/assessments/${assessmentId}/cancel-requests`, {
        studentIds: selectedEligibleStudentIds,
      })
      if (!response.ok) {
        setError(response.data?.message || 'Unable to cancel retest request')
        return
      }
      setCancelDialogOpen(false)
      setSelection({ scope: selectionScope, studentIds: [] })
      await loadDetails()
    } catch {
      setError('Unable to cancel retest request')
    } finally {
      setCancelBusy(false)
    }
  }
  const toggleAllRequested = () => {
    setSelection(() => {
      return {
        scope: selectionScope,
        studentIds: allVisibleRequestedSelected
          ? selectedEligibleStudentIds.filter((id) => !visibleRequestedStudentIds.includes(id))
          : [...new Set([...selectedEligibleStudentIds, ...visibleRequestedStudentIds])],
      }
    })
  }
  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Student', 'Department', 'Status', 'Max Score', 'Score', 'Percentage'], ...students.map((entry) => [entry.student.name, entry.student.department || '', entry.status, entry.result?.totalMarks ?? '', entry.result?.score ?? '', entry.result ? `${entry.result.percentage}%` : ''])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const setSuffix = selectedSetAssignment ? `-set-${selectedSetIndex + 1}` : ''
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `assessment-results-${assessment.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'assessment'}${setSuffix}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  return <div className="admin-assessment-results-page admin-assessment-workflow-page">
    <div className="page-title assessment-workflow-page-title"><div><h1>Assessment Results</h1>{selectedSetAssignment && <div className="subtitle">Set {selectedSetIndex + 1}</div>}</div><AssessmentIllustration variant="results" /><div className="row">{selectedSetAssignment && <Link className="btn secondary" to={`/admin/assessments/results/${assessmentId}`}>Back to Sets</Link>}<Link className="btn secondary" to="/admin/assessments">Back to Assessments</Link></div></div>
    {selectedSetAssignment ? (
      <div className="card mb assessment-result-details-panel">
        <div className="assessment-info-tile">
          <span className="assessment-info-icon department" aria-hidden="true">▣</span>
          <div>
            <span className="assessment-info-label">Department</span>
            <strong>{displayedAssessment.department || 'Not assigned'}</strong>
          </div>
        </div>
        <div className="assessment-info-tile">
          <span className="assessment-info-icon deadline" aria-hidden="true">◷</span>
          <div>
            <span className="assessment-info-label">Deadline</span>
            <strong>{formatDeadline(selectedSetAssignment.endDate)}</strong>
          </div>
        </div>
      </div>
    ) : (
      <div className="card mb assessment-result-details-panel overview-panel"><h3>{assessment.title}</h3><div className="assessment-info-tile"><span className="assessment-info-icon department" aria-hidden="true">▣</span><div><span className="assessment-info-label">Department</span><strong>{displayedAssessment.department || 'Not assigned'}</strong></div></div><div className="assessment-info-tile"><span className="assessment-info-icon deadline" aria-hidden="true">◷</span><div><span className="assessment-info-label">Deadline</span><strong>{formatDeadline(assessment.endDate)}</strong></div></div></div>
    )}
    <div className="grid cols-4 mb assessment-kpi-grid"><div className="card assessment-result-metric assigned"><span className="assessment-kpi-chip" aria-hidden="true">♙</span><div className="assessment-kpi-value">{displayedAssessment.assignedCount}</div><div className="assessment-kpi-label">Assigned Students</div></div><div className="card assessment-result-metric attended"><span className="assessment-kpi-chip" aria-hidden="true">✓</span><div className="assessment-kpi-value">{displayedAssessment.attendedCount}</div><div className="assessment-kpi-label">Attended Students</div></div><div className="card assessment-result-metric not-attended"><span className="assessment-kpi-chip" aria-hidden="true">×</span><div className="assessment-kpi-value">{displayedAssessment.notAttendedCount}</div><div className="assessment-kpi-label">Not Attended</div></div><div className="card assessment-result-metric average"><span className="assessment-kpi-chip" aria-hidden="true">％</span><div className="assessment-kpi-value">{displayedAssessment.averagePercentage ?? '—'}{displayedAssessment.averagePercentage !== null ? '%' : ''}</div><div className="assessment-kpi-label">Average Performance</div></div></div>
    <div className="card assessment-results-table-card">
      <div className="row between">
        <h3>{selectedSetAssignment ? `Set ${selectedSetIndex + 1} Student Results` : 'Set 1 Student Results'}</h3>
        <div className="results-filters">
          <label>Status <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All</option><option value="ATTENDED">Completed</option><option value="NOT_ATTENDED">Not Attended</option><option value="REQUESTED">Requested</option><option value="ASSIGNED">Assigned</option><option value="CANCELLED">Cancelled</option></select></label>
          <label>Department <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="ALL">All Departments</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <button
            className="btn small secondary"
            disabled={!visibleRequestedStudentIds.length}
            aria-pressed={allVisibleRequestedSelected}
            onClick={toggleAllRequested}
          >
            {allVisibleRequestedSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selectedEligibleStudentIds.length > 0 && (
            <>
              <button className="btn small primary" onClick={() => navigate(`/admin/assessments/assign-questions/${assessmentId}`, { state: { studentIds: selectedEligibleStudentIds } })}>
                Assign Questions
              </button>
              <button className="btn small secondary" onClick={() => setCancelDialogOpen(true)}>
                Cancel Request
              </button>
            </>
          )}
          <button className="btn small secondary" disabled={!students.length} onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      {students.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Status</th><th>Max Score</th><th>Score Obtained</th><th>Percentage</th></tr>
            </thead>
            <tbody>
              {students.map((entry, index) => {
                const studentId = String(entry.student._id)
                const selectable = entry.status === 'Requested' && entry.requestStatus === 'Requested'
                const selected = selectable && selectedEligibleStudentIds.includes(studentId)
                const isRequestTarget = studentId === requestedStudentId
                return (
                  <tr
                    key={studentId}
                    id={isRequestTarget ? `assessment-request-student-${studentId}` : undefined}
                    className={`assessment-result-student-row${selectable ? ' selectable' : ''}${selected ? ' selected' : ''}${isRequestTarget ? ' request-focus' : ''}`}
                    aria-selected={selectable ? selected : undefined}
                    tabIndex={selectable ? 0 : undefined}
                    onClick={() => selectable && toggleRequestedStudent(studentId)}
                    onKeyDown={(event) => {
                      if (selectable && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        toggleRequestedStudent(studentId)
                      }
                    }}
                  >
                    <td>{index + 1}</td>
                    <td>{entry.student.name}</td>
                    <td><span className={`assessment-result-status ${entry.status === 'Completed' ? 'completed' : entry.status === 'Requested' ? 'requested' : entry.status === 'Cancelled' ? 'cancelled' : entry.status === 'Assigned' ? 'assigned' : 'not-attended'}`}>{entry.status}</span></td>
                    <td><strong>{entry.result?.totalMarks ?? '—'}</strong></td>
                    <td><strong>{entry.result?.score ?? '—'}</strong></td>
                    <td><span className="assessment-result-percentage">{entry.result ? `${entry.result.percentage}%` : '—'}</span></td>
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
          aria-labelledby="cancel-request-title"
          aria-describedby="cancel-request-description"
        >
          <h2 id="cancel-request-title">Cancel Retest Request?</h2>
          <p id="cancel-request-description">
            Are you sure you want to cancel the retest request for {details.students
              .filter((entry) => selectedEligibleStudentIds.includes(String(entry.student._id)))
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
}
