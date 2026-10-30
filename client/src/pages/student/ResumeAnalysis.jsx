import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import './ResumeAnalysis.css'
import { MAX_JD_LENGTH, formatFileSize, getAnalysisRecord, getKeywordCounts, getScore, validateAnalysisInputs, validateFile } from './resumeAnalysisUtils'

const iconPaths = {
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5',
  file: 'M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6',
  briefcase: 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-12 3h16v9H4zm0 4h16M10 14h4',
  sparkle: 'm12 3 1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2z',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  external: 'M14 5h5v5m-1-4-8 8M19 14v5H5V5h5',
  refresh: 'M20 11a8 8 0 1 0 1 4',
}

function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" className="resume-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[name] || iconPaths.file} />
    </svg>
  )
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function ScoreRing({ value, tone = 'blue', label }) {
  const score = getScore(value)
  const degrees = score === null ? 0 : score * 3.6
  return (
    <div className={`resume-score-ring ${tone}`} style={{ '--score-degrees': `${degrees}deg` }}>
      <div className="resume-score-ring-inner">
        <strong>{score === null ? '—' : score}</strong>
        <span>{label || 'out of 100'}</span>
      </div>
    </div>
  )
}

function EmptyAnalysis() {
  return (
    <div className="resume-empty-state">
      <div className="resume-empty-icon"><Icon name="sparkle" size={26} /></div>
      <div>
        <h3>No analysis yet</h3>
        <p>Upload your resume and add a job description to generate your first saved report.</p>
      </div>
    </div>
  )
}

