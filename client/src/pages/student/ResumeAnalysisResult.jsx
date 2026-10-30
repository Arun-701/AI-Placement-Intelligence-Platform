import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import './ResumeAnalysis.css'

const formatAnalysisDate = (value) => {
  if (!value) return 'Analysis date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Analysis date unavailable' : date.toLocaleString()
}

const displayValue = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (!value || typeof value !== 'object') return ''
  return value.title || value.name || value.institution || value.degree || value.company || value.role || value.raw || JSON.stringify(value)
}

const improvementText = (value) => typeof value === 'string'
  ? value
  : value?.problem || value?.suggestion || value?.title || ''

function DetailList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <section className="resume-report-detail">
      <h3>{title}</h3>
      <ul>{items.map((item, index) => <li key={`${displayValue(item)}-${index}`}>{displayValue(item)}</li>)}</ul>
    </section>
  )
}

function RecommendationDetails({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <section className="resume-report-detail">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <div className="resume-report-detail" key={`${improvementText(item)}-${index}`}>
          <p><strong>{improvementText(item)}</strong></p>
          {typeof item === 'object' && item.impact && <p><strong>Why it matters:</strong> {item.impact}</p>}
          {typeof item === 'object' && item.suggestion && <p><strong>Suggested action:</strong> {item.suggestion}</p>}
        </div>
      ))}
    </section>
  )
}

