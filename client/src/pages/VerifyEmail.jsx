import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'

const COOLDOWN_SECONDS = 60

export default function VerifyEmail() {
  const { search } = useLocation()
  const initialEmail = new URLSearchParams(search).get('email') || ''
  const role = new URLSearchParams(search).get('role') || 'student'
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const verify = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setVerifying(true)
    try {
      const result = await api.post('/auth/verify-email-otp', { email, otp })
      if (!result.ok) throw new Error(result.data?.message || 'Unable to verify your email.')
      setVerified(true)
      setMessage(role === 'faculty'
        ? 'Email verified successfully. Your faculty registration is pending admin approval. We’ll email you once it is approved.'
        : 'Email verified successfully. You can now login.')
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    setError('')
    setMessage('')
    setResending(true)
    try {
      const result = await api.post('/auth/resend-verification', { email })
      if (!result.ok) throw new Error(result.data?.message || 'Unable to resend verification code.')
      setOtp('')
      setMessage(result.data?.message || 'A new verification code has been sent.')
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  if (verified) {
    return <div className="auth-page"><div className="auth-card">
      <h1>Email Verified Successfully!</h1>
      <div className="alert success">{message}</div>
      <Link className="btn" style={{ display: 'block', textAlign: 'center' }} to={`/login?role=${role}`}>{role === 'faculty' ? 'Go to Faculty Login' : 'Go to Login'}</Link>
    </div></div>
  }

  return (
    <div className="auth-page"><div className="auth-card">
      <h1>Verify Your Email</h1>
      <p className="auth-sub">We've sent a 6-digit verification code to your email.</p>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      <form onSubmit={verify}>
        <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div>
        <div className="form-group"><label>Verification code</label><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="_ _ _ _ _ _" required autoComplete="one-time-code" /></div>
        <button className="btn" style={{ width: '100%' }} disabled={verifying || otp.length !== 6}>{verifying ? 'Verifying...' : 'Verify Email'}</button>
      </form>
      <div className="auth-switch"><p>Didn't receive the code?</p><button type="button" className="btn" style={{ width: '100%' }} onClick={resend} disabled={resending || cooldown > 0 || !email}>{resending ? 'Sending...' : cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}</button><p><Link to="/login">Back to Login</Link></p></div>
    </div></div>
  )
}
