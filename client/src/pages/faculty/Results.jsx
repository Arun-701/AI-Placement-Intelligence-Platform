import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function FacultyResults() {
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/faculty/results').then((r) => {
      if (r.ok) setResults(r.data.data?.results || r.data.data || [])
      else setError(r.data?.message || 'Failed to load results')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Assessment Results</h1>
          <div className="subtitle">Student assessment performance</div>
        </div>
      </div>
      {results.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No results yet.</p></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Assessment</th><th>Score</th><th>Percentage</th><th>Submitted</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>{r.student?.fullName || r.student?.name || r.studentId || '—'}</td>
                  <td>{r.assessment?.title || r.assessmentId || '—'}</td>
                  <td>{r.score} / {r.totalMarks}</td>
                  <td><span className={`badge ${Number(r.percentage) >= 60 ? 'green' : 'red'}`}>{r.percentage}%</span></td>
                  <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}