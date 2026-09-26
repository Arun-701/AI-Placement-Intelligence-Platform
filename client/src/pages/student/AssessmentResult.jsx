import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../AuthContext'
import { normalizeTopicAnalysis } from '../../utils/topicPerformance'

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

  if (error) return <div className="alert error">{error}</div>
  if (!result) return <div className="loading">Loading result...</div>

  const answers = result.answers || {}
  const totalQuestions = answers.totalQuestions ?? answers.details?.length ?? 0
  const correct = answers.correct ?? 0
  const incorrect = answers.wrong ?? 0
  const skipped = answers.skipped ?? 0
  const attempted = correct + incorrect
  const passingMarks = typeof result.assessment?.passingMarks === 'number' ? result.assessment.passingMarks : 0
  const passed = result.score >= passingMarks
  const topicPerformance = normalizeTopicAnalysis(result.topicAnalysis)

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Assessment Completed</h1>
          <div className="subtitle">{result.assessment?.title || 'Assessment'}</div>
        </div>
        <span className={`badge ${passed ? 'green' : 'red'}`}>{passed ? 'Passed' : 'Failed'}</span>
      </div>

      <div className="grid cols-4 mb">
        <div className="card kpi-card"><div className="kpi-value">{result.score} / {result.totalMarks}</div><div className="kpi-label">Score</div></div>
        <div className="card kpi-card"><div className="kpi-value">{result.percentage}%</div><div className="kpi-label">Percentage</div></div>
        <div className="card kpi-card"><div className="kpi-value">{correct}</div><div className="kpi-label">Correct Answers</div></div>
        <div className="card kpi-card"><div className="kpi-value">{incorrect}</div><div className="kpi-label">Incorrect Answers</div></div>
      </div>

      <div className="card mb">
        <h3>Result Summary</h3>
        <div className="row" style={{ gap: 24, flexWrap: 'wrap', fontSize: 14, color: 'var(--muted)' }}>
          <span>Total Questions: <strong>{totalQuestions}</strong></span>
          <span>Attempted: <strong>{attempted}</strong></span>
          <span>Correct Answers: <strong>{correct}</strong></span>
          <span>Incorrect Answers: <strong>{incorrect}</strong></span>
          <span>Skipped: <strong>{skipped}</strong></span>
        </div>
      </div>

      <div className="card mb">
        <h3>Topic-wise Performance</h3>
        {topicPerformance.length ? (
          <div className="table-wrap">
            <table className="topic-performance-table">
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
                        <div className="topic-progress" aria-label={`${topic.topic} progress`}>
                          <div className="topic-progress-fill" style={{ width: `${topic.accuracy}%` }} />
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
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Topic-wise analysis is not available for this assessment.</p>
        )}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Strengths</h3>
          {result.strengths?.length ? <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.strengths.map((item, index) => <li key={index} className="list-item">{item}</li>)}</ul> : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No strengths identified yet.</p>}
          <h3 className="mt">Weaknesses</h3>
          {result.weaknesses?.length ? <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.weaknesses.map((item, index) => <li key={index} className="list-item">{item}</li>)}</ul> : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No weaknesses identified.</p>}
          <h3 className="mt">Recommendations</h3>
          {result.recommendations?.length ? <ul style={{ paddingLeft: 20, fontSize: 14 }}>{result.recommendations.map((item, index) => <li key={index} className="list-item">{item}</li>)}</ul> : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No recommendations yet.</p>}
        </div>

        <div className="card">
          <h3>Answer Review</h3>
          {answers.details?.length ? answers.details.map((answer, index) => (
            <div className="card mb" style={{ padding: 14 }} key={answer.questionId || index}>
              <div className="row between" style={{ gap: 12 }}><strong>{index + 1}. {answer.question}</strong><span className={`badge ${answer.isCorrect ? 'green' : 'red'}`}>{answer.isCorrect ? 'Correct' : 'Incorrect'}</span></div>
              <p style={{ fontSize: 14, margin: '10px 0 0' }}>Your answer: <strong>{answer.studentAnswer || 'Not answered'}</strong></p>
              {!answer.isCorrect && <p style={{ fontSize: 14, margin: '6px 0 0' }}>Correct answer: <strong>{answer.correctAnswer}</strong></p>}
              {answer.explanation && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 0' }}>{answer.explanation}</p>}
            </div>
          )) : <p style={{ color: 'var(--muted)', fontSize: 14 }}>No answer details are available for this result.</p>}
        </div>
      </div>

      <div className="mt"><button className="btn" onClick={async () => { await refreshUser(); navigate('/student', { replace: true }) }}>Go to Dashboard</button></div>
    </>
  )
}