function LatestAnalysis({ analysis, loading }) {
  if (loading) return <div className="resume-loading-card">Loading your latest saved analysis...</div>
  if (!analysis) return <EmptyAnalysis />

  const { matched, partial, missing, total: totalKeywords } = getKeywordCounts(analysis)
  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : []
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : []
  const percentage = (count) => totalKeywords ? Math.round((count / totalKeywords) * 100) : 0

  return (
    <div className="latest-analysis-content">
      <div className="latest-analysis-meta">
        <span>Last analyzed {formatDate(analysis.timestamp || analysis.createdAt)}</span>
        {analysis.resumeInfo?.fileName && <span className="latest-source"><Icon name="file" size={14} /> {analysis.resumeInfo.fileName}</span>}
      </div>

      <div className="resume-preview-score-grid">
        <div className="resume-preview-score-card">
          <ScoreRing value={analysis.atsScore} tone="blue" />
          <div><span className="resume-card-label">ATS Score</span><strong>{getScore(analysis.atsScore) === null ? 'Unavailable' : getScore(analysis.atsScore) >= 75 ? 'Strong resume' : 'Room to improve'}</strong></div>
        </div>
        <div className="resume-preview-score-card">
          <ScoreRing value={analysis.jobMatchScore} tone="green" />
          <div><span className="resume-card-label">Job Match</span><strong>{analysis.matchLevel || 'Match calculated'}</strong></div>
        </div>
        <div className="resume-keyword-preview">
          <div className="resume-card-label">Keyword Match</div>
          <div className="resume-keyword-counts">
            <span className="keyword-count matched"><b>{matched.length}</b> Matched</span>
            <span className="keyword-count partial"><b>{partial.length}</b> Partial</span>
            <span className="keyword-count missing"><b>{missing.length}</b> Missing</span>
          </div>
          <div className="keyword-bars" aria-label="Keyword match distribution">
            <span className="keyword-bar matched" style={{ width: `${percentage(matched.length)}%` }} />
            <span className="keyword-bar partial" style={{ width: `${percentage(partial.length)}%` }} />
            <span className="keyword-bar missing" style={{ width: `${percentage(missing.length)}%` }} />
          </div>
        </div>
      </div>

      <div className="resume-preview-detail-grid">
        <div className="resume-detail-card strength-card">
          <div className="resume-detail-heading"><span className="detail-icon green"><Icon name="check" size={16} /></span><div><h3>Key Strengths</h3><p>What makes your resume stand out</p></div></div>
          {strengths.length ? <ul className="resume-bullet-list">{strengths.slice(0, 4).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="resume-muted-copy">No strengths were returned by this analysis.</p>}
        </div>
        <div className="resume-detail-card improvement-card">
          <div className="resume-detail-heading"><span className="detail-icon red">!</span><div><h3>Areas for Improvement</h3><p>Practical next steps from your analysis</p></div></div>
          {recommendations.length ? <ul className="resume-bullet-list">{recommendations.slice(0, 4).map((item, index) => <li key={`${item.problem || item.suggestion || item}-${index}`}>{typeof item === 'string' ? item : item.suggestion || item.problem}</li>)}</ul> : <p className="resume-muted-copy">No improvement recommendations were returned.</p>}
        </div>
      </div>

      <div className="latest-analysis-footer"><span>{totalKeywords} relevant keyword{totalKeywords === 1 ? '' : 's'} compared</span><Link className="resume-text-link" to={analysis.analysisId ? `/student/resume/report/${analysis.analysisId}` : '/student/resume/analysis-result'}>View Full Report <Icon name="arrow" size={16} /></Link></div>
    </div>
  )
}

function ResumeDropzone({ file, existing, onFile, onBrowse, onRemove, onView }) {
  const [dragging, setDragging] = useState(false)
  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    onFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="resume-upload-area-wrap">
      <div
        className={`resume-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="resume-upload-icon"><Icon name="upload" size={25} /></div>
        <strong>{file ? 'Resume selected' : existing ? 'Upload a replacement resume' : 'Drag & drop your resume here'}</strong>
        <span>or</span>
        <button type="button" className="resume-browse-button" onClick={onBrowse}>Browse files</button>
        <small>PDF, DOCX or DOC · Max 5MB</small>
      </div>
      {(file || existing) && (
        <div className="resume-file-row">
          <div className="resume-file-icon"><Icon name="file" size={19} /></div>
          <div className="resume-file-copy"><strong>{file?.name || existing.fileName}</strong><span>{file ? formatFileSize(file.size) : formatFileSize(existing.size)}{file ? ' · Ready to upload' : ' · Saved resume'}</span></div>
          {existing && !file && <button type="button" className="resume-file-action" onClick={onView}>View file</button>}
          <button type="button" className="resume-remove-file" aria-label="Remove selected resume" onClick={onRemove}>×</button>
        </div>
      )}
    </div>
  )
}

export default function ResumeAnalysis() {
  const navigate = useNavigate()
  const resumeInputRef = useRef(null)
  const jdInputRef = useRef(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [resume, setResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jdFile, setJdFile] = useState(null)
  const [jdFileMeta, setJdFileMeta] = useState(null)
  const [jdMode, setJdMode] = useState('paste')
  const [jdBusy, setJdBusy] = useState(false)
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [latest, setLatest] = useState(null)
  const [loadingLatest, setLoadingLatest] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const analysisInProgress = useRef(false)

  const loadLatest = useCallback(async () => {
    setLoadingLatest(true)
    try {
      const result = await api.get('/ai/resume-jd-analysis')
      if (result.ok) setLatest(result.data?.data || null)
      else if (result.status === 404) setLatest(null)
      else throw new Error(result.data?.message || 'Unable to load the latest analysis')
    } finally {
      setLoadingLatest(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadInitialData = async () => {
      try {
        const [resumeResult, latestResult] = await Promise.all([
          api.get('/student/resume'),
          api.get('/ai/resume-jd-analysis')
        ])
        if (!active) return

        if (resumeResult.ok) setResume(resumeResult.data?.data || null)
        else if (resumeResult.status !== 404) throw new Error(resumeResult.data?.message || 'Unable to load your resume')

        if (latestResult.ok) setLatest(latestResult.data?.data || null)
        else if (latestResult.status !== 404) throw new Error(latestResult.data?.message || 'Unable to load the latest analysis')
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) {
          setLoadingLatest(false)
          setPageLoading(false)
        }
      }
    }
    loadInitialData()
    return () => { active = false }
  }, [])

  const handleResumeFile = (file) => {
    if (!file) return
    const validation = validateFile(file, ['.pdf', '.docx', '.doc'])
    if (validation) { setError(validation); return }
    setError('')
    setResumeFile(file)
  }

  const handleViewResume = async () => {
    const popup = window.open('about:blank', '_blank')
    try {
      const result = await api.download('/student/resume/file')
      if (!result.ok) { popup?.close(); setError('Unable to open the saved resume.'); return }
      const blob = await result.response.blob()
      const url = URL.createObjectURL(blob)
      if (popup) popup.location.href = url
      else window.location.href = url
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      popup?.close()
      setError('Unable to open the saved resume.')
    }
  }

  const handleJdFile = async (file) => {
    const validation = validateFile(file, ['.pdf', '.docx'])
    if (validation) { setError(validation); return }
    setJdFile(file)
    setJdFileMeta(null)
    setJobDescription('')
    setJdBusy(true)
    setError('')
    const formData = new FormData()
    formData.append('jobDescription', file)
    try {
      const result = await api.upload('/ai/resume-jd/extract', formData)
      if (!result.ok) { setJdFile(null); setError(result.data?.message || 'Unable to extract the job description'); return }
      setJobDescription(result.data?.data?.text || '')
      setJdFileMeta(result.data?.data || null)
    } catch {
      setJdFile(null)
      setError('Unable to extract the job description right now.')
    } finally {
      setJdBusy(false)
    }
  }

  const switchJdMode = (mode) => {
    if (mode === jdMode) return
    setJdMode(mode)
    setJdFile(null)
    setJdFileMeta(null)
    setJobDescription('')
    setError('')
  }

  const handleAnalyze = async () => {
    if (analysisInProgress.current) return
    const inputError = validateAnalysisInputs({ resume: resumeFile || resume, jobDescription })
    if (inputError) { setError(inputError); return }
    const text = jobDescription.trim()
    analysisInProgress.current = true
    setAnalysisBusy(true)
    setError('')
    try {
      setUploadingResume(Boolean(resumeFile))
      const formData = new FormData()
      if (resumeFile) formData.append('resume', resumeFile)
      formData.append('jobDescription', text)
      formData.append('jobDescriptionSource', jdMode === 'file' ? 'file' : 'paste')
      formData.append('jobDescriptionFileName', jdFileMeta?.fileName || jdFile?.name || '')

      const result = await api.upload('/ai/analyze-resume-jd', formData)
      if (!result.ok) {
        setError(result.data?.message || 'Resume analysis failed. Your previous successful analysis was preserved.')
        return
      }
      const saved = getAnalysisRecord(result)
      const analysisId = typeof saved?.analysisId === 'string' ? saved.analysisId.trim() : ''
      if (!analysisId) {
        setError('The analysis request succeeded, but the server did not return a saved report ID. Your latest saved analysis was not replaced.')
        return
      }
      if (resumeFile) {
        setResume({
          resume: saved.resumeInfo?.viewUrl || '',
          fileName: saved.resumeInfo?.fileName || resumeFile.name,
          mimeType: saved.resumeInfo?.mimeType || resumeFile.type,
          size: saved.resumeInfo?.size || resumeFile.size
        })
        setResumeFile(null)
      }
      setLatest(saved)
      navigate(`/student/resume/report/${encodeURIComponent(analysisId)}`)
    } catch (analysisError) {
      setError(analysisError.message || 'Resume analysis failed. Your previous successful analysis was preserved.')
    } finally {
      setUploadingResume(false)
      setAnalysisBusy(false)
      analysisInProgress.current = false
    }
  }

  if (pageLoading) return <div className="resume-loading-page">Loading Resume AI...</div>

  return (
    <div className="resume-ai-page">
      <div className="resume-page-header">
        <div>
          <div className="resume-eyebrow">Career toolkit</div>
          <h1>Resume AI Analysis</h1>
          <p>Build a stronger resume and improve your job match</p>
        </div>
        <div className="resume-header-badge"><Icon name="sparkle" size={16} /> AI-powered insights</div>
      </div>

      {error && <div className="resume-alert error" role="alert">{error}</div>}
      <div className="resume-input-grid">
        <section className="resume-panel">
          <div className="resume-panel-heading"><div className="resume-panel-icon blue"><Icon name="file" size={20} /></div><div><h2>Upload Resume</h2><p>Upload your latest resume to analyze with AI</p></div></div>
          <input ref={resumeInputRef} className="resume-hidden-input" type="file" accept=".pdf,.docx,.doc" onChange={(event) => { handleResumeFile(event.target.files?.[0]); event.target.value = '' }} />
          <ResumeDropzone file={resumeFile} existing={resume} onFile={handleResumeFile} onBrowse={() => resumeInputRef.current?.click()} onRemove={() => setResumeFile(null)} onView={handleViewResume} />
          {resumeFile && <p className="resume-muted-copy">{resume ? 'This file will replace your saved resume when you analyze.' : 'This file will be saved when you analyze.'}</p>}
        </section>

        <section className="resume-panel">
          <div className="resume-panel-heading"><div className="resume-panel-icon purple"><Icon name="briefcase" size={20} /></div><div><h2>Job Description <span className="required-mark">*</span></h2><p>Add a job description to get a job match score and targeted suggestions</p></div></div>
          <div className="resume-tabs" role="tablist">
            <button type="button" className={jdMode === 'paste' ? 'active' : ''} onClick={() => switchJdMode('paste')}>Paste Job Description</button>
            <button type="button" className={jdMode === 'file' ? 'active' : ''} onClick={() => switchJdMode('file')}>Upload JD File</button>
          </div>
          {jdMode === 'paste' ? (
            <textarea className="resume-jd-textarea" value={jobDescription} maxLength={MAX_JD_LENGTH} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here...\n\nExample: We are looking for a software engineer with experience in React, Node.js, and REST APIs." />
          ) : (
            <>
              <input ref={jdInputRef} className="resume-hidden-input" type="file" accept=".pdf,.docx" onChange={(event) => { handleJdFile(event.target.files?.[0]); event.target.value = '' }} />
              <button type="button" className="resume-jd-dropzone" onClick={() => jdInputRef.current?.click()} disabled={jdBusy}><Icon name="upload" size={22} /><strong>{jdBusy ? 'Extracting job description...' : jdFile ? jdFile.name : 'Choose a PDF or DOCX job description'}</strong><span>{jdBusy ? 'Reading file securely on the server' : 'The text will be extracted before analysis'}</span></button>
              {jdFile && !jdBusy && <textarea className="resume-jd-textarea extracted" value={jobDescription} maxLength={MAX_JD_LENGTH} onChange={(event) => setJobDescription(event.target.value)} aria-label="Review extracted job description" />}
            </>
          )}
          <div className="resume-jd-footer"><span>{jobDescription.length}/{MAX_JD_LENGTH} characters</span><span className={jobDescription.trim() ? 'valid-text' : ''}>{jobDescription.trim() ? 'Ready to analyze' : 'Required'}</span></div>
          <div className="resume-info-banner"><Icon name="sparkle" size={17} /><span>Adding a job description helps the AI calculate job match, missing skills, and personalized improvement suggestions.</span></div>
        </section>
      </div>

      <button type="button" className="resume-analyze-button" onClick={handleAnalyze} disabled={analysisBusy || jdBusy || !(resumeFile || resume) || !jobDescription.trim()}><Icon name="sparkle" size={19} />{uploadingResume ? 'Uploading resume...' : analysisBusy ? 'Analyzing your resume...' : 'Analyze Resume'}</button>
      {!resumeFile && !resume && <p className="resume-input-requirement">Upload a PDF, DOCX, or DOC resume to enable analysis.</p>}
      {!jobDescription.trim() && !jdBusy && <p className="resume-input-requirement">A job description is required to calculate your job match.</p>}

      <section className="resume-how-section">
        <div className="resume-section-heading"><div><div className="resume-eyebrow">Simple three-step process</div><h2>How it works</h2><p>Get personalized insights in just a few steps</p></div></div>
        <div className="resume-how-grid">
          <div className="resume-how-card"><span className="resume-step-number">1</span><div className="resume-how-icon blue"><Icon name="upload" size={22} /></div><h3>Upload Resume</h3><p>Upload your latest resume in PDF, DOCX, or DOC format.</p></div>
          <div className="resume-how-arrow"><Icon name="arrow" size={22} /></div>
          <div className="resume-how-card"><span className="resume-step-number">2</span><div className="resume-how-icon purple"><Icon name="briefcase" size={22} /></div><h3>Add Job Description</h3><p>Paste or upload the job description to get a better match score.</p></div>
          <div className="resume-how-arrow"><Icon name="arrow" size={22} /></div>
          <div className="resume-how-card"><span className="resume-step-number">3</span><div className="resume-how-icon green"><Icon name="sparkle" size={22} /></div><h3>Get AI Insights</h3><p>View your ATS score, strengths, and improvement suggestions.</p></div>
        </div>
      </section>

      <section className="resume-latest-section">
        <div className="resume-section-heading latest-heading"><div><div className="resume-eyebrow">Your saved results</div><h2>Latest Analysis</h2><p>Review the most recent analysis saved to your account</p></div>{latest && <button type="button" className="resume-refresh-button" onClick={() => loadLatest().catch((loadError) => setError(loadError.message))}><Icon name="refresh" size={15} /> Refresh</button>}</div>
        <LatestAnalysis analysis={latest} loading={loadingLatest} />
      </section>
    </div>
  )
}
