import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { search } = useLocation()
  const defaultRole = new URLSearchParams(search).get('role') || 'student'
  const [role, setRole] = useState(defaultRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const loggedInUser = await login(role, email, password)
      if (role === 'faculty') {
        navigate('/faculty')
      } else if (role === 'admin') {
        navigate('/admin')
      } else {
        // student
        if (!loggedInUser?.profileCompleted) navigate('/student/profile')
        else if (!loggedInUser?.initialAssessmentCompleted) navigate('/student/assessments')
        else navigate('/student')
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
        <h1>AI Career Readiness Platform</h1>
        <p className="auth-sub">Sign in to your account</p>
        {error && <div className="alert error">{error}</div>}
        <div className="role-tabs">
          <button className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Student</button>
          <button className={role === 'faculty' ? 'active' : ''} onClick={() => setRole('faculty')}>Faculty</button>
          <button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div className="auth-switch">
          <p><Link to={`/forgot-password?role=${role}`}>Forgot password?</Link></p>
          <p>Don't have an account? <Link to={`/register?role=${role}`}>Register</Link></p>
        </div>
      </div>
    </div>
  )
}