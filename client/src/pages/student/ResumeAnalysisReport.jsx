import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'
import { getAnalysisRecord, getKeywordCounts, getScore } from './resumeAnalysisUtils'
import './ResumeAnalysis.css'

function Icon({ name, size = 18 }) {
  const paths = {
    arrowLeft: 'M19 12H5m6 6-6-6 6-6',
    download: 'M12 3v12m0 0 5-5m-5 5-5-5M5 21h14',
    file: 'M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6',
    external: 'M14 5h5v5m-1-4-8 8M19 14v5H5V5h5',
    check: 'm5 12 4 4L19 6',
  }
  return <svg aria-hidden="true" className="resume-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.file} /></svg>
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatSource(analysis) {
  if (analysis?.jobDescriptionInfo?.source === 'file') return analysis.jobDescriptionInfo.fileName || 'Uploaded job description'
  return 'Pasted job description'
}

function ScoreRing({ value, tone = 'blue' }) {
  const score = getScore(value)
  const degrees = score === null ? 0 : score * 3.6
  return <div className={`resume-score-ring ${tone}`} style={{ '--score-degrees': `${degrees}deg` }}><div className="resume-score-ring-inner"><strong>{score === null ? '—' : score}</strong><span>out of 100</span></div></div>
}

function KeywordGroup({ label, values, tone, total }) {
  const items = Array.isArray(values) ? values : []
  const width = total ? Math.round((items.length / total) * 100) : 0
  return <div className={`resume-report-keyword-group ${tone}`}><header><h3>{label}</h3><strong>{items.length}</strong></header><div className="resume-report-line"><span style={{ width: `${width}%` }} /></div><div className="resume-report-keyword-list">{items.length ? items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>) : <span>No terms returned</span>}</div></div>
}

function SectionStatus({ status }) {
  const normalized = String(status || 'Missing').toLowerCase()
  const tone = normalized === 'present' ? 'present' : normalized === 'partial' || normalized === 'weak' ? 'partial' : 'missing'
  return <span className={`resume-section-status ${tone}`}>{tone === 'present' ? '✓' : tone === 'partial' ? '~' : '!'}</span>
}

function ListOrEmpty({ items, className = '' }) {
  if (!Array.isArray(items) || !items.length) return <p className="resume-report-footer-note">This analysis did not return any items in this category.</p>
  return <ul className={`resume-report-list ${className}`}>{items.map((item, index) => <li key={`${typeof item === 'string' ? item : item.problem || item.suggestion || index}-${index}`}>{typeof item === 'string' ? item : item.suggestion || item.problem}</li>)}</ul>
}

