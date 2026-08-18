import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const defaultRole = new URLSearchParams(search).get('role') || 'student'
  const [role, setRole] = useState(defaultRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [year, setYear] = useState(1)
  const [skills, setSkills] = useState('')
  const [cgpa, setCgpa] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      let endpoint = '/auth/register'
      const payload = { name, email, password }

      if (role === 'student') {
        endpoint = '/auth/register'
        payload.department = department
        payload.year = Number(year)
        payload.skills = skills.split(',').map((s) => s.trim()).filter(Boolean)
        if (cgpa !== '') payload.cgpa = Number(cgpa)
      } else if (role === 'faculty') {
        endpoint = '/auth/faculty/register'
        payload.department = department
        payload.designation = designation
      } else {
        endpoint = '/admin/register'
      }

      const r = await api.post(endpoint, payload)
      if (!r.ok) throw new Error(r.data?.message || 'Registration failed')
      setInfo("Account created successfully! We've sent a 6-digit verification code to your email. Enter the code below to verify your account.")
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{role === 'faculty' ? 'Faculty Registration' : role === 'admin' ? 'Admin Registration' : 'Student Registration'}</h1>
        <p className="auth-sub">Create your account</p>
        <div className="role-tabs">
          <button type="button" className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Student</button>
          <button type="button" className={role === 'faculty' ? 'active' : ''} onClick={() => setRole('faculty')}>Faculty</button>
          <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
        </div>
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
            {(role === 'student' || role === 'faculty') && (
            <div className="row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Department</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} required />
              </div>
              {role === 'student' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          {role === 'faculty' && (
            <div className="form-group">
              <label>Designation</label>
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            </div>
          )}
          {role === 'student' && (
            <>
              <div className="form-group">
                <label>Skills (comma separated)</label>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="JavaScript, React, SQL" />
              </div>
              <div className="form-group">
                <label>CGPA</label>
                <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn" style={{ width: '100%' }} disabled={busy || Boolean(info)}>{busy ? 'Creating...' : 'Register'}</button>
        </form>
        <div className="auth-switch">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
