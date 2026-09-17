import { useState } from 'react'
import { api } from '../../api'

// Simple DonutChart component for difficulty distribution
function DonutChart({ data, total }) {
  const colors = { Easy: '#7c3aed', Medium: '#10b981', Hard: '#ef4444' }
  const getPercentage = (count) => (count / total) * 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ width: '200px', height: '200px', position: 'relative' }}>
        <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          {(() => {
            let currentAngle = 0
            return Object.entries(data).map(([level, count]) => {
              const percentage = getPercentage(count)
              const angle = (percentage / 100) * 360
              const radius = 80
              const startAngle = (currentAngle * Math.PI) / 180
              const endAngle = ((currentAngle + angle) * Math.PI) / 180
              const startX = 100 + radius * Math.cos(startAngle)
              const startY = 100 + radius * Math.sin(startAngle)
              const endX = 100 + radius * Math.cos(endAngle)
              const endY = 100 + radius * Math.sin(endAngle)
              const largeArc = angle > 180 ? 1 : 0
              const path = `M 100 100 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
              currentAngle += angle
              return (
                <path
                  key={level}
                  d={path}
                  fill={colors[level] || '#999'}
                  stroke="white"
                  strokeWidth="2"
                />
              )
            })
          })()}
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(data).map(([level, count]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                backgroundColor: colors[level] || '#999'
              }}
            />
            <span style={{ fontSize: '0.9rem' }}>
              {level}: {count} ({getPercentage(count).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple Bar Chart for Topic Frequency
function TopicFrequencyChart({ topics }) {
  const maxQuestions = Math.max(...topics.map((t) => t.questionCount), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {topics.slice(0, 8).map((topic, idx) => (
        <div key={idx}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{topic.topic}</span>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>{topic.questionCount}</span>
          </div>
          <div style={{ width: '100%', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(topic.questionCount / maxQuestions) * 100}%`,
                backgroundColor: '#7c3aed',
                transition: 'width 0.3s'
              }}
            />
          </div>
        </div>
      ))}
      {topics.length > 8 && (
        <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
          ... and {topics.length - 8} more topics
        </div>
      )}
    </div>
  )
}

export default function AIChat() {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)')
        setFile(null)
        return
      }

      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysis(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.upload('/ai/question-paper/analyze', formData)

      if (response.ok) {
        setAnalysis(response.data.data)
        setFile(null)
        // Reset file input
        const input = document.querySelector('input[type="file"]')
        if (input) input.value = ''
      } else {
        setError(response.data?.message || 'Failed to analyze question paper. Please try again.')
      }
    } catch (err) {
      setError('Network error: ' + (err.message || 'Failed to connect to server'))
    } finally {
      setAnalyzing(false)
    }
  }

  // Sort topics by priority score for ranked table
  const sortedTopics = analysis?.topics
    ? [...analysis.topics].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    : []

  return (
    <>
      <div className="page-title">
        <div>
          <h1>AI Mentor</h1>
          <div className="subtitle">Find the placement topics worth studying first.</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card mb">
        <h3>Paste placement questions</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          Paste one question per line, or numbered questions...
        </p>

        <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 0.5rem 0' }}>Or upload PDF / TXT</p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/jpg"
                onChange={handleFileChange}
                disabled={analyzing}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              {file && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                  Selected: {file.name}
                </p>
              )}
            </div>
            <button
              className="btn"
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              style={{ whiteSpace: 'nowrap' }}
            >
              {analyzing ? 'Analyzing Questions...' : 'Analyze Questions'}
            </button>
          </div>
        </div>
      </div>

      {analysis && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                backgroundColor: '#f3e5f5',
                borderLeft: '4px solid #7c3aed'
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                Questions analyzed
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                {analysis.totalQuestions}
              </div>
            </div>

            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                backgroundColor: '#f3e5f5',
                borderLeft: '4px solid #7c3aed'
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                Topics identified
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                {analysis.topics?.length || 0}
              </div>
            </div>
          </div>

          {/* Topic Frequency and Difficulty Distribution Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Topic Frequency</h3>
              {analysis.topics && analysis.topics.length > 0 ? (
                <TopicFrequencyChart topics={analysis.topics} />
              ) : (
                <p>No topics data available</p>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Difficulty Distribution</h3>
              {analysis.difficultyDistribution ? (
                <DonutChart data={analysis.difficultyDistribution} total={analysis.totalQuestions} />
              ) : (
                <p>No difficulty distribution data</p>
              )}
            </div>
          </div>

          {/* Ranked Important Topics Table */}
          <div className="card mb">
            <h3>Ranked Important Topics</h3>
            {sortedTopics.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>#</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>SUBJECT</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>TOPIC</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>QUESTIONS</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>DIFFICULTY</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>PRIORITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTopics.map((topic, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#7c3aed' }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {topic.domain || topic.subject || 'General'}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{topic.topic}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {topic.questionCount}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              backgroundColor:
                                topic.difficulty === 'Easy'
                                  ? '#e9d5ff'
                                  : topic.difficulty === 'Medium'
                                  ? '#d1fae5'
                                  : '#fee2e2',
                              color:
                                topic.difficulty === 'Easy'
                                  ? '#6b21a8'
                                  : topic.difficulty === 'Medium'
                                  ? '#065f46'
                                  : '#7f1d1d'
                            }}
                          >
                            {topic.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              backgroundColor:
                                topic.priority === 'Very High'
                                  ? '#fee2e2'
                                  : topic.priority === 'High'
                                  ? '#fed7aa'
                                  : topic.priority === 'Medium'
                                  ? '#dbeafe'
                                  : '#f3f4f6',
                              color:
                                topic.priority === 'Very High'
                                  ? '#7f1d1d'
                                  : topic.priority === 'High'
                                  ? '#92400e'
                                  : topic.priority === 'Medium'
                                  ? '#0c4a6e'
                                  : '#374151'
                            }}
                          >
                            {topic.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No ranked topics available</p>
            )}
          </div>

          {/* Recommended Study Order */}
          <div className="card">
            <h3>Recommended Study Order</h3>
            {analysis.recommendedStudyOrder && analysis.recommendedStudyOrder.length > 0 ? (
              <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                {analysis.recommendedStudyOrder.map((topic, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                    {topic}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No study order available</p>
            )}
          </div>
        </>
      )}
    </>
  )
}