import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import './Roadmap.css'

function Milestone({ m, onToggle, onAssess, assessing }) {
  const badge = m.status === 'Completed' ? 'green' : m.status === 'In Progress' ? 'amber' : 'gray'
  return (
    <div className="card mb">
      <div className="row between">
        <div>
          <h3>{m.title}</h3>
          {m.description && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{m.description}</p>}
          {Array.isArray(m.learningResources) && m.learningResources.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <strong style={{ fontSize: 13 }}>Learning Resources</strong>
              <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 4 }}>
                {m.learningResources.map((resource) => (
                  <li key={resource.url}>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className={`badge ${badge}`} style={{ marginTop: 8 }}>{m.status}</span>
          {m.adaptiveReadiness?.level && <span className="badge blue" style={{ marginTop: 8, marginLeft: 8 }}>Readiness: {m.adaptiveReadiness.level} ({m.adaptiveReadiness.accuracy}%)</span>}
        </div>
        <div className="row">
          {['Pending', 'In Progress', 'Completed'].map((s) => (
            <button key={s} className={`btn small ${m.status === s ? '' : 'secondary'}`} onClick={() => onToggle(m._id, s)}>{s}</button>
          ))}
          <button className="btn small secondary" disabled={assessing} onClick={() => onAssess(m._id)}>{assessing ? 'Generating...' : 'Assess Milestone'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Roadmap() {
  const navigate = useNavigate()
  const [roadmap, setRoadmap] = useState(null)
  const [progress, setProgress] = useState(null)
  const [targetRole, setTargetRole] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [adaptiveGenerating, setAdaptiveGenerating] = useState(false)
  const [domains, setDomains] = useState([])
  const [domainsLoading, setDomainsLoading] = useState(false)
  const [domainsError, setDomainsError] = useState('')
  const [showDomains, setShowDomains] = useState(false)
  const domainPickerRef = useRef(null)
  const domainsLoadedRef = useRef(false)

  const load = () => {
    api.get('/roadmap/me').then((r) => {
      if (r.ok) {
        setRoadmap(r.data.data)
        setTargetRole(r.data.data?.careerGoal || '')
      }
      else setError(r.data?.message || 'No roadmap yet')
    })
    api.get('/roadmap/progress').then((r) => {
      if (r.ok) setProgress(r.data.data)
    })
  }

  useEffect(load, [])

  useEffect(() => {
    const closeDomains = (event) => {
      if (domainPickerRef.current && !domainPickerRef.current.contains(event.target)) {
        setShowDomains(false)
      }
    }
    document.addEventListener('mousedown', closeDomains)
    return () => document.removeEventListener('mousedown', closeDomains)
  }, [])

  const loadDomains = async () => {
    if (domainsLoadedRef.current || domainsLoading) return

    setDomainsLoading(true)
    setDomainsError('')
    try {
      const r = await api.get('/roadmap/domains')
      if (r.ok) {
        setDomains(Array.isArray(r.data?.data) ? r.data.data : [])
        domainsLoadedRef.current = true
      } else {
        setDomainsError(r.data?.message || 'Unable to load supported domains. You can still enter a domain manually.')
      }
    } catch {
      setDomainsError('Unable to load supported domains. You can still enter a domain manually.')
    } finally {
      setDomainsLoading(false)
    }
  }

  const handleDomainFocus = () => {
    setShowDomains(true)
    loadDomains()
  }

  const handleDomainChange = (event) => {
    setTargetRole(event.target.value)
    setError('')
    setShowDomains(true)
    loadDomains()
  }

  const selectDomain = (domain) => {
    setTargetRole(domain.displayName)
    setError('')
    setShowDomains(false)
  }

  const generate = async () => {
    setError('')
    if (!targetRole.trim()) {
      setError('Enter a domain or topic to generate a roadmap')
      return
    }
    setGenerating(true)
    const r = await api.post('/roadmap/lookup', { query: targetRole.trim() })
    setGenerating(false)
    if (r.ok) {
      setRoadmap(r.data.data)
      setProgress(r.data.data?.progress || null)
    } else if (r.status === 404) {
      setError('Roadmap may not be available for this domain. You may enter a different valid domain.')
    } else setError(r.data?.message || 'Failed to generate roadmap')
  }

  const changeSearch = () => {
    setRoadmap(null)
    setProgress(null)
    setTargetRole('')
    setError('')
  }

  const toggleStatus = async (milestoneId, status) => {
    const r = await api.patch(`/roadmap/milestone/${milestoneId}`, { status })
    if (r.ok) { setRoadmap(r.data.data); load() }
    else { setError(r.data?.message || 'Update failed (this milestone may have a different ID format)'); load() }
  }

  const startAdaptiveAssessment = async (mode, milestoneId) => {
    if (!roadmap?._id) return setError('Save or generate a roadmap before creating an assessment.')
    setError('')
    setAdaptiveGenerating(true)
    try {
      const response = await api.post('/adaptive-assessment/generate', { mode, roadmapId: roadmap._id, ...(milestoneId ? { milestoneId } : {}) })
      if (!response.ok) return setError(response.data?.message || 'Unable to generate adaptive assessment.')
      navigate(`/student/adaptive-assessment/${response.data.assessment.id}`)
    } catch {
      setError('Network error while requesting local AI question generation.')
    } finally { setAdaptiveGenerating(false) }
  }

  if (!roadmap) {
    const normalizedQuery = targetRole.trim().toLowerCase()
    const filteredDomains = domains.filter((domain) =>
      domain.displayName?.toLowerCase().includes(normalizedQuery)
    )

    return (
      <>
        <h1>Learning Roadmap</h1>
        {error && <div className="alert info">{error}</div>}
        <div className="card">
          <h3>Generate Your Personalized Roadmap</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '8px 0' }}>Tell us your target career role and we will build a step-by-step learning plan.</p>
          <div className="row">
            <div className="roadmap-domain-picker" ref={domainPickerRef}>
              <input
                value={targetRole}
                onChange={handleDomainChange}
                onFocus={handleDomainFocus}
                placeholder="Enter a domain or topic"
                aria-label="Enter a domain or topic"
                aria-expanded={showDomains}
                aria-controls="roadmap-domain-options"
              />
              {showDomains && (
                <div className="roadmap-domain-menu" id="roadmap-domain-options" role="listbox">
                  {domainsLoading && <div className="roadmap-domain-message">Loading supported domains...</div>}
                  {!domainsLoading && domainsError && <div className="roadmap-domain-message">{domainsError}</div>}
                  {!domainsLoading && !domainsError && filteredDomains.length === 0 && (
                    <div className="roadmap-domain-message">No matching supported domains.</div>
                  )}
                  {!domainsLoading && !domainsError && filteredDomains.map((domain) => (
                    <button
                      type="button"
                      className="roadmap-domain-option"
                      key={domain.key}
                      role="option"
                      aria-selected={targetRole === domain.displayName}
                      onClick={() => selectDomain(domain)}
                    >
                      {domain.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn" onClick={generate} disabled={generating}>{generating ? 'Generating...' : 'Generate Roadmap'}</button>
          </div>
        </div>
      </>
    )
  }

  const miles = roadmap?.milestones || roadmap?.roadmap?.milestones || roadmap?.roadmapItems || []

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Learning Roadmap</h1>
          <div className="subtitle">{roadmap?.careerGoal || roadmap?.targetRole || 'Personalized roadmap'}</div>
        </div>
        {roadmap && <button className="btn secondary" onClick={changeSearch}>Change Search</button>}
      </div>

      {progress && (
        <div className="card mb">
          <h3>Overall Progress</h3>
          <div className="score-ring">{progress.percentage ?? progress.completedPercentage ?? progress.completionPercentage ?? 0}%</div>
          <div className="mt progress-bar"><div style={{ width: `${progress.percentage ?? progress.completedPercentage ?? progress.completionPercentage ?? 0}%` }} /></div>
          {typeof progress.completedMilestones === 'number' && (
            <p className="mt" style={{ fontSize: 14, color: 'var(--muted)' }}>{progress.completedMilestones} of {progress.totalMilestones} milestones completed</p>
          )}
        </div>
      )}

      <div className="card mb">
        <h3>Adaptive AI Assessment</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Generate local-AI questions based on your roadmap readiness. Correct answers remain hidden until you submit.</p>
        <button className="btn" disabled={adaptiveGenerating} onClick={() => startAdaptiveAssessment('overall')}>
          {adaptiveGenerating ? 'Generating local AI questions...' : 'Overall Assessment'}
        </button>
      </div>

      {miles.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>Roadmap has no milestones yet.</p></div>
      ) : (
        <>
          <h3 className="section-title">Milestones</h3>
          {miles.map((m) => <Milestone key={m._id} m={m} onToggle={toggleStatus} onAssess={(id) => startAdaptiveAssessment('milestone', id)} assessing={adaptiveGenerating} />)}
        </>
      )}
    </>
  )
}
