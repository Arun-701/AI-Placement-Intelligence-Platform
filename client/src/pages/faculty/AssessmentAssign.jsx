import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { getAssignedSetIndexes, getQuestionSetQuestionIds, getUnassignedSetIndexes } from '../../assessmentSets'
import { normalizeDepartment } from '../../department'
import AssessmentIllustration from '../admin/AssessmentIllustration'
import '../admin/AssessmentAssign.css'
import '../admin/AssessmentWorkflow.css'

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function FacultyAssessmentAssign() {
  const { assessmentId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [students, setStudents] = useState([])
  const [setConfigs, setSetConfigs] = useState({})
  const [availableSetIndexes, setAvailableSetIndexes] = useState([])
  const [reattemptSetIndexes, setReattemptSetIndexes] = useState([])
  const [reattemptStudentIds, setReattemptStudentIds] = useState([])
  const [reattemptStudentSetAssignments, setReattemptStudentSetAssignments] = useState({})
  const [selectedReattemptSetIndex, setSelectedReattemptSetIndex] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [questionPreview, setQuestionPreview] = useState(null)
  const [openDropdowns, setOpenDropdowns] = useState({})
  const dropdownRefs = useRef({})
  const questionDialogRef = useRef(null)
  const reattemptStudentIdsFromNavigation = useMemo(() => (
    Array.isArray(location.state?.studentIds)
      ? [...new Set(location.state.studentIds.map(String))]
      : []
  ), [location.state])
  const reattempt = Boolean(location.state?.reattempt && reattemptStudentIdsFromNavigation.length)

  useEffect(() => {
    let cancelled = false
    const loadAssignment = async () => {
      try {
        let item
        let eligibleStudents
        let assignedDepartment
        let indexes
        if (reattempt) {
          const optionsResponse = await api.post(`/faculty/assessments/${assessmentId}/reattempt-options`, {
            studentIds: reattemptStudentIdsFromNavigation,
          })
          if (cancelled) return
          if (!optionsResponse.ok) {
            setError(optionsResponse.data?.message || 'Unable to load remaining question sets')
            return
          }
          const options = optionsResponse.data?.data
          item = options?.assessment
          eligibleStudents = Array.isArray(options?.students) ? options.students : []
          assignedDepartment = [...new Set(eligibleStudents.map((student) => String(student.department || '').trim()).filter(Boolean))]
          indexes = Array.isArray(options?.setIndexes) ? options.setIndexes : []
          setReattemptStudentIds(reattemptStudentIdsFromNavigation)
          setReattemptStudentSetAssignments(options?.studentSetAssignments || {})
          setReattemptSetIndexes(indexes)
          setAvailableSetIndexes(Array.isArray(options?.availableSetIndexes) ? options.availableSetIndexes : [])
        } else {
          const [assessmentResponse, profileResponse, studentsResponse] = await Promise.all([
            api.get(`/faculty/assessments/${assessmentId}/details`),
            api.get('/faculty/profile'),
            api.get('/faculty/assessments/students'),
          ])
          if (cancelled) return
          if (!assessmentResponse.ok) {
            setError(assessmentResponse.data?.message || 'Unable to load assessment')
            return
          }
          if (!profileResponse.ok) {
            setError(profileResponse.data?.message || 'Unable to load faculty department')
            return
          }
          if (!studentsResponse.ok) {
            setError(studentsResponse.data?.message || 'Unable to load available departments')
            return
          }
          item = assessmentResponse.data?.data?.assessment
          const studentData = studentsResponse.data?.data
          assignedDepartment = String(profileResponse.data?.data?.department || '').trim()
          eligibleStudents = Array.isArray(studentData?.students)
            ? studentData.students
            : Array.isArray(studentData) ? studentData : []
          indexes = getUnassignedSetIndexes(item)
          setAvailableSetIndexes(indexes)
        }
        if (!item) {
          setError('Assessment not found')
          return
        }
        const availableDepartments = Array.isArray(assignedDepartment)
          ? assignedDepartment
          : assignedDepartment ? [assignedDepartment] : []

        setAssessment(item)
        setDepartments(availableDepartments)
        setStudents(availableDepartments.length
          ? eligibleStudents.filter((student) => availableDepartments.some((department) =>
            normalizeDepartment(student.department) === normalizeDepartment(department)
          ))
          : [])
        setSetConfigs(Object.fromEntries(indexes.map((setIndex) => {
          const set = item.questionSets?.[setIndex] || {}
          return [setIndex, {
            departments: reattempt ? availableDepartments : [],
            studentIds: [],
            startDate: toDateTimeLocal(set.startDate),
            endDate: toDateTimeLocal(set.endDate),
          }]
        })))
      } catch {
        if (!cancelled) setError('Unable to load assignment details')
      }
    }

    loadAssignment()
    return () => { cancelled = true }
  }, [assessmentId, location.state, reattempt, reattemptStudentIdsFromNavigation])

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
          setOpenDropdowns((current) => ({ ...current, [key]: false }))
        }
      })
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (questionPreview && !questionDialogRef.current?.open) {
      questionDialogRef.current?.showModal()
    }
  }, [questionPreview])

  const toggleDepartment = (setIndex, department) => {
    setSetConfigs((current) => {
      const selectedDepartments = current[setIndex]?.departments || []
      return {
        ...current,
        [setIndex]: {
          ...current[setIndex],
          departments: selectedDepartments.includes(department) ? [] : [department],
          studentIds: selectedDepartments.includes(department) ? [] : current[setIndex]?.studentIds || [],
        },
      }
    })
  }

  const getAvailableStudentsForSet = (setIndex) => {
    const selectedForSet = new Set((setConfigs[setIndex]?.studentIds || []).map(String))
    return students.filter((student) =>
      !selectedForSet.has(String(student._id))
    )
  }

  const toggleStudent = (setIndex, studentId, checked) => {
    const id = String(studentId)
    setSetConfigs((current) => {
      const config = current[setIndex] || { departments: [], studentIds: [], startDate: '', endDate: '' }
      return {
        ...current,
        [setIndex]: {
          ...config,
          studentIds: checked
            ? [...new Set([...config.studentIds.map(String), id])]
            : config.studentIds.filter((selectedId) => String(selectedId) !== id),
        },
      }
    })
  }

  const updateDate = (setIndex, field, value) => {
    setSetConfigs((current) => ({
      ...current,
      [setIndex]: { ...current[setIndex], [field]: value },
    }))
  }

  const viewSetQuestions = (setIndex) => {
    const questionIds = getQuestionSetQuestionIds(assessment.questionSets?.[setIndex])
    const questionsById = new Map(
      (assessment.questions || []).map((question) => [String(question?._id || question), question])
    )
    const questions = questionIds
      .map((question) => questionsById.get(String(question?._id || question)))
      .filter(Boolean)
    setQuestionPreview({ setIndex, questions })
  }

  const closeQuestionPreview = () => {
    questionDialogRef.current?.close()
    setQuestionPreview(null)
  }

  const assign = async () => {
    if (busy) return
    setError('')
    setStatus('')

    if (reattempt) {
      if (!Number.isInteger(selectedReattemptSetIndex) || !availableSetIndexes.includes(selectedReattemptSetIndex)) {
        setError('Select an available question set for the retest.')
        return
      }
      const config = setConfigs[selectedReattemptSetIndex]
      const startDate = new Date(config?.startDate || '')
      const endDate = new Date(config?.endDate || '')
      if (!config?.departments?.length || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setError(`Set ${selectedReattemptSetIndex + 1}: Select the department and enter valid start and end dates.`)
        return
      }
      if (startDate <= new Date() || endDate <= startDate) {
        setError(`Set ${selectedReattemptSetIndex + 1}: Choose a future start date and an end date after it.`)
        return
      }

      setBusy(true)
      try {
        const response = await api.post(`/faculty/assessments/${assessmentId}/assign-reattempt`, {
          studentIds: reattemptStudentIds,
          setIndex: selectedReattemptSetIndex,
          departments: config.departments,
          startDate: config.startDate,
          endDate: config.endDate,
        })
        if (!response.ok) {
          setError(response.data?.message || 'Unable to assign retest questions')
          return
        }
        const resultSearchParams = new URLSearchParams()
        const sourceSetIndex = Number(location.state?.sourceSetIndex)
        if (Number.isInteger(sourceSetIndex) && sourceSetIndex >= 0) {
          resultSearchParams.set('setIndex', String(sourceSetIndex))
        }
        if (reattemptStudentIds[0]) {
          resultSearchParams.set('studentId', reattemptStudentIds[0])
        }
        navigate(`/faculty/assessments/results/${assessmentId}?${resultSearchParams.toString()}`, {
          state: { status: response.data?.message || 'Retest questions assigned successfully.' },
        })
      } catch {
        setError('Unable to assign retest questions. Check your connection and try again.')
      } finally {
        setBusy(false)
      }
      return
    }

    const configuredSets = []
    for (const setIndex of availableSetIndexes) {
      const config = setConfigs[setIndex] || { departments: [], studentIds: [], startDate: '', endDate: '' }
      const hasDepartments = config.departments.length > 0
      const hasStudents = config.studentIds.length > 0
      const hasStart = Boolean(config.startDate)
      const hasEnd = Boolean(config.endDate)

      if ((hasDepartments || hasStudents || hasStart || hasEnd) && !(hasDepartments && hasStudents && hasStart && hasEnd)) {
        setError(`Set ${setIndex + 1}: Select a department and at least one student, then enter both dates.`)
        return
      }
      if (!(hasDepartments || hasStudents || hasStart || hasEnd)) continue

      const startDate = new Date(config.startDate)
      const endDate = new Date(config.endDate)
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setError(`Set ${setIndex + 1}: Enter valid start and end dates.`)
        return
      }
      if (startDate <= new Date()) {
        setError(`Set ${setIndex + 1}: Start date must be in the future.`)
        return
      }
      if (endDate <= startDate) {
        setError(`Set ${setIndex + 1}: End date must be after start date.`)
        return
      }

      configuredSets.push({
        setIndex,
        departments: config.departments,
        studentIds: config.studentIds.map(String),
        startDate: config.startDate,
        endDate: config.endDate,
      })
    }

    if (!configuredSets.length) {
      setError('Please configure at least one set before assigning.')
      return
    }

    setBusy(true)
    try {
      const response = await api.post(`/faculty/assessments/${assessmentId}/assign-sets`, { sets: configuredSets })
      if (!response.ok) {
        setError(response.data?.message || `Assignment failed (HTTP ${response.status})`)
        return
      }
      setStatus(response.data?.message || 'Assessment assigned successfully.')
      window.setTimeout(() => navigate('/faculty/assessments'), 700)
    } catch {
      setError('Assignment failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !assessment) return <div className="alert error" role="alert">{error}</div>
  if (!assessment) return <div className="loading">Loading assignment...</div>

  const hasLegacyAssignment = !(assessment.setAssignments || []).some((assignment) =>
    assignment.assignedStudents?.length || assignment.departments?.length
  ) && Boolean(assessment.assignedStudents?.length)
  const assignedSetIndexes = getAssignedSetIndexes(assessment)
  const allSetIndexes = (assessment.questionSets || []).map((_, index) => index)

  return (
    <div className={`admin-assessment-workflow-page admin-assessment-assign-page faculty-assessment-workflow-page${reattempt ? ' admin-assessment-assign-page--reattempt' : ''}`}>
      <div className="page-title assessment-workflow-page-title">
        <div>
          <h1>Assign Assessment</h1>
          <div className="muted">{reattempt ? 'Remaining Questions · Retest' : 'Unassigned Sets'}</div>
        </div>
        <AssessmentIllustration variant="edit" />
        <Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {status && <div className="alert success" role="status">{status}</div>}
      {!reattempt && hasLegacyAssignment && (
        <div className="alert error" role="alert">
          This assessment already has an assignment that is not associated with question sets and cannot be assigned again.
        </div>
      )}
      {!reattempt && !assessment.questionSets?.length && (
        <div className="alert error" role="alert">
          This assessment has no question sets to assign.
        </div>
      )}
      {!reattempt && !availableSetIndexes.length && !hasLegacyAssignment && (
        assessment.questionSets?.length > 0 && (
          <div className="alert error" role="alert">All question sets are already assigned.</div>
        )
      )}
      {!reattempt && availableSetIndexes.length > 0 && !departments.length && (
        <div className="alert error" role="alert">No department has been assigned to your faculty account. Contact an administrator.</div>
      )}
      {!reattempt && availableSetIndexes.length > 0 && departments.length > 0 && !students.length && (
        <div className="alert info" role="status">No active students are assigned to your department.</div>
      )}

      {!reattempt && allSetIndexes.length > 0 && (
        <div className="assessment-set-summary faculty-set-assignment-status">
          {allSetIndexes.map((setIndex) => {
            const assignment = (assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex)
            const isAssigned = assignedSetIndexes.has(setIndex)
            return (
              <span key={setIndex}>
                Set {setIndex + 1}: <strong>{isAssigned
                  ? `Assigned${assignment?.departments?.length ? ` · ${assignment.departments.join(', ')}` : ''}`
                  : 'Available'}</strong>
              </span>
            )
          })}
        </div>
      )}

      {reattempt && reattemptSetIndexes.length > 0 && (
        <div className="card">
          <table className="assignment-table assignment-table-reattempt">
            <thead><tr><th>Set</th><th>View Questions</th><th>Status</th><th>Departments</th><th>Start Date</th><th>End Date</th></tr></thead>
            <tbody>
              {reattemptSetIndexes.map((setIndex) => {
                const available = availableSetIndexes.includes(setIndex)
                const selectedCount = reattemptStudentIds.filter((studentId) =>
                  reattemptStudentSetAssignments[studentId]?.includes(setIndex)
                ).length
                const assignedToAll = reattemptStudentIds.length > 0 && selectedCount === reattemptStudentIds.length
                return (
                  <tr key={setIndex} className={available ? '' : 'reattempt-set-unavailable'}>
                  <td className="set-label" data-label="Set">
                    <button
                      type="button"
                      className={`reattempt-set-select${selectedReattemptSetIndex === setIndex ? ' selected' : ''}`}
                      aria-pressed={selectedReattemptSetIndex === setIndex}
                      disabled={busy || !available}
                      onClick={() => setSelectedReattemptSetIndex((current) => current === setIndex ? null : setIndex)}
                    >
                      Set {setIndex + 1}
                    </button>
                  </td>
                  <td data-label="View Questions">
                    <button
                      type="button"
                      className="view-questions-button"
                      title="View Questions"
                      aria-label={`View Questions for Set ${setIndex + 1}`}
                      onClick={() => viewSetQuestions(setIndex)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>View Questions</span>
                    </button>
                  </td>
                  <td data-label="Status">
                    <span className={`reattempt-set-status${assignedToAll ? ' assigned' : available ? ' available' : ' unavailable'}`}>
                      {assignedToAll
                        ? 'Already Assigned'
                        : available
                          ? 'Available'
                          : selectedCount ? 'Assigned to some selected students' : 'Unavailable'}
                    </span>
                  </td>
                  <td data-label="Departments">{departments.join(', ') || '—'}</td>
                  <td data-label="Start Date">
                    {available && <input
                      aria-label={`Set ${setIndex + 1} retest start date`}
                      type="datetime-local"
                      value={setConfigs[setIndex]?.startDate || ''}
                      disabled={busy}
                      onChange={(event) => updateDate(setIndex, 'startDate', event.target.value)}
                    />}
                    {!available && (assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex)?.startDate
                      ? new Date((assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex).startDate).toLocaleString()
                      : ''}
                  </td>
                  <td data-label="End Date">
                    {available && <input
                      aria-label={`Set ${setIndex + 1} retest end date`}
                      type="datetime-local"
                      value={setConfigs[setIndex]?.endDate || ''}
                      disabled={busy}
                      onChange={(event) => updateDate(setIndex, 'endDate', event.target.value)}
                    />}
                    {!available && (assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex)?.endDate
                      ? new Date((assessment.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex).endDate).toLocaleString()
                      : ''}
                  </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!availableSetIndexes.length && <p className="muted mt">No remaining question sets are available for the selected students.</p>}
          <div className="form-actions">
            <button
              className="btn primary"
              disabled={busy || !availableSetIndexes.length || !Number.isInteger(selectedReattemptSetIndex)}
              onClick={assign}
            >
              {busy ? 'Assigning...' : 'Assign Retest Questions'}
            </button>
          </div>
        </div>
      )}

      {!reattempt && availableSetIndexes.length > 0 && (
        <div className="card">
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Set</th>
                <th>View Questions</th>
                <th className="department-heading">Departments</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {availableSetIndexes.map((setIndex) => (
                <Fragment key={setIndex}>
                <tr
                  className={openDropdowns[setIndex] ? 'department-dropdown-row-open' : ''}
                >
                  <td className="set-label" data-label="Set">Set {setIndex + 1}</td>
                  <td data-label="View Questions">
                    <button
                      type="button"
                      className="view-questions-button"
                      title="View Questions"
                      aria-label={`View Questions for Set ${setIndex + 1}`}
                      onClick={() => viewSetQuestions(setIndex)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>View Questions</span>
                    </button>
                  </td>
                  <td className="department-cell" data-label="Departments">
                    <div className="department-dropdown" ref={(element) => { dropdownRefs.current[setIndex] = element }}>
                      <button
                        type="button"
                        className="dropdown-button"
                        aria-expanded={Boolean(openDropdowns[setIndex])}
                        disabled={busy || !departments.length}
                        onClick={() => setOpenDropdowns((current) => ({
                          ...current,
                          [setIndex]: !current[setIndex],
                        }))}
                      >
                        {setConfigs[setIndex]?.departments?.[0] || 'Select Department'}
                        <span className="dropdown-arrow">▼</span>
                      </button>
                      {openDropdowns[setIndex] && (
                        <div className="dropdown-panel">
                          {departments.map((department) => (
                            <label key={department} className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={setConfigs[setIndex]?.departments?.includes(department) || false}
                                disabled={busy}
                                onChange={() => toggleDepartment(setIndex, department)}
                              />
                              <span>{department}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td data-label="Start Date">
                    <input
                      aria-label={`Set ${setIndex + 1} start date`}
                      type="datetime-local"
                      value={setConfigs[setIndex]?.startDate || ''}
                      disabled={busy}
                      onChange={(event) => updateDate(setIndex, 'startDate', event.target.value)}
                    />
                  </td>
                  <td data-label="End Date">
                    <input
                      aria-label={`Set ${setIndex + 1} end date`}
                      type="datetime-local"
                      value={setConfigs[setIndex]?.endDate || ''}
                      disabled={busy}
                      onChange={(event) => updateDate(setIndex, 'endDate', event.target.value)}
                    />
                  </td>
                </tr>
                <tr className="faculty-assignment-students-row">
                  <td colSpan="5">
                    {(() => {
                      const config = setConfigs[setIndex] || { departments: [], studentIds: [] }
                      const availableStudents = getAvailableStudentsForSet(setIndex)
                      const selectedIds = new Set(config.studentIds.map(String))
                      return (
                        <div className="faculty-assignment-student-selection">
                          <div className="row between">
                            <div>
                              <h3>Eligible {config.departments[0] || 'department'} students</h3>
                              <p className="muted">Selected students for Set {setIndex + 1}: {selectedIds.size}</p>
                            </div>
                            <div className="row">
                              <button
                                type="button"
                                className="btn small secondary"
                                disabled={busy || !config.departments.length || !availableStudents.length}
                                onClick={() => setSetConfigs((current) => ({
                                  ...current,
                                  [setIndex]: {
                                    ...current[setIndex],
                                    studentIds: [...new Set([
                                      ...(current[setIndex]?.studentIds || []),
                                      ...availableStudents.map((student) => String(student._id)),
                                    ])],
                                  },
                                }))}
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                className="btn small secondary"
                                disabled={busy || !selectedIds.size}
                                onClick={() => setSetConfigs((current) => ({
                                  ...current,
                                  [setIndex]: { ...current[setIndex], studentIds: [] },
                                }))}
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          {!config.departments.length ? (
                            <p className="muted">Select your authorized department to view eligible students.</p>
                          ) : availableStudents.length || selectedIds.size ? (
                            <div className="table-wrap">
                              <table>
                                <thead><tr><th>Select</th><th>Student</th><th>Email</th><th>Department</th></tr></thead>
                                <tbody>
                                  {students
                                    .filter((student) => selectedIds.has(String(student._id)) || availableStudents.some((available) =>
                                      String(available._id) === String(student._id)
                                    ))
                                    .map((student) => (
                                      <tr key={student._id}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            aria-label={`Select ${student.name} for Set ${setIndex + 1}`}
                                            checked={selectedIds.has(String(student._id))}
                                            disabled={busy}
                                            onChange={(event) => toggleStudent(setIndex, student._id, event.target.checked)}
                                          />
                                        </td>
                                        <td>{student.name}</td>
                                        <td>{student.email || '—'}</td>
                                        <td>{student.department || '—'}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="muted">No unassigned students are available in this department.</p>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="form-actions">
            <button
              className="btn primary"
              disabled={busy || !departments.length || !students.length || hasLegacyAssignment}
              onClick={assign}
            >
              {busy ? 'Assigning...' : 'Assign Assessment'}
            </button>
          </div>
        </div>
      )}

      <dialog
        className="question-preview-dialog"
        ref={questionDialogRef}
        onClose={() => setQuestionPreview(null)}
        aria-labelledby="faculty-question-preview-title"
      >
        {questionPreview && (
          <div className="question-preview-content">
            <div className="row between">
              <h2 id="faculty-question-preview-title">Set {questionPreview.setIndex + 1} - Questions</h2>
              <button className="btn small secondary" onClick={closeQuestionPreview}>Close</button>
            </div>
            {questionPreview.questions.length ? (
              <ol className="question-preview-list">
                {questionPreview.questions.map((question) => (
                  <li key={question._id}>
                    <p>{question.question}</p>
                    <div className="question-preview-meta">
                      {question.topic || 'No topic'} · {question.difficulty || 'Difficulty not set'}
                    </div>
                    <ol type="A">
                      {(question.options || []).map((option, index) => (
                        <li key={`${question._id}-${index}`}>{option}</li>
                      ))}
                    </ol>
                    <p className="question-preview-answer">
                      <strong>Correct Answer:</strong> {question.correctAnswer || 'Not set'}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">No questions are configured for this set.</p>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
