import { useState, useRef, useEffect } from 'react'
import { api } from '../../api'

export default function ResumeAnalysis() {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [jdAnalysis, setJdAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasResume, setHasResume] = useState(false)
  const [resumePath, setResumePath] = useState('')
  
  // JD Analysis states
  const [jobDescription, setJobDescription] = useState('')
  const [jdFile, setJdFile] = useState(null)
  const [jdInputMode, setJdInputMode] = useState('text') // 'text' or 'file'
  const [jdBusy, setJdBusy] = useState(false)
  const [keywordsExpanded, setKeywordsExpanded] = useState(false)

  const upload = async (replace = false) => {
    if (!file) return
    setBusy(true)
    setError('')
    const fd = new FormData()
    fd.append('resume', file)

    const r = replace ? await api.putUpload('/student/resume', fd) : await api.upload('/student/resume', fd)
    setBusy(false)
    if (r.ok) {
      setError('')
      setHasResume(true)
      setResumePath(r.data?.data?.resume || (r.data && r.data.data && r.data.data.resume) || '')
    } else {
      setError(r.data?.message || 'Upload failed')
    }
  }

  // Analyze resume against job description
  const analyzeAgainstJD = async () => {
    if (!jobDescription.trim() && !jdFile) {
      setError('Please provide a job description')
      return
    }

    let jdText = jobDescription

    // Extract text from JD file if provided
    if (jdFile && !jobDescription.trim()) {
      setJdBusy(true)
      setError('')
      
      try {
        const fileContent = await jdFile.text()
        jdText = fileContent
      } catch (err) {
        setError('Failed to read JD file')
        setJdBusy(false)
        return
      }
    }

    setJdBusy(true)
    setError('')

    const r = await api.post('/ai/analyze-resume-jd', { jobDescription: jdText })
    setJdBusy(false)

    if (r.ok) {
      setJdAnalysis(r.data.data)
      setError('')
    } else {
      setError(r.data?.message || 'Analysis failed')
    }
  }

  useEffect(() => {
    const checkResume = async () => {
      try {
        const r = await api.get('/student/resume')
        if (r.ok && r.data?.data?.resume) {
          setHasResume(true)
          setResumePath(r.data.data.resume)
        } else {
          setHasResume(false)
          setResumePath('')
        }
      } catch {
        setHasResume(false)
      }
    }

    checkResume()
  }, [])

  const matchLevelColor = (level) => {
    const colors = {
      'Excellent Match': '#28a745',
      'Strong Match': '#4CAF50',
      'Moderate Match': '#FFC107',
      'Weak Match': '#DC3545'
    }
    return colors[level] || '#999'
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Resume AI Analysis</h1>
          <div className="subtitle">Upload your resume and get AI-powered feedback</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {/* Resume Upload Section */}
      <div className="card mb">
        <h3>📄 Upload Resume</h3>
        <div className="row">
          <input type="file" ref={fileRef} accept=".pdf,.docx,.doc" onChange={(e) => setFile(e.target.files[0])} />
          {!hasResume ? (
            <button className="btn" onClick={() => upload(false)} disabled={busy || !file}>{busy ? 'Uploading...' : 'Upload & Analyze'}</button>
          ) : (
            <>
              <button className="btn" onClick={() => upload(true)} disabled={busy || !file}>{busy ? 'Replacing...' : 'Replace & Analyze'}</button>
              <div style={{ marginLeft: 12, alignSelf: 'center' }}>
                <small>Existing resume: <a href={resumePath} target="_blank" rel="noreferrer">View</a></small>
              </div>
            </>
          )}
        </div>
        <p className="mt" style={{ fontSize: 13, color: 'var(--muted)' }}>Supported: PDF, DOCX, DOC. Max 5MB.</p>
      </div>

      {/* Job Description Analysis Section */}
      {hasResume && (
        <div className="card mb">
          <h3>🎯 Analyze Resume Against Job Description</h3>
          <div className="tabs" style={{ marginBottom: '16px' }}>
            <button
              className={`tab ${jdInputMode === 'text' ? 'active' : ''}`}
              onClick={() => setJdInputMode('text')}
            >
              Paste JD
            </button>
            <button
              className={`tab ${jdInputMode === 'file' ? 'active' : ''}`}
              onClick={() => setJdInputMode('file')}
            >
              Upload JD File
            </button>
          </div>

          {jdInputMode === 'text' ? (
            <textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                fontFamily: 'monospace',
                fontSize: '13px',
                marginBottom: '12px'
              }}
            />
          ) : (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setJdFile(e.target.files[0])}
                style={{ marginBottom: '8px' }}
              />
              {jdFile && <small>Selected: {jdFile.name}</small>}
            </div>
          )}

          <button
            className="btn"
            onClick={analyzeAgainstJD}
            disabled={jdBusy || (!jobDescription.trim() && !jdFile)}
          >
            {jdBusy ? 'Analyzing...' : 'Analyze Resume vs JD'}
          </button>
        </div>
      )}

      {/* JD Comparison Tab */}
      {jdAnalysis && (
        <>
          <div className="card mb">
            <h3>📊 Resume-JD Comparison Summary</h3>
            <p>{jdAnalysis.summary || 'Resume analysis against job description complete.'}</p>
            {jdAnalysis.analysisSource === 'fallback' && (
              <div className="alert">
                AI analysis unavailable. Showing keyword-based analysis.
              </div>
            )}
          </div>

          {/* Scores Section */}
          <div className="row mb" style={{ gap: '16px' }}>
            <div className="card" style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>ATS Score</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                  {jdAnalysis.atsScore}%
                </div>
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Job Match</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {jdAnalysis.jobMatchScore}%
                </div>
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Match Level</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: matchLevelColor(jdAnalysis.matchLevel),
                  }}
                >
                  {jdAnalysis.matchLevel}
                </div>
              </div>
            </div>
          </div>

          {jdAnalysis.semanticSimilarity !== undefined && (
            <div className="card mb">
              <h3>Semantic Similarity</h3>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7B1FA2' }}>
                {(jdAnalysis.semanticSimilarity * 100).toFixed(1)}%
              </div>
              {jdAnalysis.phraseOverlap !== undefined && (
                <div style={{ marginTop: '8px', color: 'var(--muted)' }}>
                  Phrase Overlap: {(jdAnalysis.phraseOverlap * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          {/* Matched Skills */}
          {jdAnalysis.matchedSkills?.length > 0 && (
            <div className="card mb">
              <h3>✅ Matched Skills</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {jdAnalysis.matchedSkills.map((skill, i) => (
                  <span key={i} className="skill-chip" style={{ backgroundColor: '#4CAF50', color: 'white' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {(jdAnalysis.missingSkills?.required?.length > 0 || jdAnalysis.missingSkills?.preferred?.length > 0) && (
            <div className="card mb">
              <h3>❌ Missing Skills</h3>
              {jdAnalysis.missingSkills?.required?.length > 0 && (
                <div className="mb">
                  <h4>Required Skills Missing:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {jdAnalysis.missingSkills.required.map((skill, i) => (
                      <span key={i} className="skill-chip" style={{ backgroundColor: '#DC3545', color: 'white' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {jdAnalysis.missingSkills?.preferred?.length > 0 && (
                <div>
                  <h4>Preferred Skills Missing:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {jdAnalysis.missingSkills.preferred.map((skill, i) => (
                      <span key={i} className="skill-chip" style={{ backgroundColor: '#FFC107', color: '#333' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keywords Analysis */}
          {(jdAnalysis.matchedKeywords?.length > 0 || jdAnalysis.missingKeywords?.length > 0) && (
            <div className="card mb">
              <h3>🔑 Keywords Analysis</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Matched: {jdAnalysis.matchedKeywords?.length || 0} | Partial: {jdAnalysis.partialKeywords?.length || 0} | Missing: {jdAnalysis.missingKeywords?.length || 0}
              </p>
              {jdAnalysis.matchedKeywords?.length > 0 && (
                <div className="mb">
                  <h4>Matched Keywords:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(keywordsExpanded ? jdAnalysis.matchedKeywords : jdAnalysis.matchedKeywords.slice(0, 10)).map((kw, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#E8F5E9', borderRadius: '4px', color: '#2E7D32' }}>
                        {kw}
                      </span>
                    ))}
                    {jdAnalysis.matchedKeywords.length > 10 && (
                      <span style={{ fontSize: '12px', padding: '4px 8px' }}>+{jdAnalysis.matchedKeywords.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}
              {jdAnalysis.missingKeywords?.length > 0 && (
                <div className="mb">
                  <h4>Missing Keywords:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(keywordsExpanded ? jdAnalysis.missingKeywords : jdAnalysis.missingKeywords.slice(0, 10)).map((kw, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#FFEBEE', borderRadius: '4px', color: '#C62828' }}>
                        {kw}
                      </span>
                    ))}
                    {jdAnalysis.missingKeywords.length > 10 && (
                      <span style={{ fontSize: '12px', padding: '4px 8px' }}>+{jdAnalysis.missingKeywords.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}
              {jdAnalysis.partialKeywords?.length > 0 && (
                <div>
                  <h4>Partially Matched Keywords:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(keywordsExpanded ? jdAnalysis.partialKeywords : jdAnalysis.partialKeywords.slice(0, 10)).map((kw, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#FFF3E0', borderRadius: '4px', color: '#E65100' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(jdAnalysis.matchedKeywords?.length > 10 || jdAnalysis.missingKeywords?.length > 10 || jdAnalysis.partialKeywords?.length > 10) && (
                <button className="btn secondary" onClick={() => setKeywordsExpanded((expanded) => !expanded)}>
                  {keywordsExpanded ? 'Show fewer' : 'View all keywords'}
                </button>
              )}
            </div>
          )}

          {/* Strengths */}
          {jdAnalysis.strengths?.length > 0 && (
            <div className="card mb">
              <h3>💪 Strengths</h3>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {jdAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {jdAnalysis.weaknesses?.length > 0 && (
            <div className="card mb">
              <h3>⚡ Weaknesses</h3>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {jdAnalysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Section Analysis */}
          {jdAnalysis.sectionAnalysis && Object.keys(jdAnalysis.sectionAnalysis).length > 0 && (
            <div className="card mb">
              <h3>📋 Section Analysis</h3>
              {Object.entries(jdAnalysis.sectionAnalysis).map(([section, details]) => (
                <div key={section} className="mb" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong>{section}</strong>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: details.status === 'Present' ? '#4CAF50' : details.status === 'Weak' ? '#FFC107' : '#DC3545',
                        color: details.status === 'Weak' ? '#333' : 'white'
                      }}
                    >
                      {details.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{details.feedback}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {jdAnalysis.recommendations?.length > 0 && (
            <div className="card mb">
              <h3>💡 Improvement Actions</h3>
              {jdAnalysis.recommendations.map((rec, i) => (
                <div key={i} className="mb" style={{ paddingBottom: '16px', borderBottom: i < jdAnalysis.recommendations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: rec.priority === 'High' ? '#DC3545' : rec.priority === 'Medium' ? '#FFC107' : '#17A2B8',
                        color: rec.priority === 'Medium' ? '#333' : 'white'
                      }}
                    >
                      {rec.priority}
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{rec.problem}</span>
                  </div>
                  <div style={{ marginLeft: '60px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                      <strong>Why it matters:</strong> {rec.impact}
                    </div>
                    <div style={{ fontSize: '13px', backgroundColor: '#F5F5F5', padding: '8px', borderRadius: '4px' }}>
                      <strong>Suggested action:</strong> {rec.suggestion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </>
  )
}
