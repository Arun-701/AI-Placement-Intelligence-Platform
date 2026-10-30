import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'
import './AssessmentResults.css'

const formatReadiness = (level) => level || 'Not available'

export default function AdaptiveAssessmentResult() {
  const { id } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/adaptive-assessment/${id}/result`).then((response) => {
      if (!active) return
      if (response.ok) setResult(response.data.result)
      else setError(response.data?.message || 'Unable to load adaptive assessment result.')
    }).catch(() => {
      if (active) setError('Unable to load adaptive assessment result.')
    })
    return () => { active = false }
  }, [id])

  if (error) return <main className="assessment-result-page"><div className="assessment-result-alert" role="alert">{error}</div><footer className="assessment-result-actions"><Link className="assessment-result-secondary-button" to="/student/roadmap">Back to Roadmap</Link></footer></main>
  if (!result) return <main className="assessment-result-page"><div className="assessment-result-loading">Loading your result…</div></main>

  const accuracy = Math.min(100, Math.max(0, Number(result.accuracy) || 0))
  const topicReadiness = Array.isArray(result.topicReadiness) ? result.topicReadiness : []
  const milestoneReadiness = Array.isArray(result.milestoneReadiness) ? result.milestoneReadiness : []
  const readinessRows = (items, key) => items.map((item) => (
    <tr key={item[key]}>
      <td><div className="topic-name-cell"><strong>{item[key] || 'Unspecified'}</strong><div className="assessment-topic-progress" aria-label={`${item[key]} readiness progress`}><div style={{ width: `${Math.min(100, Math.max(0, Number(item.accuracy) || 0))}%` }} /></div></div></td>
      <td>{item.correct ?? 0}</td>
      <td>{item.questionsAttempted ?? 0}</td>
      <td>{Math.round(Number(item.accuracy) || 0)}%</td>
      <td>{formatReadiness(item.readinessLevel)}</td>
    </tr>
  ))

  return (
    <main className="assessment-result-page">
      <nav className="assessment-result-breadcrumb"><Link to="/student/roadmap">Roadmap</Link><span>/</span><span>Adaptive assessment result</span></nav>
      <header className="assessment-result-header">
        <div>
          <span className="assessment-result-eyebrow">Adaptive assessment result</span>
          <h1>Readiness assessment completed</h1>
          <p>{result.title || `${result.domain || 'Career'} readiness assessment`}{result.milestone ? ` · ${result.milestone}` : ''}</p>
        </div>
        <span className={`assessment-result-status${accuracy >= 60 ? ' is-passed' : ' is-failed'}`}>{formatReadiness(result.readinessLevel)} readiness</span>
      </header>

      <div className="assessment-result-metrics">
        <article className="assessment-result-score"><span>Overall accuracy</span><strong>{Math.round(accuracy)}<small>%</small></strong><div><span style={{ width: `${accuracy}%` }} /></div></article>
        <article><span>Questions</span><strong>{result.totalQuestions ?? 0}</strong></article>
        <article><span>Correct answers</span><strong>{result.correctAnswers ?? 0}</strong></article>
        <article><span>Readiness level</span><strong>{formatReadiness(result.readinessLevel)}</strong></article>
      </div>

      <section className="assessment-result-card">
        <div className="assessment-result-section-heading"><div><h2>Topic readiness</h2><p>Results are calculated from your submitted answers.</p></div></div>
        {topicReadiness.length ? <div className="assessment-result-table-wrap"><table className="assessment-result-table"><thead><tr><th>Topic</th><th>Correct</th><th>Questions</th><th>Accuracy</th><th>Readiness</th></tr></thead><tbody>{readinessRows(topicReadiness, 'topic')}</tbody></table></div> : <p className="assessment-result-empty">Topic-level results are not available.</p>}
      </section>

      <section className="assessment-result-card">
        <div className="assessment-result-section-heading"><div><h2>Milestone readiness</h2><p>Milestone scores are based on the questions mapped to each roadmap milestone.</p></div></div>
        {milestoneReadiness.length ? <div className="assessment-result-table-wrap"><table className="assessment-result-table"><thead><tr><th>Milestone</th><th>Correct</th><th>Questions</th><th>Accuracy</th><th>Readiness</th></tr></thead><tbody>{readinessRows(milestoneReadiness, 'milestone')}</tbody></table></div> : <p className="assessment-result-empty">Milestone-level results are not available.</p>}
      </section>

      <p className="assessment-result-empty">Answer-by-answer review is not provided by this assessment result.</p>
      <footer className="assessment-result-actions"><Link className="assessment-result-secondary-button" to="/student/roadmap">Back to Roadmap</Link><Link className="assessment-result-primary-button" to="/student/assessments">My Assessments</Link></footer>
    </main>
  )
}
