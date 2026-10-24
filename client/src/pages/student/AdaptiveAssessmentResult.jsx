import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

export default function AdaptiveAssessmentResult() {
  const { id } = useParams(); const navigate = useNavigate(); const [result, setResult] = useState(null); const [error, setError] = useState('')
  useEffect(() => { api.get(`/adaptive-assessment/${id}/result`).then((response) => response.ok ? setResult(response.data.result) : setError(response.data?.message || 'Unable to load result.')).catch(() => setError('Unable to load result.')) }, [id])
  if (error) return <div className="alert error">{error}</div>
  if (!result) return <div className="loading">Loading readiness result...</div>
  const rows = result.mode === 'overall' ? result.milestoneReadiness : result.topicReadiness
  const label = result.mode === 'overall' ? 'Milestone' : 'Topic'
  return <><div className="page-title"><div><h1>{result.mode === 'overall' ? 'Roadmap Readiness' : 'Milestone Readiness'}</h1><div className="subtitle">{result.domain}{result.milestone ? ` · ${result.milestone}` : ''}</div></div></div><div className="grid cols-3 mb"><div className="card kpi-card"><div className="kpi-value">{result.totalQuestions}</div><div className="kpi-label">Questions</div></div><div className="card kpi-card"><div className="kpi-value">{result.correctAnswers}</div><div className="kpi-label">Correct answers</div></div><div className="card kpi-card"><div className="kpi-value">{result.accuracy}%</div><div className="kpi-label">Overall accuracy</div></div></div><div className="card"><h3>{label} readiness</h3><div style={{ overflowX: 'auto' }}><table><thead><tr><th>{label}</th><th>Questions</th><th>Correct</th><th>Accuracy</th><th>Readiness</th></tr></thead><tbody>{rows.map((item) => <tr key={item[label.toLowerCase()]}><td>{item[label.toLowerCase()]}</td><td>{item.questionsAttempted}</td><td>{item.correct}</td><td>{item.accuracy}%</td><td><span className="badge blue">{item.readinessLevel}</span></td></tr>)}</tbody></table></div></div><div className="mt"><button className="btn" onClick={() => navigate('/student/roadmap')}>Back to Roadmap</button></div></>
}
