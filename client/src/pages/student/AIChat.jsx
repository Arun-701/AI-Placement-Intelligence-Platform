import { useRef, useState } from 'react'
import { api } from '../../api'
import './AIChat.css'

function MentorIcon({ name, size = 18 }) {
  const icons = {
    robot: <><rect x="5" y="7" width="14" height="12" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6M3 11v4m18-4v4M8 21h8" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    chart: <><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
    text: <><path d="M4 6V4h16v2M12 4v16m-4 0h8" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    file: <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.file}</svg>
}

function MentorUploadIllustration() {
  return (
    <div className="mentor-illustration" aria-hidden="true">
      <svg viewBox="0 0 440 260" fill="none">
        <circle cx="225" cy="143" r="99" fill="#E7F1FF" />
        <circle cx="225" cy="143" r="75" fill="#F1F6FF" />
        <path d="M147 204c31-20 51-4 77-12 23-7 35-31 68-23" stroke="#BDD3F4" strokeWidth="3" strokeDasharray="5 8" strokeLinecap="round" />
        <path d="M100 76c-1-10 7-18 17-18 5-12 23-13 30-2 12-2 20 6 19 17h-66Z" fill="#fff" opacity=".9" />
        <path d="M330 55c0-8 6-14 14-14 4-11 20-12 26-2 10-2 18 5 17 14h-57Z" fill="#fff" opacity=".9" />
        <g className="mentor-illustration-file pdf">
          <rect x="23" y="73" width="82" height="48" rx="9" fill="white" stroke="#D8E5F7" />
          <rect x="32" y="83" width="27" height="28" rx="6" fill="#FFF0F0" />
          <path d="M38 98h15m-15 4h12" stroke="#D56A6A" strokeWidth="1.6" strokeLinecap="round" />
          <text x="37" y="94" fill="#B74646">PDF</text>
          <path d="M67 89h27M67 96h20M67 103h23" stroke="#BCC9DA" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="mentor-illustration-file docx">
          <rect x="320" y="82" width="94" height="49" rx="9" fill="white" stroke="#D8E5F7" />
          <rect x="329" y="92" width="29" height="29" rx="6" fill="#EAF2FF" />
          <path d="m336 99 3 14 4-9 4 9 3-14" stroke="#3976C6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text x="366" y="104" fill="#2F5E9D">DOCX</text>
          <path d="M366 112h37" stroke="#BCC9DA" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="mentor-illustration-file txt">
          <rect x="38" y="167" width="82" height="45" rx="9" fill="white" stroke="#D8E5F7" />
          <rect x="47" y="176" width="27" height="27" rx="6" fill="#F2EDFF" />
          <path d="M53 184h15m-15 4h15m-15 4h10" stroke="#806BC5" strokeWidth="1.5" strokeLinecap="round" />
          <text x="81" y="187" fill="#6955AA">TXT</text>
          <path d="M81 195h29" stroke="#BCC9DA" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="mentor-robot">
          <rect x="171" y="84" width="108" height="105" rx="31" fill="#fff" stroke="#A9C7F1" strokeWidth="3" />
          <rect x="184" y="99" width="82" height="59" rx="19" fill="#EAF3FF" />
          <circle cx="207" cy="127" r="6" fill="#3978D0" />
          <circle cx="243" cy="127" r="6" fill="#3978D0" />
          <path d="M207 143c8 8 28 8 36 0" stroke="#6A91CC" strokeWidth="3" strokeLinecap="round" />
          <path d="M225 84V70m-6 0h12" stroke="#85A9DC" strokeWidth="3" strokeLinecap="round" />
          <circle cx="225" cy="66" r="5" fill="#F1B85C" />
          <path d="M161 119h10m108 0h10" stroke="#85A9DC" strokeWidth="5" strokeLinecap="round" />
          <rect x="190" y="169" width="70" height="13" rx="6.5" fill="#D7E7FC" />
        </g>
        <g className="mentor-topics-card">
          <rect x="284" y="169" width="132" height="52" rx="10" fill="white" stroke="#D8E5F7" />
          <circle cx="300" cy="185" r="5" fill="#F0AE45" />
          <text x="311" y="188" fill="#344964">Important Topics</text>
          <path d="M296 199h105m-105 8h74" stroke="#CCD7E6" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="m136 142 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Zm178-102 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#E5AA4B" />
        <circle cx="304" cy="145" r="3" fill="#927CE1" />
      </svg>
    </div>
  )
}

