import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const [role, setRole] = useState('student')
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
      await login(role, email, password)
      navigate(role === 'faculty' ? '/faculty' : role === 'admin' ? '/admin' : '/student')
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
          {role === 'student' && <p><Link to="/forgot-password">Forgot password?</Link></p>}
          {role === 'student' && <p>Don't have an account? <Link to="/register">Register</Link></p>}
        </div>
      </div>
    </div>
  )
}