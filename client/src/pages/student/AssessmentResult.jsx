import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../api'

export default function AssessmentResult() {
  const { resultId } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/assessment/result/${resultId}`).then((r) => {
      if (r.ok) setResult(r.data.data)
      else setError(r.data?.message || 'Failed to load result')
    })
  }, [resultId])

  if (error) return <div className="alert error">{error}</div>
  if (!result) return <div className="loading">Loading result...</div>

  const ans = result.answers || {}

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Assessment Result</h1>
          <div className="subtitle">{result.assessment?.title || 'Assessment'}</div>
        </div>
      </div>

      <div className="grid cols-4 mb">
        <div className="card kpi-card"><div className="kpi-value">{result.score} / {result.totalMarks}</div><div className="kpi-label">Score</div></div>
        <div className="card kpi-card"><div className="kpi-value">{result.percentage}%</div><div className="kpi-label">Percentage</div></div>
        <div className="card kpi-card"><div className="kpi-value">{ans.correct ?? 0}</div><div className="kpi-label">Correct</div></div>
        <div className="card kpi-card"><div className="kpi-value">{ans.wrong ?? 0}</div><div className="kpi-label">Wrong</div></div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Strengths</h3>
          {result.strengths?.length ? (
            <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.strengths.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
          ) : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No strengths identified yet.</p>}
          <h3 className="mt">Weaknesses</h3>
          {result.weaknesses?.length ? (
            <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.weaknesses.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
          ) : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No weaknesses identified.</p>}
          <h3 className="mt">Recommendations</h3>
          {result.recommendations?.length ? (
            <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.recommendations.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
          ) : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No recommendations yet.</p>}
        </div>

        <div className="card">
          <h3>Answer Review</h3>
          <div className="ai-box">
            {JSON.stringify(result.answers, null, 2)}
          </div>
        </div>
      </div>

      <div className="mt">
        <Link className="btn secondary" to="/student/results">Back to Results</Link>
      </div>
    </>
  )
}