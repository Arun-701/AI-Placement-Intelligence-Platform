import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import './AssessmentList.css'

const formatAssessmentDate = (value) => {
  if (!value) return ''
  return new Date(value)
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\b(am|pm)\b/, (period) => period.toUpperCase())
}

export default function AssessmentList() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [requestingAssessmentId, setRequestingAssessmentId] = useState('')

  useEffect(() => {
    let active = true

    const loadAssessments = async () => {
      try {
        const r = await api.get('/assessment/my')
        if (!active) return
        if (r.ok) setItems(r.data?.data?.assessments ?? r.data?.data ?? [])
        else setError(r.data?.message || 'Failed to load assessments')
      } catch {
        if (active) setError('Failed to load assessments')
      }
    }

    loadAssessments()
    return () => { active = false }
  }, [])

  const requestToAttend = async (assessmentId) => {
    setRequestingAssessmentId(assessmentId)
    try {
      const response = await api.post(`/assessment/${assessmentId}/request-to-attend`, {})
      if (!response.ok) {
        setError(response.data?.message || 'Unable to submit attendance request')
        return
      }
      setItems((current) => current.map((item) => item._id === assessmentId
        ? { ...item, requestStatus: 'Requested' }
        : item))
    } catch {
      setError('Unable to submit attendance request')
    } finally {
      setRequestingAssessmentId('')
    }
  }

  if (error) return <div className="alert error">{error}</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>My Assessments</h1>
          <div className="subtitle">Assigned and available assessments</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No assessments assigned to you yet. Faculty will assign assessments to you.</p></div>
      ) : (
        <div className="grid">
          {items.map((a) => (
            <div className="card row between" key={a._id}>
              <div>
                <h3>{a.title}</h3>
                {Number.isInteger(a.assignedSetIndex) && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set {a.assignedSetIndex + 1}</div>
                )}
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {a.assessmentType} · {a.duration} min · {a.totalMarks ?? '—'} marks
                </div>
                {a.description && <p className="mt" style={{ fontSize: 14 }}>{a.description}</p>}
              </div>
              {a.attempted ? (
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span className={`badge ${a.percentage >= 60 ? 'green' : 'red'}`}>Completed · {a.percentage}%</span>
                    {a.resultId && <Link className="btn small mt" to={`/student/assessments/result/${a.resultId}`}>View Result</Link>}
                  </div>
                </div>
              ) : (
                <div className="assessment-card-actions">
                  <div className="assessment-date-boxes">
                    {a.startDate && (
                      <div className="assessment-date-box assessment-date-start">
                        <span className="assessment-date-label">START:</span>
                        <time>{formatAssessmentDate(a.startDate)}</time>
                      </div>
                    )}
                    {a.endDate && (
                      <div className="assessment-date-box assessment-date-end">
                        <span className="assessment-date-label">END:</span>
                        <time>{formatAssessmentDate(a.endDate)}</time>
                      </div>
                    )}
                  </div>
                  {a.reattemptAssigned ? (
                    a.startDate && new Date(a.startDate) > new Date() ? (
                      <button
                        className="btn small"
                        onClick={() => window.alert(`Re-attempt has not started yet.\n\nIt will start on ${formatAssessmentDate(a.startDate).replace(', ', ' at ')}.`)}
                      >
                        Start Test
                      </button>
                    ) : (
                      <Link className="btn small" to={`/student/assessments/${a._id}/take`}>Start Test</Link>
                    )
                  ) : a.expired ? (
                    <>
                      <span className="badge red">Expired</span>
                      {a.requestStatus === 'Requested' ? (
                        <span className="badge blue">Request to Attend · Requested</span>
                      ) : a.requestStatus === 'Cancelled' ? (
                        <div className="assessment-request-cancelled" role="status">
                          <span className="badge red">Request Cancelled</span>
                          <p>{a.requestMessage || 'Your retest request was cancelled.'}</p>
                        </div>
                      ) : !a.retestAvailable ? (
                        <div className="assessment-request-cancelled" role="status">
                          <span className="badge red">No Retest Available</span>
                          <p>Retest cannot be conducted because no question sets remain.</p>
                        </div>
                      ) : a.canRequestAttendance ? (
                        <button
                          className="btn small secondary"
                          disabled={requestingAssessmentId === a._id}
                          onClick={() => requestToAttend(a._id)}
                        >
                          {requestingAssessmentId === a._id ? 'Requesting...' : 'Request to Attend'}
                        </button>
                      ) : null}
                    </>
                  ) : a.startDate && new Date(a.startDate) > new Date() ? (
                    <button
                      className="btn small"
                      onClick={() => window.alert(`Test has not started yet.\n\nThis test will start on ${formatAssessmentDate(a.startDate).replace(', ', ' at ')}.`)}
                    >
                      Start Test
                    </button>
                  ) : (
                    <Link className="btn small" to={`/student/assessments/${a._id}/take`}>Start Test</Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
