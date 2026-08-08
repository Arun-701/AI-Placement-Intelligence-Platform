import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ResetPassword() {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
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
      const r = await api.post('/auth/reset-password', { token, newPassword })
      if (!r.ok) throw new Error(r.data?.message || 'Reset failed')
      setInfo('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="auth-sub">Enter your token and a new password</p>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Reset Token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8+ chars: upper, lower, number, special" required />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Resetting...' : 'Reset Password'}</button>
        </form>
        <div className="auth-switch">
          <p><Link to="/login">Back to login</Link></p>
        </div>
      </div>
    </div>
  )
}