export default function ResumeAnalysisResult() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api.get('/ai/resume-jd-analysis')
      .then((response) => {
        if (!active) return
        if (response.ok && response.data?.data) {
          setResult(response.data.data)
        } else {
          setError(response.data?.message || 'Unable to load the latest resume analysis.')
        }
      })
      .catch(() => {
        if (active) setError('Unable to load the latest resume analysis.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  if (loading) {
    return <div className="resume-result-state" role="status">Loading your latest resume analysis...</div>
  }

  if (!result) {
    return (
      <section className="resume-result-state">
        <h1>Resume Analysis Report</h1>
        <p>{error || 'No saved resume analysis is available yet.'}</p>
        <Link className="btn" to="/student/resume">Back to Resume AI</Link>
      </section>
    )
  }

  const resumeAnalysis = result.resumeAnalysis || {}
  const jdAnalysis = result.resumeJDAnalysis || (result.hasJobDescription ? result : null)
  const score = result.resumeScore ?? resumeAnalysis.resumeScore ?? resumeAnalysis.overallScore ?? null
  const atsScore = result.atsScore ?? resumeAnalysis.atsScore ?? resumeAnalysis.atsAnalysis?.score ?? score
  const matchedKeywords = jdAnalysis?.matchedKeywords || []
  const partialKeywords = jdAnalysis?.partialKeywords || []
  const missingKeywords = jdAnalysis?.missingKeywords || []
  const keywordTotal = matchedKeywords.length + partialKeywords.length + missingKeywords.length
  const strengths = resumeAnalysis.strengths?.length ? resumeAnalysis.strengths : jdAnalysis?.strengths || []
  const improvements = resumeAnalysis.recommendations?.length ? resumeAnalysis.recommendations : jdAnalysis?.recommendations || []
  const analyzedAt = result.lastResumeAnalysisDate || result.analyzedAt || resumeAnalysis.analyzedAt

  return (
    <div className="resume-result-page">
      <header className="resume-page-header">
        <h1>Resume Analysis Report</h1>
        <p>Your latest saved resume analysis</p>
      </header>

      <section className="resume-latest-section">
        <div className="resume-section-heading resume-latest-heading">
          <div><h2>Latest Analysis</h2><p>Here's your latest resume analysis result</p></div>
          <div className="resume-latest-meta">
            <span>Analyzed on {formatAnalysisDate(analyzedAt)}</span>
            <a href="#resume-full-report">View Full Report →</a>
          </div>
        </div>

        <div className="resume-result-summary">
          <h3>Resume Analysis</h3>
          {resumeAnalysis.summary && <p>{resumeAnalysis.summary}</p>}
          <div className="resume-overall-score">
            <strong>Overall Score</strong>
            <span>{score === null ? '—' : Math.round(Number(score))}{score === null ? '' : <small>/100</small>}</span>
          </div>
        </div>

        <div className="resume-latest-grid resume-latest-metrics">
          <article className="resume-latest-side-card resume-score-card">
            <h3>ATS Score</h3>
            <div className={`resume-progress-ring${atsScore === null || atsScore === undefined ? ' is-empty' : ''}`} style={{ '--progress': `${Math.max(0, Math.min(100, Number(atsScore) || 0))}%` }}>
              <span>{atsScore === null || atsScore === undefined ? '—' : Math.round(Number(atsScore))}<small>/100</small></span>
            </div>
            <p>Overall resume quality</p>
          </article>

          <article className="resume-latest-side-card resume-score-card resume-score-card-match">
            <h3>Job Match</h3>
            {jdAnalysis && jdAnalysis.jobMatchScore !== undefined && jdAnalysis.jobMatchScore !== null ? (
              <div className="resume-progress-ring" style={{ '--progress': `${Math.max(0, Math.min(100, Number(jdAnalysis.jobMatchScore) || 0))}%` }}>
                <span>{Math.round(Number(jdAnalysis.jobMatchScore))}<small>%</small></span>
              </div>
            ) : <div className="resume-result-not-analyzed">Not analyzed</div>}
            <p>{jdAnalysis?.matchLevel || 'No job description provided'}</p>
          </article>

          <article className="resume-latest-side-card resume-keyword-card">
            <h3>Keyword Match</h3>
            {jdAnalysis ? (
              <>
                <div className="resume-keyword-counts">
                  <span><strong>{matchedKeywords.length}<small>/{keywordTotal}</small></strong>Matched</span>
                  <span><strong>{partialKeywords.length}<small>/{keywordTotal}</small></strong>Partial</span>
                  <span><strong>{missingKeywords.length}<small>/{keywordTotal}</small></strong>Missing</span>
                </div>
                {[
                  ['Matched keywords', matchedKeywords],
                  ['Partial keywords', partialKeywords],
                  ['Missing keywords', missingKeywords]
                ].map(([title, keywords]) => keywords.length > 0 && (
                  <div className="resume-report-detail" key={title}>
                    <h3>{title}</h3>
                    <p>{keywords.map(displayValue).join(', ')}</p>
                  </div>
                ))}
              </>
            ) : <p className="resume-latest-empty">No job description provided. Keyword matching was not performed.</p>}
          </article>
        </div>

        <div className="resume-latest-grid resume-latest-lists">
          <article className="resume-latest-side-card resume-strength-card">
            <h3><span aria-hidden="true">✓</span> Key Strengths</h3>
            {strengths.length ? <ul>{strengths.map((item, index) => <li key={`${displayValue(item)}-${index}`}>{displayValue(item)}</li>)}</ul> : <p className="resume-latest-empty">No strengths were returned in this analysis.</p>}
          </article>
          <article className="resume-latest-side-card resume-improvement-card">
            <h3><span aria-hidden="true">↗</span> Areas for Improvement</h3>
            {improvements.length ? <ol>{improvements.map((item, index) => <li key={`${improvementText(item)}-${index}`}>{improvementText(item)}</li>)}</ol> : <p className="resume-latest-empty">No improvement suggestions were returned in this analysis.</p>}
          </article>
        </div>
      </section>

      <section className="resume-full-report" id="resume-full-report">
        <div className="resume-section-heading">
          <div><h2>Detailed Resume Analysis</h2><p>Full details from the saved analysis</p></div>
          <Link className="resume-result-back" to="/student/resume">Analyze another resume</Link>
        </div>

        {resumeAnalysis.summary && <p>{resumeAnalysis.summary}</p>}
        {resumeAnalysis.detectedSkills && Object.entries(resumeAnalysis.detectedSkills).map(([category, items]) => (
          <DetailList key={category} title={category} items={items} />
        ))}
        <DetailList title="Skills" items={resumeAnalysis.skills} />
        <DetailList title="Education" items={resumeAnalysis.education} />
        <DetailList title="Experience" items={resumeAnalysis.experience} />
        <DetailList title="Projects" items={resumeAnalysis.projects} />
        <DetailList title="Certifications" items={resumeAnalysis.certifications} />
        <DetailList title="Weaknesses" items={resumeAnalysis.weaknesses} />
        <DetailList title="Missing Skills" items={resumeAnalysis.missingSkills} />
        <DetailList title="Recommended Roles" items={resumeAnalysis.recommendedRoles} />
        <DetailList title="Skill Gap Analysis" items={resumeAnalysis.skillGapAnalysis} />
        <DetailList title="Learning Recommendations" items={resumeAnalysis.learningRecommendations} />
        <RecommendationDetails title="Resume Recommendations" items={resumeAnalysis.recommendations} />

        {resumeAnalysis.atsAnalysis && (
          <section className="resume-report-detail">
            <h3>ATS Analysis Details</h3>
            <p>Score: {resumeAnalysis.atsAnalysis.score ?? '—'}</p>
            <DetailList title="ATS Keywords" items={resumeAnalysis.atsAnalysis.keywords} />
            <DetailList title="Missing ATS Keywords" items={resumeAnalysis.atsAnalysis.missingKeywords} />
            <DetailList title="Formatting Suggestions" items={resumeAnalysis.atsAnalysis.formattingSuggestions} />
            <DetailList title="Content Suggestions" items={resumeAnalysis.atsAnalysis.contentSuggestions} />
          </section>
        )}

        {jdAnalysis && (
          <section className="resume-report-detail">
            <h3>Job Description Comparison</h3>
            {jdAnalysis.summary && <p>{jdAnalysis.summary}</p>}
            <DetailList title="Matched Skills" items={jdAnalysis.matchedSkills} />
            <DetailList title="Missing Skills" items={[...(jdAnalysis.missingSkills?.required || []), ...(jdAnalysis.missingSkills?.preferred || [])]} />
            <DetailList title="Weaknesses" items={jdAnalysis.weaknesses} />
            <RecommendationDetails title="Job Match Recommendations" items={jdAnalysis.recommendations} />
            {jdAnalysis.sectionAnalysis && Object.entries(jdAnalysis.sectionAnalysis).map(([section, details]) => (
              <div className="resume-report-detail" key={section}>
                <h3>{section}: {details.status}</h3>
                <p>{details.feedback}</p>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  )
}
