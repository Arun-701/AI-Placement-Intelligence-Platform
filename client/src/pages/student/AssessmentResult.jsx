import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import { normalizeTopicAnalysis } from '../../utils/topicPerformance'
import './AssessmentResults.css'

const formatTopicSummary = (item) => {
  const match = String(item).match(/^(?:Very strong in|Strong in|Needs improvement in|Very weak in)\s+(.+?)\s+\((\d+(?:\.\d+)?)%\s+accuracy\)$/)
  return match ? `${match[1]} — ${match[2]}% accuracy` : item
}

export default function AssessmentResult() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/assessment/result/${resultId}`).then((response) => {
      if (!active) return
      if (response.ok) setResult(response.data.data)
      else setError(response.data?.message || 'Failed to load result')
    }).catch(() => {
      if (active) setError('Failed to load result')
    })
    return () => { active = false }
  }, [resultId])

  if (error) return <div className="assessment-result-page"><div className="assessment-result-alert" role="alert">{error}</div></div>
  if (!result) return <div className="assessment-result-page"><div className="assessment-result-loading">Loading your result…</div></div>

  const answers = result.answers || {}
  const totalQuestions = answers.totalQuestions ?? answers.details?.length ?? 0
  const correct = answers.correct ?? 0
  const incorrect = answers.wrong ?? 0
  const skipped = answers.skipped ?? 0
  const attempted = correct + incorrect
  const passingMarks = typeof result.assessment?.passingMarks === 'number' ? result.assessment.passingMarks : 0
  const score = result.score ?? 0
  const passed = score >= passingMarks
  const topicPerformance = normalizeTopicAnalysis(result.topicAnalysis)

  return (
    <main className="assessment-result-page">
      <nav className="assessment-result-breadcrumb"><Link to="/student/assessments">My Assessments</Link><span>/</span><span>Result</span></nav>
      <header className="assessment-result-header">
        <div>
          <span className="assessment-result-eyebrow">Assessment result</span>
          <h1>Assessment completed</h1>
          <p>{result.assessment?.title || 'Assessment'}</p>
        </div>
        <span className={`assessment-result-status${passed ? ' is-passed' : ' is-failed'}`}>{passed ? 'Passed' : 'Not passed'}</span>
      </header>

      <div className="assessment-result-metrics">
        <article className="assessment-result-score"><span>Marks obtained</span><strong>{score} <small>/ {result.totalMarks ?? 0}</small></strong><div><span style={{ width: `${Math.min(100, Math.max(0, Number(result.percentage) || 0))}%` }} /></div></article>
        <article><span>Percentage</span><strong>{result.percentage ?? 0}%</strong></article>
        <article><span>Correct answers</span><strong>{correct}</strong></article>
        <article><span>Incorrect answers</span><strong>{incorrect}</strong></article>
      </div>

      <section className="assessment-result-card assessment-result-summary">
        <div><span>Total questions</span><strong>{totalQuestions}</strong></div>
        <div><span>Attempted</span><strong>{attempted}</strong></div>
        <div><span>Correct</span><strong>{correct}</strong></div>
        <div><span>Incorrect</span><strong>{incorrect}</strong></div>
        <div><span>Unanswered</span><strong>{skipped}</strong></div>
        {result.submittedAt && <div><span>Submitted</span><strong>{new Date(result.submittedAt).toLocaleString()}</strong></div>}
      </section>

      <section className="assessment-result-card">
        <div className="assessment-result-section-heading"><div><h2>Topic-wise performance</h2><p>Performance details returned for this assessment.</p></div></div>
        {topicPerformance.length ? (
          <div className="assessment-result-table-wrap">
            <table className="assessment-result-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Correct</th>
                  <th>Total</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topicPerformance.map((topic) => (
                  <tr key={topic.key}>
                    <td>
                      <div className="topic-name-cell">
                        <strong>{topic.topic}</strong>
                        <div className="assessment-topic-progress" aria-label={`${topic.topic} progress`}>
                          <div style={{ width: `${topic.accuracy}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{topic.correctAnswers}</td>
                    <td>{topic.totalQuestions}</td>
                    <td>{Math.round(topic.accuracy)}%</td>
                    <td><span className={`badge ${topic.status.tone}`}>{topic.status.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="assessment-result-empty">Topic-wise analysis is not available for this assessment.</p>
        )}
      </section>

      <div className="assessment-result-analysis">
        <section className="assessment-result-card">
          <div className="assessment-result-section-heading"><div><h2>Strengths</h2><p>Based on your submitted result.</p></div></div>
          {result.strengths?.length ? <ul className="assessment-result-list">{result.strengths.map((item, index) => <li key={`${item}-${index}`}>{formatTopicSummary(item)}</li>)}</ul> : <p className="assessment-result-empty">No strengths identified yet.</p>}
          <div className="assessment-result-section-heading assessment-result-secondary-heading"><div><h2>Areas to improve</h2></div></div>
          {result.weaknesses?.length ? <ul className="assessment-result-list">{result.weaknesses.map((item, index) => <li key={`${item}-${index}`}>{formatTopicSummary(item)}</li>)}</ul> : <p className="assessment-result-empty">No improvement areas identified.</p>}
        </section>

        <section className="assessment-result-card assessment-answer-review" id="answer-review">
          <div className="assessment-result-section-heading"><div><h2>Answer review</h2><p>Your submitted responses and permitted answer feedback.</p></div></div>
          {answers.details?.length ? answers.details.map((answer, index) => (
            <article className={`assessment-answer-item${!answer.studentAnswer ? ' is-unanswered' : answer.isCorrect ? ' is-correct' : ' is-incorrect'}`} key={answer.questionId || index}>
              <div className="assessment-answer-item-heading"><strong>{index + 1}. {answer.question}</strong><span>{!answer.studentAnswer ? 'Unanswered' : answer.isCorrect ? 'Correct' : 'Incorrect'}</span></div>
              <p>Your answer: <strong>{answer.studentAnswer || 'Not answered'}</strong></p>
              <small>Marks awarded: {answer.marksObtained ?? 0}{answer.marks !== undefined ? ` / ${answer.marks}` : ''}</small>
              {!answer.isCorrect && <p style={{ fontSize: 14, margin: '6px 0 0' }}>Correct answer: <strong>{answer.correctAnswer}</strong></p>}
              {answer.explanation && <p className="assessment-answer-explanation">{answer.explanation}</p>}
            </article>
          )) : <p className="assessment-result-empty">No answer details are available for this result.</p>}
        </section>
      </div>

      <footer className="assessment-result-actions">
        <Link className="assessment-result-secondary-button" to="/student/assessments">Back to My Assessments</Link>
        <a className="assessment-result-primary-button" href="#answer-review">Review Answers</a>
        <button className="assessment-result-secondary-button" onClick={async () => { await refreshUser(); navigate('/student', { replace: true }) }}>Go to Dashboard</button>
      </footer>
    </main>
  )
}
