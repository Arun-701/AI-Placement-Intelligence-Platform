import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'

export default function FacultyAssessmentResults() {
  const { assessmentId } = useParams()
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => { api.get(`/faculty/assessments/${assessmentId}/details?refresh=${Date.now()}`).then((response) => response.ok ? setDetails(response.data.data) : setError(response.data?.message || 'Unable to load assessment results')).catch(() => setError('Unable to load assessment results')) }, [assessmentId])
  if (error) return <div className="alert error">{error}</div>
  if (!details) return <div className="loading">Loading assessment results...</div>
  const { assessment } = details
  const students = details.students.filter((entry) => statusFilter === 'ALL' || (statusFilter === 'ATTENDED' ? entry.status === 'Completed' : entry.status === 'Not Attended'))
  return <><div className="page-title"><div><h1>Assessment Results</h1><div className="subtitle">{assessment.title}</div></div><Link className="btn secondary" to="/faculty/assessments">Back to Assessments</Link></div><div className="card mb"><h3>{assessment.title}</h3><div className="stat-inline"><span>Department</span><strong>{assessment.department || 'Not assigned'}</strong></div><div className="stat-inline"><span>Total questions</span><strong>{assessment.totalQuestions}</strong></div><div className="stat-inline"><span>Duration</span><strong>{assessment.duration} minutes</strong></div><div className="stat-inline"><span>Deadline</span><strong>{formatDeadline(assessment.endDate)}</strong></div></div><div className="grid cols-4 mb"><div className="card"><strong>{assessment.assignedCount}</strong><div>Assigned</div></div><div className="card"><strong>{assessment.attendedCount}</strong><div>Attended</div></div><div className="card"><strong>{assessment.notAttendedCount}</strong><div>Not Attended</div></div><div className="card"><strong>{assessment.averagePercentage ?? '—'}{assessment.averagePercentage !== null ? '%' : ''}</strong><div>Average</div></div></div><div className="card"><div className="row between"><h3>Student Results</h3><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All</option><option value="ATTENDED">Attended / Completed</option><option value="NOT_ATTENDED">Not Attended</option></select></div>{students.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Status</th><th>Max Score</th><th>Score Obtained</th><th>Percentage</th></tr></thead><tbody>{students.map((entry) => <tr key={entry.student._id}><td>{entry.student.name}</td><td>{entry.status}</td><td>{entry.result?.totalMarks ?? '—'}</td><td>{entry.result?.score ?? '—'}</td><td>{entry.result ? `${entry.result.percentage}%` : '—'}</td></tr>)}</tbody></table></div> : <p className="muted mt">No students match the selected status.</p>}</div></>
}
