import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { getAssignedSetIndexes } from '../../assessmentSets'
import AssessmentIllustration from './AssessmentIllustration'
import './AssessmentAssign.css'
import './AssessmentWorkflow.css'

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function AdminAssessmentEdit() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [title, setTitle] = useState('')
  const [setConfigs, setSetConfigs] = useState([])
  const [openDropdowns, setOpenDropdowns] = useState({})
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const dropdownRefs = useRef({})

  useEffect(() => {
    let active = true
    Promise.all([
      api.get(`/admin/assessments/${assessmentId}/details?refresh=${Date.now()}`),
      api.get('/admin/assessments/departments')
    ]).then(([assessmentResponse, departmentResponse]) => {
      if (!active) return
      if (!assessmentResponse.ok) {
        setError(assessmentResponse.data?.message || 'Unable to load assessment')
        return
      }
      const item = assessmentResponse.data.data.assessment
      const questionSets = item.questionSets || []
      setAssessment(item)
      setTitle(item.title || '')
      setSetConfigs(questionSets.map((questionSet, setIndex) => {
        const assignment = (item.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex)
        const departmentsForSet = assignment?.departments || questionSet.departments || (questionSets.length === 1 && item.department
          ? item.department.split(',').map((department) => department.trim()).filter(Boolean)
          : [])
        return {
          setIndex,
          departments: [...departmentsForSet],
          startDate: toDateTimeLocal(assignment?.startDate || questionSet.startDate || (questionSets.length === 1 ? item.startDate : null)),
          endDate: toDateTimeLocal(assignment?.endDate || questionSet.endDate || (questionSets.length === 1 ? item.endDate : null))
        }
      }))
      if (departmentResponse.ok) setDepartments(departmentResponse.data?.data || [])
    }).catch(() => { if (active) setError('Unable to load assessment') })
    return () => { active = false }
  }, [assessmentId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
          setOpenDropdowns((previous) => ({ ...previous, [key]: false }))
        }
      })
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const questionSets = assessment?.questionSets || []
  const isAssigned = assessment && (getAssignedSetIndexes(assessment).size > 0 || (!questionSets.length && assessment.department && assessment.assignedStudents?.length))

  const toggleDepartment = (setIndex, department) => {
    setSetConfigs((previous) => previous.map((config, index) => index !== setIndex ? config : {
      ...config,
      departments: config.departments.includes(department)
        ? config.departments.filter((entry) => entry !== department)
        : [...config.departments, department]
    }))
  }

  const updateSetConfig = (setIndex, field, value) => {
    setSetConfigs((previous) => previous.map((config, index) => index === setIndex ? { ...config, [field]: value } : config))
  }

  const save = async () => {
    if (!title.trim()) return setError('Assessment title is required.')
    setBusy(true)
    setError('')
    setStatus('')
    const payload = { title: title.trim() }
    if (isAssigned) payload.sets = setConfigs

    const response = await api.put(`/admin/assessments/edit/${assessmentId}`, payload)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to update assessment')
    setStatus(response.data?.message || 'Assessment updated successfully.')
    window.setTimeout(() => navigate('/admin/assessments'), 700)
  }

  if (error && !assessment) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading assessment...</div>

  return <div className="admin-assessment-edit-page admin-assessment-workflow-page">
    <div className="page-title assessment-workflow-page-title">
      <div><h1>Edit Assessment</h1><div className="muted">{isAssigned ? 'Assigned Sets' : 'Update assessment name'}</div></div>
      <AssessmentIllustration variant="edit" />
      <Link className="btn secondary" to="/admin/assessments">Back to Assessments</Link>
    </div>
    {error && <div className="alert error">{error}</div>}
    {status && <div className="alert success">{status}</div>}
    <div className="card">
      <div className="form-group">
        <label>Assessment Name</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>

      {isAssigned && questionSets.length > 0 && <table className="assignment-table">
        <thead>
          <tr><th>Set</th><th>Departments</th><th>Start Date</th><th>End Date</th></tr>
        </thead>
        <tbody>
          {questionSets.map((questionSet, setIndex) => {
            const config = setConfigs[setIndex] || { departments: [], startDate: '', endDate: '' }
            const departmentOptions = [...new Set([...departments, ...config.departments])]
            return <tr key={questionSet._id || questionSet.setNumber || setIndex}>
              <td className="set-label" data-label="Set">Set {setIndex + 1}</td>
              <td className="department-cell" data-label="Departments">
                <div className="department-dropdown" ref={(element) => { dropdownRefs.current[setIndex] = element }}>
                  <button type="button" className="dropdown-button" onClick={() => setOpenDropdowns((previous) => ({ ...previous, [setIndex]: !previous[setIndex] }))}>
                    {config.departments.length === 1 ? config.departments[0] : config.departments.length ? `${config.departments.length} Departments Selected` : 'Select Departments'}
                    <span className="dropdown-arrow">▼</span>
                  </button>
                  {openDropdowns[setIndex] && <div className="dropdown-panel">
                    {departmentOptions.map((department) => <label key={department} className="checkbox-item">
                      <input type="checkbox" checked={config.departments.includes(department)} onChange={() => toggleDepartment(setIndex, department)} />
                      <span>{department}</span>
                    </label>)}
                  </div>}
                </div>
              </td>
              <td data-label="Start Date"><input type="datetime-local" value={config.startDate} onChange={(event) => updateSetConfig(setIndex, 'startDate', event.target.value)} /></td>
              <td data-label="End Date"><input type="datetime-local" value={config.endDate} onChange={(event) => updateSetConfig(setIndex, 'endDate', event.target.value)} /></td>
            </tr>
          })}
        </tbody>
      </table>}

      <div className="form-actions">
        <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  </div>
}
