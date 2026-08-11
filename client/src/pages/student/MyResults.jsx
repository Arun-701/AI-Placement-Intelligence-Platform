import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'

export default function MyResults() {
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [loadingContinue, setLoadingContinue] = useState(false)
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  useEffect(() => {
    api.get('/assessment-result/my').then((r) => {
if (r.ok) {
        const d = r.data.data
        setResults(d?.results || d || [])
      } else setError(r.data?.message || 'Failed to load results')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  const hasInitialAssessmentCompleted = results.some((r) => r.assessment?.isInitialAssessment)

  const handleContinueToDashboard = async () => {
    setLoadingContinue(true)
    try {
      await refreshUser()
      navigate('/student')
    } finally {
      setLoadingContinue(false)
    }
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>My Results</h1>
          <div className="subtitle">History of all completed assessments</div>
        </div>
      </div>
      {hasInitialAssessmentCompleted && (
        <div className="mb">
          <button className="btn primary" onClick={handleContinueToDashboard} disabled={loadingContinue}>
            {loadingContinue ? 'Loading...' : 'Continue to Dashboard'}
          </button>
        </div>
      )}
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