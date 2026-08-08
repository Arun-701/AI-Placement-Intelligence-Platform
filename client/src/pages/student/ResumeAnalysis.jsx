import { useState, useRef } from 'react'
import { api } from '../../api'

export default function ResumeAnalysis() {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    const fd = new FormData()
    fd.append('resume', file)
    const r = await api.upload('/student/resume', fd)
    setBusy(false)
    if (r.ok) {
      setError('')
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

  const a = analysis || {}
  const data = a.analysis || a

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
          <button className="btn" onClick={upload} disabled={busy || !file}>{busy ? 'Uploading...' : 'Upload & Analyze'}</button>
        </div>
        <p className="mt" style={{ fontSize: 13, color: 'var(--muted)' }}>Supported: PDF only.</p>
      </div>

      {data && data.message && <div className="card"><p>{data.message}</p></div>}

      {typeof data.score === 'number' && (
        <div className="card mb">
          <h3>Resume Score</h3>
          <div className="score-ring">{data.score}%</div>
          <div className="mt progress-bar"><div style={{ width: `${Math.min(100, data.score)}%` }} /></div>
        </div>
      )}

      {data.skills?.length > 0 && (
        <div className="card mb">
          <h3>Detected Skills</h3>
          {data.skills.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
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

      {data.suggestions?.length > 0 && (
        <div className="card mb">
          <h3>Suggestions</h3>
          <ul style={{ paddingLeft: 20, fontSize: 14 }}>{data.suggestions.map((s, i) => <li key={i} className="list-item">{s}</li>)}</ul>
        </div>
      )}
    </>
  )
}