// Simple DonutChart component for difficulty distribution
function DonutChart({ data, total }) {
  const colors = { Easy: '#7c3aed', Medium: '#10b981', Hard: '#ef4444' }
  const getPercentage = (count) => (count / total) * 100

  return (
    <div className="mentor-donut-wrap">
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
      <div className="mentor-donut-legend">
        {Object.entries(data).map(([level, count]) => (
          <div key={level} className="mentor-donut-item">
            <div
              className="mentor-donut-swatch"
              style={{ backgroundColor: colors[level] || '#999' }}
            />
            <span>
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
    <div className="mentor-topic-list">
      {topics.slice(0, 8).map((topic, idx) => (
        <div key={idx} className="mentor-topic-row">
          <div className="mentor-topic-meta">
            <span>{topic.topic}</span>
            <span>{topic.questionCount}</span>
          </div>
          <div className="mentor-topic-bar">
            <div
              className="mentor-topic-bar-fill"
              style={{ width: `${(topic.questionCount / maxQuestions) * 100}%` }}
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
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [inputMode, setInputMode] = useState('file')
  const [pasteText, setPasteText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const normalizeAiMentorAnalysis = (payload) => {
    if (!payload) return null

    const rankedTopics = Array.isArray(payload.rankedTopics) ? payload.rankedTopics : []
    const topicFrequency = Array.isArray(payload.topicFrequency) ? payload.topicFrequency : []
    const normalizedTopics = (rankedTopics.length > 0 ? rankedTopics : topicFrequency).map((topic) => ({
      topic: topic.topic || topic.name || 'General',
      questionCount: Number(topic.questions ?? topic.count ?? 0),
      difficulty: topic.difficulty || 'Medium',
      priority: topic.priority || 'Medium',
      domain: topic.subject || topic.domain || 'General',
      subject: topic.subject || topic.domain || 'General'
    }))

    return {
      totalQuestions: payload.summary?.questionsAnalyzed ?? payload.questionsExtracted ?? normalizedTopics.reduce((sum, item) => sum + (item.questionCount || 0), 0),
      topics: normalizedTopics,
      difficultyDistribution: payload.difficultyDistribution || { Easy: 0, Medium: 0, Hard: 0 },
      recommendedStudyOrder: Array.isArray(payload.studyOrder) ? payload.studyOrder : [],
      ...payload
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
    e.target.value = ''
  }

  const validateAndSetFile = (selectedFile) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    const acceptedFiles = {
      pdf: ['application/pdf'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      doc: ['application/msword'],
      txt: ['text/plain']
    }
    if (!acceptedFiles[extension]?.includes(selectedFile.type)) {
      setError('Please upload a valid PDF, DOC, DOCX, or TXT file.')
      setFile(null)
      return
    }
    if (selectedFile.size === 0) {
      setError('The selected file is empty. Choose a file with question content.')
      setFile(null)
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be 10MB or less.')
      setFile(null)
      return
    }
    setFile(selectedFile)
    setError('')
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (analyzing) return
    const selectedFile = event.dataTransfer.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const handleAnalyze = async (event) => {
    event?.preventDefault()
    if (analyzing) return
    if (inputMode === 'text') {
      if (!pasteText.trim()) {
        setError('Please paste question text first.')
        return
      }
    } else if (!file) {
      setError('Please select a question paper first.')
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysis(null)

    try {
      let response
      if (inputMode === 'text') {
        response = await api.post('/ai/mentor/analyze', { questionText: pasteText })
      } else {
        const formData = new FormData()
        formData.append('file', file)
        response = await api.upload('/ai/mentor/analyze', formData)
      }

      if (response.ok && response.data?.data) {
        setAnalysis(normalizeAiMentorAnalysis(response.data.data))
        if (inputMode === 'file') {
          setFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        } else {
          setPasteText('')
        }
      } else {
        setError(response.data?.message || response.data?.error || 'Failed to analyze question paper. Please try again.')
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
      {!analysis ? (
        <main className="mentor-page mentor-initial-page">
          <header className="mentor-page-heading">
            <span className="mentor-page-eyebrow">YOUR AI STUDY ASSISTANT</span>
            <h1>AI Mentor</h1>
            <p>Find the placement topics worth studying first.</p>
          </header>

          {error && <div className="alert error mentor-input-error" role="alert">{error}</div>}

          <section className="mentor-hero">
            <div className="mentor-hero-main">
              <div className="mentor-robot-icon"><MentorIcon name="robot" size={29} /></div>
              <div className="mentor-hero-copy">
                <h2>Analyze Placement Questions</h2>
                <p>Upload a question paper or paste questions to identify important topics, frequent patterns, and focus areas for your preparation.</p>
              </div>
              <div className="mentor-feature-highlights">
                <div className="mentor-feature-item">
                  <span className="blue"><MentorIcon name="target" size={17} /></span>
                  <div><strong>Find important topics</strong><small>Know what to study first</small></div>
                </div>
                <div className="mentor-feature-item">
                  <span className="purple"><MentorIcon name="chart" size={17} /></span>
                  <div><strong>Understand patterns</strong><small>See frequently asked concepts</small></div>
                </div>
                <div className="mentor-feature-item">
                  <span className="orange"><MentorIcon name="sparkle" size={17} /></span>
                  <div><strong>Prepare smartly</strong><small>Focus on high priority topics</small></div>
                </div>
              </div>
            </div>
            <MentorUploadIllustration />
          </section>

          <section className="mentor-input-card">
            <div className="mentor-input-tabs" role="tablist" aria-label="Question input method">
              <button type="button" role="tab" aria-selected={inputMode === 'file'} className={inputMode === 'file' ? 'active' : ''} onClick={() => { setInputMode('file'); setError('') }} disabled={analyzing}><MentorIcon name="upload" size={16} />Upload File</button>
              <button type="button" role="tab" aria-selected={inputMode === 'text'} className={inputMode === 'text' ? 'active' : ''} onClick={() => { setInputMode('text'); setError('') }} disabled={analyzing}><MentorIcon name="text" size={16} />Enter Text</button>
            </div>

            <form className="mentor-input-form" onSubmit={handleAnalyze}>
              {inputMode === 'file' ? (
                <div
                  className={`mentor-dropzone${isDragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
                  onDragEnter={(event) => { event.preventDefault(); if (!analyzing) setIsDragging(true) }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false) }}
                  onDrop={handleDrop}
                >
                  <input ref={fileInputRef} className="mentor-hidden-file-input" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} disabled={analyzing} aria-label="Choose a question paper file" />
                  <span className="mentor-dropzone-icon"><MentorIcon name="upload" size={26} /></span>
                  <strong>{file ? file.name : 'Drag and drop your question paper here'}</strong>
                  <p>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to analyze` : 'Supports PDF, DOC, DOCX, TXT files · Maximum 10MB'}</p>
                  <button className="mentor-choose-file" type="button" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
                    {file ? 'Choose a different file' : 'Choose File'}
                  </button>
                </div>
              ) : (
                <div className="mentor-text-entry">
                  <label htmlFor="mentor-question-text">Paste your placement questions</label>
                  <textarea
                    id="mentor-question-text"
                    value={pasteText}
                    onChange={(event) => { setPasteText(event.target.value); if (error) setError('') }}
                    placeholder="Paste your placement questions here, one question per line..."
                    rows={7}
                    disabled={analyzing}
                  />
                  <small>Keep each question on its own line. Numbered questions are supported.</small>
                </div>
              )}

              <div className="mentor-input-footer">
                <div className="mentor-input-info"><MentorIcon name="info" size={18} /><span>You can upload a placement question paper or paste questions. We will analyze and suggest the key topics to study.</span></div>
                <button className="mentor-analyze-button" type="submit" disabled={analyzing || (inputMode === 'file' ? !file : !pasteText.trim())}>
                  {analyzing ? <><span className="mentor-button-spinner" />Analyzing Questions...</> : <><MentorIcon name="sparkle" size={17} />Analyze Questions<MentorIcon name="arrow" size={16} /></>}
                </button>
              </div>
            </form>
          </section>
        </main>
      ) : (
        <div className="page-title">
          <div>
            <h1>AI Mentor</h1>
            <div className="subtitle">Find the placement topics worth studying first.</div>
          </div>
        </div>
      )}

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