import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'

export default function MyResults() {
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/assessment-result/my').then((r) => {
if (r.ok) {
        const d = r.data.data
        setResults(d?.results || d || [])
      } else setError(r.data?.message || 'Failed to load results')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>My Results</h1>
          <div className="subtitle">History of all completed assessments</div>
        </div>
      </div>
      {results.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No completed assessments yet. Take a test to see results here.</p></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Assessment</th><th>Score</th><th>Percentage</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td>{r.assessment?.title || 'Assessment'}</td>
                  <td>{r.score} / {r.totalMarks}</td>
                  <td>{r.percentage}%</td>
                  <td><span className={`badge ${Number(r.percentage) >= 60 ? 'green' : 'red'}`}>{r.completed ? 'Completed' : 'Pending'}</span></td>
                  <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</td>
                  <td><Link className="btn small secondary" to={`/student/assessments/result/${r._id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}