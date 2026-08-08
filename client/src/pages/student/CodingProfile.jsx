import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function CodingProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ leetcode: '', hackerrank: '', codechef: '', github: '', linkedin: '', totalProblemsSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, contestsParticipated: 0 })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    api.get('/student/coding-profile').then((r) => {
      if (r.ok) {
        const s = r.data.data
        const st = s.student || s
        setProfile(s)
        setForm({
          leetcode: st.leetcode || '', hackerrank: st.hackerrank || '', codechef: st.codechef || '',
          github: st.github || '', linkedin: st.linkedin || '',
          totalProblemsSolved: s.codingProfile?.totalProblemsSolved || 0,
          easySolved: s.codingProfile?.easySolved || 0,
          mediumSolved: s.codingProfile?.mediumSolved || 0,
          hardSolved: s.codingProfile?.hardSolved || 0,
          contestsParticipated: s.codingProfile?.contestsParticipated || 0,
        })
      } else setError(r.data?.message || 'Failed to load coding profile')
    })
  }, [])

  const save = async () => {
    setError('')
    setInfo('')
    const r = await api.put('/student/coding-profile', form)
    if (r.ok) {
      setInfo('Coding profile updated successfully!')
      api.get('/student/coding-profile').then((res) => { if (res.ok) setProfile(res.data.data) })
    } else setError(r.data?.message || 'Update failed')
  }

  const cp = profile?.codingProfile || {}

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Coding Profile</h1>
          <div className="subtitle">Connect your coding platforms and track your progress</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      <div className="grid cols-4 mb">
        <div className="card kpi-card"><div className="kpi-value">{cp.totalProblemsSolved ?? 0}</div><div className="kpi-label">Total Problems</div></div>
        <div className="card kpi-card"><div className="kpi-value" style={{ color: 'var(--green)' }}>{cp.easySolved ?? 0}</div><div className="kpi-label">Easy</div></div>
        <div className="card kpi-card"><div className="kpi-value" style={{ color: 'var(--amber)' }}>{cp.mediumSolved ?? 0}</div><div className="kpi-label">Medium</div></div>
        <div className="card kpi-card"><div className="kpi-value" style={{ color: 'var(--red)' }}>{cp.hardSolved ?? 0}</div><div className="kpi-label">Hard</div></div>
      </div>

      <div className="card mb">
        <h3>Platform Links</h3>
        <div className="grid cols-2">
          {['leetcode', 'hackerrank', 'codechef', 'github', 'linkedin'].map((p) => (
            <div className="form-group" key={p}>
              <label style={{ textTransform: 'capitalize' }}>{p}</label>
              <input value={form[p]} onChange={(e) => setForm({ ...form, [p]: e.target.value })} placeholder={`https://...`} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mb">
        <h3>Problems Solved</h3>
        <div className="grid cols-4">
          {(['totalProblemsSolved', 'easySolved', 'mediumSolved', 'hardSolved', 'contestsParticipated']).map((f) => (
            <div className="form-group" key={f}>
              <label>{f.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input type="number" min="0" value={form[f]} onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </div>

      <button className="btn" onClick={save}>Save Coding Profile</button>
    </>
  )
}