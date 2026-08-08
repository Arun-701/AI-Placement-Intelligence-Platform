import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'

export default function AssessmentList() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/assessment/my').then((r) => {
      if (r.ok) setItems(r.data.data.assessments || r.data.data || [])
      else setError(r.data?.message || 'Failed to load assessments')
    })
  }, [])

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
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {a.assessmentType} · {a.duration} min · {a.totalMarks ?? '—'} marks
                </div>
                {a.description && <p className="mt" style={{ fontSize: 14 }}>{a.description}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {a.attempted ? (
                  <span className={`badge ${a.percentage >= 60 ? 'green' : 'red'}`}>Completed · {a.percentage}%</span>
                ) : (
                  <Link className="btn small" to={`/student/assessments/${a._id}/take`}>Start Now</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}