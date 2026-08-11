import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPassword() {
  const { search } = useLocation()
  const role = new URLSearchParams(search).get('role') || 'student'
  const [email, setEmail] = useState('')
  const [info, setInfo] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const endpoint = role === 'faculty'
        ? '/auth/faculty/forgot-password'
        : role === 'admin'
          ? '/admin/forgot-password'
          : '/auth/forgot-password'
      const r = await api.post(endpoint, { email })
      if (!r.ok) throw new Error(r.data?.message || 'Request failed')
      setInfo(r.data?.message || 'Instructions sent')
      if (r.data?.data?.resetToken) {
        setResetToken(r.data.data.resetToken)
      } else {
        setInfo('If an account exists, password reset instructions have been sent.')
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
        <h1>Forgot Password</h1>
        <p className="auth-sub">Enter your email to reset your password</p>
        {error && <div className="alert error">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        {resetToken && (
          <div className="alert info">
            Development reset token: <strong>{resetToken}</strong>
            <br />
            Use it on the reset password page.
          </div>
        )}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
        <div className="auth-switch">
          <p><Link to={`/reset-password?role=${role}`}>I have a reset token</Link> · <Link to={`/login?role=${role}`}>Back to login</Link></p>
        </div>
      </div>
    </div>
  )
}