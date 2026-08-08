import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function CareerRecommendation() {
  const [data, setData] = useState(null)
  const [skillGap, setSkillGap] = useState(null)
  const [recs, setRecs] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    api.get('/ai/career-recommendation').then((r) => {
      if (r.ok) setData(r.data.data)
      else setError(r.data?.message || 'No career recommendation yet. Upload your resume first.')
    })
    api.get('/ai/skill-gap').then((r) => {
      if (r.ok) setSkillGap(r.data.data)
    })
    api.get('/ai/recommendations').then((r) => {
      if (r.ok) setRecs(r.data.data)
    })
  }

  useEffect(load, [])

  const d = data?.recommendation || data

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Career Guidance</h1>
          <div className="subtitle">AI-powered career recommendations based on your resume</div>
        </div>
      </div>

      {error && !d && <div className="alert info">{error}</div>}

      {d && (
        <div className="grid cols-2 mb">
          <div className="card">
            <h3>Recommended Career Paths</h3>
            {Array.isArray(d.careerPaths) && d.careerPaths.map((c, i) => (
              <div key={i} className="list-item">
                <strong>{c.title || c.role || c}</strong>
                {c.matchScore && <span className="badge blue" style={{ marginLeft: 8 }}>{c.matchScore}% match</span>}
                {c.reason && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{c.reason}</p>}
              </div>
            ))}
            {!Array.isArray(d.careerPaths) && (
              <div className="ai-box">{JSON.stringify(d.careerPaths || d.recommendedRoles || d, null, 2)}</div>
            )}
          </div>
          <div className="card">
            <h3>Rationale</h3>
            <div className="ai-box">{d.rationale || d.explanation || d.summary || JSON.stringify(d)}</div>
            {d.suggestedRoles?.length > 0 && (
              <>
                <h3 className="mt">Suggested Roles</h3>
                {d.suggestedRoles.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
              </>
            )}
          </div>
        </div>
      )}

      {skillGap && (
        <div className="card mb">
          <h3>Skill Gap Analysis</h3>
          <div className="ai-box">{JSON.stringify(skillGap, null, 2)}</div>
        </div>
      )}

      {recs && (
        <div className="card mb">
          <h3>Learning Recommendations</h3>
          <div className="ai-box">{JSON.stringify(recs, null, 2)}</div>
        </div>
      )}
    </>
  )
}