export default function ResumeAnalysisReport() {
  const { analysisId } = useParams()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadedAnalysisId, setLoadedAnalysisId] = useState('')

  useEffect(() => {
    let active = true
    if (!analysisId?.trim()) return () => { active = false }

    api.get(`/ai/resume-jd-analysis/${encodeURIComponent(analysisId)}`)
      .then((result) => {
        if (!active) return
        const report = getAnalysisRecord(result)
        if (result.ok && report && String(report.analysisId) === analysisId) {
          setAnalysis(report)
          setError('')
        }
        else if (result.ok) setError('The server response did not contain the requested saved report.')
        else if (result.status === 401) setError('Your session has expired. Sign in again to view this report.')
        else if (result.status === 403) setError(result.data?.message || 'You are not allowed to view this report.')
        else if (result.status === 404) setError('This report was not found for your account. It may no longer be the latest saved analysis.')
        else setError(result.data?.message || 'The report could not be loaded. Please try again.')
      })
      .catch(() => { if (active) setError('Unable to load this report. Check your connection and try again.') })
      .finally(() => {
        if (active) {
          setLoading(false)
          setLoadedAnalysisId(analysisId)
        }
      })
    return () => { active = false }
  }, [analysisId])

  const handleViewResume = async () => {
    const popup = window.open('about:blank', '_blank')
    try {
      const result = await api.download('/student/resume/file')
      if (!result.ok) { popup?.close(); return }
      const url = URL.createObjectURL(await result.response.blob())
      if (popup) popup.location.href = url
      else window.location.href = url
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      popup?.close()
    }
  }

  if (!analysisId?.trim()) return <div className="resume-report-page"><Link className="resume-report-back" to="/student/resume"><Icon name="arrowLeft" size={16} /> Back to Resume AI</Link><div className="resume-alert error" role="alert">This report link is missing its analysis ID. Open your latest report from Resume AI.</div></div>
  if (loading || loadedAnalysisId !== analysisId) return <div className="resume-loading-page" role="status">Loading your analysis report...</div>
  if (error || !analysis) return <div className="resume-report-page"><Link className="resume-report-back" to="/student/resume"><Icon name="arrowLeft" size={16} /> Back to Resume AI</Link><div className="resume-alert error" role="alert">{error || 'No saved report is available for this link.'}</div></div>

  const { matched: matchedKeywords, partial: partialKeywords, missing: missingKeywords, total: totalKeywords } = getKeywordCounts(analysis)
  const sections = analysis.sectionAnalysis && typeof analysis.sectionAnalysis === 'object' ? Object.entries(analysis.sectionAnalysis) : []
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : []
  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : []
  const matchedSkills = Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : []
  const missingRequired = Array.isArray(analysis.missingSkills?.required) ? analysis.missingSkills.required : []
  const missingPreferred = Array.isArray(analysis.missingSkills?.preferred) ? analysis.missingSkills.preferred : []
  const semanticSimilarity = analysis.semanticSimilarity
  const phraseOverlap = analysis.phraseOverlap

  return (
    <div className="resume-report-page">
      <div className="resume-report-header">
        <div>
          <Link className="resume-report-back" to="/student/resume"><Icon name="arrowLeft" size={16} /> Back to Resume AI</Link>
          <div className="resume-eyebrow">Saved analysis report</div>
          <h1>Resume Analysis Report</h1>
          <p>Detailed findings from your latest resume analysis</p>
        </div>
        <div className="resume-report-actions"><button type="button" className="resume-report-action" onClick={() => window.print()}><Icon name="download" size={15} /> Download Report (PDF)</button></div>
      </div>

      <div className="resume-report-meta"><span>Analyzed {formatDate(analysis.timestamp || analysis.createdAt)}</span><span><Icon name="file" size={14} /> {analysis.resumeInfo?.fileName || 'Resume file'}</span><span>JD: {formatSource(analysis)}</span>{analysis.resumeInfo?.viewUrl && <button type="button" className="resume-text-link" onClick={handleViewResume}>View resume <Icon name="external" size={14} /></button>}</div>

      <div className="resume-report-score-grid">
        <div className="resume-report-card resume-report-score-card"><ScoreRing value={analysis.atsScore} tone="blue" /><div><h2>ATS Score</h2><p>{getScore(analysis.atsScore) === null ? 'Not provided by the analysis' : getScore(analysis.atsScore) >= 75 ? 'Strong resume structure' : 'Opportunities to improve ATS readiness'}</p></div></div>
        <div className="resume-report-card resume-report-score-card"><ScoreRing value={analysis.jobMatchScore} tone="green" /><div><h2>Job Match</h2><p>{analysis.matchLevel || 'Match category unavailable'}</p></div></div>
        <div className="resume-report-card resume-report-score-card"><div className="resume-report-match-mark"><span>{analysis.matchLevel ? '✓' : '—'}</span></div><div><h2>Match Level</h2><p>{analysis.matchLevel || 'Unavailable'}</p></div></div>
      </div>

      <section className="resume-report-section"><div className="resume-report-card"><h2>Resume–JD Comparison Summary</h2><p>{analysis.summary || 'No comparison summary was returned by the analysis service.'}</p><div className="resume-report-summary-grid"><div className="resume-report-summary-stat"><strong>{matchedKeywords.length}</strong><span>Matched keywords</span></div><div className="resume-report-summary-stat"><strong>{partialKeywords.length}</strong><span>Partial keywords</span></div><div className="resume-report-summary-stat"><strong>{missingKeywords.length}</strong><span>Missing keywords</span></div><div className="resume-report-summary-stat"><strong>{totalKeywords}</strong><span>Total relevant terms</span></div></div></div></section>

      <section className="resume-report-section"><div className="resume-report-card"><h2>Keyword Match Details</h2><p>Terms below are taken from the saved resume-to-job-description comparison.</p><div className="resume-report-keywords"><KeywordGroup label="Matched" values={matchedKeywords} tone="matched" total={totalKeywords} /><KeywordGroup label="Partially matched" values={partialKeywords} tone="partial" total={totalKeywords} /><KeywordGroup label="Missing" values={missingKeywords} tone="missing" total={totalKeywords} /></div></div></section>

      <section className="resume-report-section"><div className="resume-report-card"><h2>Semantic Similarity</h2><p>Text similarity metrics returned by the analysis service.</p>{semanticSimilarity !== undefined && semanticSimilarity !== null && <div className="resume-report-metric"><div style={{ flex: 1 }}><span>Semantic similarity</span><div className="resume-report-line"><span style={{ width: `${Math.max(0, Math.min(100, Number(semanticSimilarity) * 100))}%` }} /></div></div><strong>{(Number(semanticSimilarity) * 100).toFixed(1)}%</strong></div>}{phraseOverlap !== undefined && phraseOverlap !== null && <div className="resume-report-metric"><div style={{ flex: 1 }}><span>Phrase overlap</span><div className="resume-report-line"><span style={{ width: `${Math.max(0, Math.min(100, Number(phraseOverlap) * 100))}%` }} /></div></div><strong>{(Number(phraseOverlap) * 100).toFixed(1)}%</strong></div>}{(semanticSimilarity === undefined || semanticSimilarity === null) && (phraseOverlap === undefined || phraseOverlap === null) && <p className="resume-report-footer-note">Unavailable for this analysis because the semantic metrics were not returned by the analysis service.</p>}</div></section>

      <section className="resume-report-section"><div className="resume-report-grid-2"><div className="resume-report-card"><h2>Key Strengths</h2><ListOrEmpty items={strengths} /></div><div className="resume-report-card"><h2>Areas for Improvement</h2><ListOrEmpty items={recommendations} className="improvements" /></div></div></section>

      {sections.length > 0 && <section className="resume-report-section"><div className="resume-report-card"><h2>Section Analysis</h2><p>Section statuses reflect what the analysis service detected in the uploaded resume.</p><div className="resume-report-section-analysis">{sections.map(([name, details]) => <div className="resume-section-result" key={name}><SectionStatus status={details?.status} /><div><strong>{name}</strong><p>{details?.feedback || 'No section explanation was returned.'}</p></div></div>)}</div></div></section>}

      <section className="resume-report-section"><div className="resume-report-card"><h2>Detailed Analysis</h2><div className="resume-detail-block"><h3>Resume Summary</h3><p>{analysis.summary || 'No resume summary was returned.'}</p></div><div className="resume-detail-block"><h3>Skills Analysis</h3>{matchedSkills.length || missingRequired.length || missingPreferred.length ? <><p>{matchedSkills.length ? `Matched skills: ${matchedSkills.join(', ')}.` : 'No directly matched skills were returned.'}</p>{missingRequired.length > 0 && <p>Required gaps: {missingRequired.join(', ')}.</p>}{missingPreferred.length > 0 && <p>Preferred gaps: {missingPreferred.join(', ')}.</p>}</> : <p>No skill-level details were returned.</p>}</div><div className="resume-detail-block"><h3>JD Match Analysis</h3><p>{analysis.matchLevel ? `${analysis.matchLevel} based on the saved job description comparison.` : 'No match-level explanation was returned.'}</p></div><div className="resume-detail-block"><h3>Keyword Analysis</h3><div className="resume-tag-row">{matchedKeywords.slice(0, 20).map((keyword, index) => <span className="resume-tag" key={`${keyword}-${index}`}>{keyword}</span>)}</div>{!matchedKeywords.length && <p>No matched keyword details were returned.</p>}</div></div></section>

      <section className="resume-report-section"><div className="resume-report-card"><h2>Analysis Information</h2><div className="resume-report-meta" style={{ marginBottom: 0 }}><span>Analysis ID: {analysis.analysisId}</span><span>Source: {analysis.analysisSource || 'Available analysis service'}</span><span>Job description: {formatSource(analysis)}</span></div></div></section>
    </div>
  )
}
