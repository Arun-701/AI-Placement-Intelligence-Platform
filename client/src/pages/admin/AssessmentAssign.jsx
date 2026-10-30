import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { getQuestionSetQuestionIds, getUnassignedSetIndexes } from '../../assessmentSets'
import AssessmentIllustration from './AssessmentIllustration'
import './AssessmentAssign.css'

// Helper function to calculate number of sets consistently
const calculateNumSets = (assessment) => {
  if (!assessment) return 0
  return assessment.questionSets?.length || 0
}

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function AdminAssessmentAssign({ reattempt = false }) {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [assessment, setAssessment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [questionPreview, setQuestionPreview] = useState(null)

  // Configuration for each set (assuming assessment has questionSets)
  const [setConfigs, setSetConfigs] = useState({})
  const [reattemptSetIndexes, setReattemptSetIndexes] = useState([])
  const [availableReattemptSetIndexes, setAvailableReattemptSetIndexes] = useState([])
  const [assignedReattemptSetIndexes, setAssignedReattemptSetIndexes] = useState([])
  const [reattemptStudentSetAssignments, setReattemptStudentSetAssignments] = useState({})
  const [selectedReattemptSetIndex, setSelectedReattemptSetIndex] = useState(null)
  const [reattemptStudentIds, setReattemptStudentIds] = useState([])

  // Dropdown state for department selector
  const [openDropdowns, setOpenDropdowns] = useState({})
  const dropdownRefs = useRef({})
  const questionDialogRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        let item
        let eligibleIndexes = []
        let selectedStudents = []

        if (reattempt) {
          const studentIds = Array.isArray(location.state?.studentIds)
            ? [...new Set(location.state.studentIds.map(String))]
            : []
          if (!studentIds.length) {
            setError('Select requested students from Assessment Results before assigning questions.')
            return
          }
          const deptRequest = api.get('/admin/assessments/departments')
          const [optionsResponse, deptRes] = await Promise.all([
            api.post(`/admin/assessments/${assessmentId}/reattempt-options`, { studentIds }),
            deptRequest,
          ])
          if (cancelled) return
          if (!optionsResponse.ok) {
            setError(optionsResponse.data?.message || 'Unable to load remaining question sets')
            return
          }
          const options = optionsResponse.data?.data
          item = options?.assessment
          eligibleIndexes = Array.isArray(options?.setIndexes) ? options.setIndexes : []
          selectedStudents = Array.isArray(options?.students) ? options.students : []
          setReattemptStudentIds(studentIds)
          if (!item) {
            setError('Assessment not found')
            return
          }
          if (deptRes.ok) setDepartments(deptRes.data?.data || [])
          setReattemptSetIndexes(eligibleIndexes)
          setAvailableReattemptSetIndexes(Array.isArray(options?.availableSetIndexes) ? options.availableSetIndexes : [])
          setAssignedReattemptSetIndexes(Array.isArray(options?.assignedSetIndexes) ? options.assignedSetIndexes : [])
          setReattemptStudentSetAssignments(options?.studentSetAssignments || {})
        } else {
          const deptRequest = api.get('/admin/assessments/departments')
          const [assessmentRes, deptRes] = await Promise.all([
            api.get('/admin/assessments'),
            deptRequest,
          ])
          if (cancelled) return
          if (!assessmentRes.ok) {
            setError(assessmentRes.data?.message || 'Assessment not found')
            return
          }
          item = assessmentRes.data?.data?.find((entry) => entry._id === assessmentId)
          if (!item) {
            setError('Assessment not found')
            return
          }
          if (deptRes.ok) setDepartments(deptRes.data?.data || [])
        }

        if (cancelled) return

        setAssessment(item)

        const configs = {}
        const configIndexes = reattempt ? eligibleIndexes : getUnassignedSetIndexes(item)
        const studentDepartments = [...new Set(selectedStudents.map((student) => student.department).filter(Boolean))]
        for (const setIndex of configIndexes) {
          const setConfig = item.questionSets?.[setIndex] || {}
          configs[setIndex] = {
            departments: reattempt
              ? studentDepartments
              : Array.isArray(setConfig.departments) ? setConfig.departments : [],
            startDate: toDateTimeLocal(setConfig.startDate),
            endDate: toDateTimeLocal(setConfig.endDate),
          }
        }
        setSetConfigs(configs)
      } catch {
        if (!cancelled) setError('Unable to load assessment')
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [assessmentId, location.state, navigate, reattempt])

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (e) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(e.target)) {
          setOpenDropdowns((prev) => ({ ...prev, [key]: false }))
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

  const viewSetQuestions = async (setIndex) => {
    setQuestionPreview({ setIndex, questions: [], loading: true, error: '' })

    try {
      const response = await api.get(`/admin/assessments/${assessmentId}/details`)
      if (!response.ok) {
        setQuestionPreview({ setIndex, questions: [], loading: false, error: response.data?.message || 'Unable to load questions' })
        return
      }

      const questionIds = getQuestionSetQuestionIds(assessment.questionSets[setIndex])
      const questionsById = new Map(
        (response.data?.data?.assessment?.questions || []).map((question) => [String(question._id), question])
      )
      const questions = questionIds
        .map((question) => questionsById.get(String(question?._id || question)))
        .filter(Boolean)

      setQuestionPreview({ setIndex, questions, loading: false, error: '' })
    } catch {
      setQuestionPreview({ setIndex, questions: [], loading: false, error: 'Unable to load questions' })
    }
  }

  const closeQuestionPreview = () => {
    questionDialogRef.current?.close()
    setQuestionPreview(null)
  }

  const toggleDepartment = (setIndex, dept) => {
    setSetConfigs((prev) => ({
      ...prev,
      [setIndex]: {
        ...prev[setIndex],
        departments: prev[setIndex].departments.includes(dept)
          ? prev[setIndex].departments.filter((d) => d !== dept)
          : [...prev[setIndex].departments, dept],
      },
    }))
  }

  const handleDateChange = (setIndex, field, value) => {
    setSetConfigs((prev) => ({
      ...prev,
      [setIndex]: { ...prev[setIndex], [field]: value },
    }))
  }

  const handleAssign = async () => {
    setError('')

    const unassignedSetIndexes = reattempt ? reattemptSetIndexes : getUnassignedSetIndexes(assessment)

    if (reattempt) {
      if (!availableReattemptSetIndexes.length) {
        setError('No Retest Available. All question sets for this assessment have already been assigned to the selected student(s).')
        return
      }
      if (!Number.isInteger(selectedReattemptSetIndex)) {
        setError('Select one remaining question set to assign.')
        return
      }
      const config = setConfigs[selectedReattemptSetIndex]
      if (!config?.departments?.length || !config.startDate || !config.endDate) {
        setError(`Please complete Set ${selectedReattemptSetIndex + 1}.`)
        return
      }
      const startDate = new Date(config.startDate)
      const endDate = new Date(config.endDate)
      if (startDate <= new Date() || endDate <= startDate) {
        setError(`Set ${selectedReattemptSetIndex + 1}: Choose a future start date and an end date after it.`)
        return
      }

      setBusy(true)
      try {
        const response = await api.post(`/admin/assessments/${assessmentId}/assign-reattempt`, {
          studentIds: reattemptStudentIds,
          setIndex: selectedReattemptSetIndex,
          departments: config.departments,
          startDate: config.startDate,
          endDate: config.endDate,
        })
        if (!response.ok) {
          setError(response.data?.message || 'Unable to assign re-attempt questions')
          return
        }
        window.alert('Re-attempt questions assigned successfully.')
        navigate('/admin/assessments')
      } catch (err) {
        setError(err.message || 'Unable to assign re-attempt questions')
      } finally {
        setBusy(false)
      }
      return
    }

    // Check for partially filled sets
    for (const setIndex of unassignedSetIndexes) {
      const config = setConfigs[setIndex]
      const hasDepts = config.departments?.length > 0
      const hasStart = config.startDate?.trim()
      const hasEnd = config.endDate?.trim()

      // If any field is filled, all must be filled
      if ((hasDepts || hasStart || hasEnd) && !(hasDepts && hasStart && hasEnd)) {
        setError(`Please complete Set ${setIndex + 1} or clear its fields.`)
        return
      }
    }

    // Collect only configured sets
    const configuredSets = []
    for (const setIndex of unassignedSetIndexes) {
      const config = setConfigs[setIndex]
      if (config.departments?.length && config.startDate && config.endDate) {
        // Validate dates for configured sets
        const startDate = new Date(config.startDate)
        const endDate = new Date(config.endDate)

        if (endDate <= startDate) {
          setError(`Set ${setIndex + 1}: End date must be after start date`)
          return
        }

        configuredSets.push({
          setIndex,
          departments: config.departments,
          startDate: config.startDate,
          endDate: config.endDate,
        })
      }
    }

    // At least one set must be configured
    if (configuredSets.length === 0) {
      setError('Please configure at least one set before assigning')
      return
    }

    setBusy(true)

    try {
      console.log('=== ASSIGNMENT REQUEST ===')
      console.log('Assessment ID:', assessmentId)
      console.log('Configured Sets:', configuredSets)

      const response = await api.post(`/admin/assessments/${assessmentId}/assign-sets`, { sets: configuredSets })

      console.log('=== ASSIGNMENT RESPONSE ===')
      console.log('HTTP Status:', response.status)
      console.log('Response OK:', response.ok)
      console.log('Response Data:', response.data)

      if (!response.ok) {
        const errorMsg = response.data?.message || 'Assignment failed'
        console.error('Assignment Error:', errorMsg)
        setError(errorMsg)
        return
      }

      alert('✓ Assessment assigned successfully')
      navigate('/admin/assessments')
    } catch (err) {
      console.error('Assignment Exception:', err)
      setError(err.message || 'Assignment failed')
    } finally {
      setBusy(false)
    }
  }

  if (error && !assessment) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading...</div>

  const numSets = calculateNumSets(assessment)
  const unassignedSetIndexes = getUnassignedSetIndexes(assessment)

  if (!reattempt && numSets === 0) return <div className="alert error">This assessment has no questions. Please add questions first before assigning.</div>
  if (!reattempt && unassignedSetIndexes.length === 0) return <div className="alert error">All question sets are already assigned.</div>
  const displayedSetIndexes = reattempt ? reattemptSetIndexes : unassignedSetIndexes
  const questionSetIndexesWithQuestions = reattempt
    ? displayedSetIndexes.filter((setIndex) => getQuestionSetQuestionIds(assessment.questionSets?.[setIndex]).length > 0)
    : []
  const noRetestAvailable = reattempt
    && questionSetIndexesWithQuestions.length > 0
    && availableReattemptSetIndexes.length === 0
  const noQuestionSetsAvailable = reattempt && questionSetIndexesWithQuestions.length === 0
  const onlySetAlreadyAssigned = noRetestAvailable
    && calculateNumSets(assessment) === 1
    && assignedReattemptSetIndexes.includes(0)
  const allQuestionSetsAssigned = questionSetIndexesWithQuestions.length > 0
    && questionSetIndexesWithQuestions.every((setIndex) => reattemptStudentIds.every((studentId) =>
      reattemptStudentSetAssignments[studentId]?.includes(setIndex)
    ))
  const canAssignSelectedReattemptSet = reattempt
    && Number.isInteger(selectedReattemptSetIndex)
    && availableReattemptSetIndexes.includes(selectedReattemptSetIndex)

  return (
    <div className={`admin-assessment-workflow-page admin-assessment-assign-page${reattempt ? ' admin-assessment-assign-page--reattempt' : ''}`}>
      <div className="page-title assessment-workflow-page-title">
        <div>
          <h1>{reattempt ? 'Assign Questions' : 'Assign Assessment'}</h1>
          <div className="muted">{reattempt ? 'Remaining Questions · Re-attempt' : 'Unassigned Sets'}</div>
        </div>
        <AssessmentIllustration variant="edit" />
        <Link className="btn secondary" to="/admin/assessments">
          Back to Assessments
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}
      {noRetestAvailable && (
        <div className="alert info" role="status">
          <strong>No Retest Available</strong>
          <p>{onlySetAlreadyAssigned
            ? 'This assessment has only one question set, and it has already been assigned to the selected student(s). A retest cannot be conducted because there are no remaining question sets.'
            : allQuestionSetsAssigned
              ? 'There are no remaining question sets available for the selected student(s).'
              : 'There are no remaining question sets with questions available for assignment.'}</p>
        </div>
      )}
      {noQuestionSetsAvailable && (
        <div className="alert info" role="status">
          This assessment has no question sets containing questions available for assignment.
        </div>
      )}

      <div className="card">
        <table className={`assignment-table${reattempt ? ' assignment-table-reattempt' : ''}`}>
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
            {displayedSetIndexes.map((setIndex) => {
              const assignedStudentCount = reattemptStudentIds.filter((studentId) =>
                reattemptStudentSetAssignments[studentId]?.includes(setIndex)
              ).length
              const assignedToAllSelected = reattemptStudentIds.length > 0 && assignedStudentCount === reattemptStudentIds.length
              const assignedToSomeSelected = assignedStudentCount > 0 && !assignedToAllSelected
              return (
              <tr
                className={`${openDropdowns[setIndex] ? 'department-dropdown-row-open ' : ''}${reattempt && !availableReattemptSetIndexes.includes(setIndex) ? 'reattempt-set-unavailable' : ''}`}
                key={setIndex}
              >
                <td className="set-label" data-label="Set">
                  {reattempt ? (
                    <div className="reattempt-set-selection">
                      <input
                        type="checkbox"
                        aria-label={`Select Set ${setIndex + 1}`}
                        checked={selectedReattemptSetIndex === setIndex}
                        disabled={!availableReattemptSetIndexes.includes(setIndex)}
                        onChange={() => setSelectedReattemptSetIndex((current) => current === setIndex ? null : setIndex)}
                      />
                      <span>Set {setIndex + 1}</span>
                      <span className={`reattempt-set-status${assignedToAllSelected ? ' assigned' : availableReattemptSetIndexes.includes(setIndex) ? ' available' : ' unavailable'}`}>
                        {assignedToAllSelected
                          ? 'Already Assigned'
                          : availableReattemptSetIndexes.includes(setIndex)
                            ? 'Available'
                            : assignedToSomeSelected ? 'Assigned to some selected students' : 'No Questions'}
                      </span>
                    </div>
                  ) : `Set ${setIndex + 1}`}
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
                <td className="department-cell">
                  <div
                    className="department-dropdown"
                    ref={(el) => (dropdownRefs.current[setIndex] = el)}
                  >
                    <button
                      type="button"
                      className="dropdown-button"
                      onClick={() =>
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [setIndex]: !prev[setIndex],
                        }))
                      }
                    >
                      {setConfigs[setIndex]?.departments?.length > 0 ? (
                        <>
                          {setConfigs[setIndex].departments.length === 1
                            ? setConfigs[setIndex].departments[0]
                            : `${setConfigs[setIndex].departments.length} Departments Selected`}
                        </>
                      ) : (
                        'Select Departments'
                      )}
                      <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdowns[setIndex] && (
                      <div className="dropdown-panel">
                        {departments.map((dept) => (
                          <label key={dept} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={setConfigs[setIndex]?.departments?.includes(dept) || false}
                              onChange={() => toggleDepartment(setIndex, dept)}
                            />
                            <span>{dept}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={setConfigs[setIndex]?.startDate || ''}
                    onChange={(e) => handleDateChange(setIndex, 'startDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={setConfigs[setIndex]?.endDate || ''}
                    onChange={(e) => handleDateChange(setIndex, 'endDate', e.target.value)}
                  />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

        <div className="form-actions">
          <button className="btn primary" disabled={busy || (reattempt && !canAssignSelectedReattemptSet)} onClick={handleAssign}>
            {busy ? 'Assigning...' : reattempt ? 'Assign Questions' : 'Assign Assessment'}
          </button>
        </div>
      </div>
      <dialog
        className="question-preview-dialog"
        ref={questionDialogRef}
        onClose={() => setQuestionPreview(null)}
        aria-labelledby="question-preview-title"
      >
        {questionPreview && (
          <div className="question-preview-content">
            <div className="row between">
              <h2 id="question-preview-title">Set {questionPreview.setIndex + 1} - Questions</h2>
              <button className="btn small secondary" onClick={closeQuestionPreview}>Close</button>
            </div>
            {questionPreview.loading ? (
              <p className="muted">Loading questions...</p>
            ) : questionPreview.error ? (
              <div className="alert error">{questionPreview.error}</div>
            ) : questionPreview.questions.length ? (
              <ol className="question-preview-list">
                {questionPreview.questions.map((question) => (
                  <li key={question._id}>
                    <p>{question.question}</p>
                    <div className="question-preview-meta">{question.topic || 'No topic'} · {question.difficulty || 'Difficulty not set'}</div>
                    <ol type="A">
                      {(question.options || []).map((option, index) => (
                        <li key={`${question._id}-${index}`}>{option}</li>
                      ))}
                    </ol>
                    <p className="question-preview-answer"><strong>Correct Answer:</strong> {question.correctAnswer || 'Not set'}</p>
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
