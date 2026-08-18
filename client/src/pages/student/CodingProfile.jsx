import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function CodingProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ leetcode: '', hackerrank: '', codechef: '', github: '', linkedin: '' })
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
          github: st.github || '', linkedin: st.linkedin || ''
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

      <button className="btn" onClick={save}>Save Coding Profile</button>
    </>
  )
}
