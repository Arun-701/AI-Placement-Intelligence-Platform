import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { getAssignedSetIndexes } from '../../assessmentSets'
import AssessmentIllustration from '../admin/AssessmentIllustration'
import '../admin/AssessmentAssign.css'
import '../admin/AssessmentWorkflow.css'

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function FacultyAssessmentEdit() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [title, setTitle] = useState('')
  const [setConfigs, setSetConfigs] = useState([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/faculty/assessments/${assessmentId}/details?refresh=${Date.now()}`)
      .then((response) => {
        if (!active) return
        if (!response.ok) {
          setError(response.data?.message || 'Unable to load assessment')
          return
        }
        const item = response.data.data.assessment
        setAssessment(item)
        setTitle(item.title || '')
        setSetConfigs([...getAssignedSetIndexes(item)].sort((left, right) => left - right).map((setIndex) => {
          const assignment = (item.setAssignments || []).find((entry) => Number(entry.setIndex) === setIndex)
          return {
            setIndex,
            startDate: toDateTimeLocal(assignment?.startDate || item.questionSets?.[setIndex]?.startDate || (item.questionSets?.length === 1 ? item.startDate : null)),
            endDate: toDateTimeLocal(assignment?.endDate || item.questionSets?.[setIndex]?.endDate || (item.questionSets?.length === 1 ? item.endDate : null)),
            studentCount: assignment?.assignedStudents?.length || item.assignedStudents?.length || 0,
          }
        }))
      })
      .catch(() => {
        if (active) setError('Unable to load assessment')
      })
    return () => { active = false }
  }, [assessmentId])

  const save = async () => {
    if (busy) return
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setError('Assessment title is required.')
      return
    }
    for (const config of setConfigs) {
      const startDate = new Date(config.startDate)
      const endDate = new Date(config.endDate)
      if (!config.startDate || !config.endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        setError(`Set ${config.setIndex + 1}: Choose valid start and end dates with the end after the start.`)
        return
      }
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const payload = { title: normalizedTitle }
      if (setConfigs.length) {
        payload.sets = setConfigs.map(({ setIndex, startDate, endDate }) => ({ setIndex, startDate, endDate }))
      }
      const response = await api.put(`/faculty/assessments/${assessmentId}/title`, payload)
      if (!response.ok) {
        setError(response.data?.message || 'Unable to update assessment')
        return
      }
      setStatus(response.data?.message || 'Assessment updated successfully.')
      window.setTimeout(() => navigate('/faculty/assessments'), 700)
    } catch {
      setError('Unable to update assessment. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !assessment) return <div className="alert error" role="alert">{error}</div>
  if (!assessment) return <div className="loading">Loading assessment...</div>

  return (
    <div className="admin-assessment-workflow-page faculty-assessment-workflow-page">
      <div className="page-title assessment-workflow-page-title">
        <div>
          <h1>Edit Assessment</h1>
          <div className="muted">{setConfigs.length ? 'Assigned Sets' : 'Update assessment name'}</div>
        </div>
        <AssessmentIllustration variant="edit" />
        <Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {status && <div className="alert success" role="status">{status}</div>}
      <div className="card">
        <div className="form-group">
          <label htmlFor="faculty-assessment-title">Assessment Name</label>
          <input
            id="faculty-assessment-title"
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {setConfigs.length > 0 && (
          <table className="assignment-table">
            <thead><tr><th>Set</th><th>Assigned Students</th><th>Start Date</th><th>End Date</th></tr></thead>
            <tbody>{setConfigs.map((config, index) => (
              <tr key={config.setIndex}>
                <td className="set-label" data-label="Set">Set {config.setIndex + 1}</td>
                <td data-label="Assigned Students">{config.studentCount}</td>
                <td data-label="Start Date"><input
                  type="datetime-local"
                  value={config.startDate}
                  disabled={busy}
                  onChange={(event) => setSetConfigs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item))}
                /></td>
                <td data-label="End Date"><input
                  type="datetime-local"
                  value={config.endDate}
                  disabled={busy}
                  onChange={(event) => setSetConfigs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endDate: event.target.value } : item))}
                /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <div className="form-actions">
          <Link className="btn secondary" to="/faculty/assessments">Cancel</Link>
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
