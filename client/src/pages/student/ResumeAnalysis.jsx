import { useState, useRef, useEffect } from 'react'
import { api } from '../../api'

export default function ResumeAnalysis() {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasResume, setHasResume] = useState(false)
  const [resumePath, setResumePath] = useState('')

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
      await analyze()
    } else {
      setError(r.data?.message || 'Upload failed')
    }
  }

  const analyze = async () => {
    setBusy(true)
    setError('')
    const r = await api.post('/ai/resume-analysis/refresh', {})
    if (r.ok) {
      setAnalysis(r.data.data)
    } else if (r.status === 404) {
      setAnalysis({ score: 0, message: 'No resume uploaded yet. Upload your resume first, then click Analyze.' })
    } else {
      setError(r.data?.message || 'Analysis failed (check Gemini API key/quota)')
    }
    setBusy(false)
  }

  const loadAnalysis = async () => {
    setBusy(true)
    const r = await api.get('/ai/resume-analysis')
    setBusy(false)
    if (r.ok) setAnalysis(r.data.data)
    else if (r.status === 404) setAnalysis({ score: 0, message: 'No resume analysis available yet.' })
    else setError(r.data?.message || 'Failed to load analysis')
  }

  useEffect(() => {
    const checkResume = async () => {
      try {
        const r = await api.get('/student/resume')
        if (r.ok && r.data?.data?.resume) {
          setHasResume(true)
          setResumePath(r.data.data.resume)
          if (r.data.data.resumeAnalysis) setAnalysis(r.data.data.resumeAnalysis)
        } else {
          setHasResume(false)
          setResumePath('')
        }
      } catch (e) {
        setHasResume(false)
      }
    }

    checkResume()
  }, [])

  const a = analysis || {}
  const data = a // analysis now returns the normalized object directly

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Resume AI Analysis</h1>
          <div className="subtitle">Upload your resume and get AI-powered feedback</div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={loadAnalysis}>Load Analysis</button>
          <button className="btn secondary" onClick={analyze} disabled={busy}>{busy ? 'Analyzing...' : 'Refresh Analysis'}</button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card mb">
        <h3>Upload Resume (PDF)</h3>
        <div className="row">
          <input type="file" ref={fileRef} accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
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
        <p className="mt" style={{ fontSize: 13, color: 'var(--muted)' }}>Supported: PDF only.</p>
      </div>

      {data && data.message && <div className="card"><p>{data.message}</p></div>}

      {data && (
        <>
          <div className="card mb">
            <h3>Resume Overview</h3>
            <p>{data.summary || 'No summary available.'}</p>
            {data.analysisSource === 'fallback' && (
              <div className="alert">{data.aiFailureMessage || 'AI analysis is currently unavailable. Showing resume extraction-based analysis.'}</div>
            )}
          </div>

          <div className="card mb">
            <h3>Resume Score</h3>
            <div className="score-ring">{data.overallScore ?? data.resumeScore ?? 0}%</div>
            <div className="mt progress-bar"><div style={{ width: `${Math.min(100, data.overallScore ?? data.resumeScore ?? 0)}%` }} /></div>
            <div className="mt">ATS Score: {data.atsScore ?? data.atsAnalysis?.score ?? 0}%</div>
          </div>

          <div className="card mb">
            <h3>Detected Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(data.detectedSkills || {}).map(([cat, arr]) => (
                arr && arr.length > 0 ? (
                  <div key={cat} style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.replace(/([A-Z])/g, ' $1')}</div>
                    <div style={{ marginTop: 6 }}>{arr.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}</div>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {data.softSkills?.length > 0 && (
            <div className="card mb">
              <h3>Soft Skills</h3>
              <div>{data.softSkills.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}</div>
            </div>
          )}

          {data.strengths?.length > 0 && (
            <div className="card mb">
              <h3>Strengths</h3>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>{data.strengths.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
            </div>
          )}

          {data.weaknesses?.length > 0 && (
            <div className="card mb">
              <h3>Weaknesses</h3>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>{data.weaknesses.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
            </div>
          )}

          {data.missingSkills?.length > 0 && (
            <div className="card mb">
              <h3>Missing Skills</h3>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>{data.missingSkills.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
            </div>
          )}

          {data.education?.length > 0 && (
            <div className="card mb">
              <h3>Education</h3>
              {data.education.map((ed, i) => (
                <div key={i} className="mb">
                  <strong>{ed.degree || ''} {ed.institution ? `— ${ed.institution}` : ''}</strong>
                  <div style={{ fontSize: 13 }}>{ed.relevantCoursework ? `Relevant coursework: ${ed.relevantCoursework.join(', ')}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {data.projects?.length > 0 && (
            <div className="card mb">
              <h3>Projects</h3>
              {data.projects.map((p, i) => (
                <div key={i} className="mb">
                  <strong>{p.name || `Project ${i + 1}`}</strong>
                  <div style={{ fontSize: 13 }}>{p.technologies ? `Technologies: ${p.technologies.join(', ')}` : ''}</div>
                  <div style={{ fontSize: 13 }}>{p.description || ''}</div>
                  {p.suggestion && <div className="mt">Suggestion: {p.suggestion}</div>}
                </div>
              ))}
            </div>
          )}

          {data.certifications?.length > 0 && (
            <div className="card mb">
              <h3>Certifications</h3>
              <ul>{data.certifications.map((c, i) => <li key={i}>{typeof c === 'string' ? c : (c.name || JSON.stringify(c))}</li>)}</ul>
            </div>
          )}

          {data.experience?.length > 0 ? (
            <div className="card mb">
              <h3>Experience</h3>
              {data.experience.map((eX, i) => (
                <div key={i} className="mb">
                  <strong>{eX.role || ''} {eX.company ? `— ${eX.company}` : ''}</strong>
                  <div style={{ fontSize: 13 }}>{eX.responsibilities || ''}</div>
                  <div style={{ fontSize: 13 }}>{eX.technologies ? `Technologies: ${eX.technologies.join(', ')}` : ''}</div>
                  <div style={{ fontSize: 13 }}>{eX.achievements || ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card mb"><p>No professional experience detected.</p></div>
          )}

          {data.atsAnalysis && (
            <div className="card mb">
              <h3>ATS Analysis</h3>
              <div>Score: {data.atsAnalysis.score}%</div>
              {data.atsAnalysis.keywords?.length > 0 && <div>Keywords: {data.atsAnalysis.keywords.join(', ')}</div>}
              {data.atsAnalysis.missingKeywords?.length > 0 && <div>Missing Keywords: {data.atsAnalysis.missingKeywords.join(', ')}</div>}
              {data.atsAnalysis.formattingSuggestions?.length > 0 && (
                <div>
                  <h4>Formatting Suggestions</h4>
                  <ul>{data.atsAnalysis.formattingSuggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {data.recommendedRoles?.length > 0 && (
            <div className="card mb">
              <h3>Recommended Roles</h3>
              <div>{data.recommendedRoles.join(', ')}</div>
            </div>
          )}

          {data.skillGapAnalysis?.length > 0 && (
            <div className="card mb">
              <h3>Skill Gap Analysis</h3>
              {data.skillGapAnalysis.map((g, i) => (
                <div key={i} className="mb"><strong>{g.role || `Role ${i + 1}`}</strong><div>{g.existingSkills ? `Existing: ${g.existingSkills.join(', ')}` : ''}</div><div>{g.missingSkills ? `Missing: ${g.missingSkills.join(', ')}` : ''}</div></div>
              ))}
            </div>
          )}

          {data.recommendations?.length > 0 && (
            <div className="card mb">
              <h3>Recommendations</h3>
              <ul>{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {data.improvementPlan?.length > 0 && (
            <div className="card mb">
              <h3>Improvement Plan</h3>
              <ul>{data.improvementPlan.map((it, idx) => <li key={idx}>{it}</li>)}</ul>
            </div>
          )}

          {data.learningRecommendations?.length > 0 && (
            <div className="card mb">
              <h3>Learning Recommendations</h3>
              <ul>{data.learningRecommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
        </>
      )}
    </>
  )
}