import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState(1)
  const [skills, setSkills] = useState('')
  const [cgpa, setCgpa] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const r = await api.post('/auth/register', {
        name, email, password, department, year: Number(year),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        cgpa: cgpa ? Number(cgpa) : undefined,
      })
      if (!r.ok) throw new Error(r.data?.message || 'Registration failed')
      const vToken = r.data?.data?.verificationToken
      if (vToken) {
        const v = await api.post('/auth/verify-email', { token: vToken })
        if (!v.ok) throw new Error(v.data?.message || 'Email verification failed')
        setInfo('Registered and email verified! You can now sign in.')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setInfo('Registered successfully! You can now sign in.')
        setTimeout(() => navigate('/login'), 1500)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Student Registration</h1>
        <p className="auth-sub">Create your account</p>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ chars, upper, lower, number, special" required />
          </div>
          <div className="row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Skills (comma separated)</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="JavaScript, React, SQL" />
          </div>
          <div className="form-group">
            <label>CGPA</label>
            <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Creating...' : 'Register'}</button>
        </form>
        <div className="auth-switch">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}