import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (user && user.role === 'student') {
      api.get('/student/profile').then((r) => {
        if (r.ok) {
          const s = r.data.data.student || r.data.data
          setForm({
            fullName: s.fullName || '', phone: s.phone || '', college: s.college || '', section: s.section || '',
            github: s.github || '', linkedin: s.linkedin || '', skills: (s.skills || []).join(', '), cgpa: s.cgpa || '',
          })
        }
      })
    }
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    const payload = { ...form }
    const phone = String(payload.phone || '').trim()
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.')
      return
    }
    payload.phone = phone
    payload.skills = payload.skills ? String(payload.skills).split(',').map((x) => x.trim()).filter(Boolean) : []
    if (payload.cgpa !== undefined && payload.cgpa !== '') payload.cgpa = Number(payload.cgpa)
    const r = await api.put('/student/profile', payload)
    if (r.ok) {
      setInfo('Profile updated successfully')
      await refreshUser()
      const completion = r.data?.data?.profileCompletion
      if (completion === 100) {
        window.location.href = '/student/assessments'
      }
    } else {
      setError(r.data?.message || 'Update failed')
    }
  }

  if (user?.role === 'faculty') {
    const initial = (user?.name || 'Faculty Member').trim().charAt(0).toUpperCase()
    const isActive = user?.isActive !== false
    return (
      <div className="faculty-profile">
        <div className="faculty-profile-hero"><div className="faculty-avatar">{initial}</div><div><div className="eyebrow">Faculty profile</div><h1>{user?.name || 'Faculty Member'}</h1><p>{user?.designation || 'Faculty'} {user?.department ? `· ${user.department}` : ''}</p></div><span className="badge green">Active account</span></div>
        <div className="faculty-profile-grid"><section className="card"><h3>Account information</h3><div className="faculty-profile-row"><span>Email</span><strong>{user?.email || '—'}</strong></div><div className="faculty-profile-row"><span>Role</span><strong>Faculty</strong></div></section><section className="card"><h3>Professional details</h3><div className="faculty-profile-row"><span>Department</span><strong>{user?.department || 'Not provided'}</strong></div><div className="faculty-profile-row"><span>Designation</span><strong>{user?.designation || 'Not provided'}</strong></div></section></div>
      </div>
    )
  }

  if (user?.role !== 'student') return <><h1>My Profile</h1><div className="card"><p><strong>Name:</strong> {user?.name}</p><p><strong>Email:</strong> {user?.email}</p><p><strong>Role:</strong> {user?.role}</p></div></>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>My Profile</h1>
          <div className="subtitle">{user?.email}</div>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}
      <form className="card" onSubmit={save}>
        <div className="grid cols-2">
          <div className="form-group"><label>Full Name</label><input value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="form-group"><label>Phone</label><input type="tel" inputMode="numeric" maxLength="10" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label>College</label><input value={form.college || ''} onChange={(e) => setForm({ ...form, college: e.target.value })} /></div>
          <div className="form-group"><label>Section</label><input value={form.section || ''} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
          <div className="form-group"><label>GitHub URL</label><input value={form.github || ''} onChange={(e) => setForm({ ...form, github: e.target.value })} /></div>
          <div className="form-group"><label>LinkedIn URL</label><input value={form.linkedin || ''} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></div>
          <div className="form-group"><label>Skills (comma separated)</label><input value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
          <div className="form-group"><label>CGPA</label><input type="number" step="0.01" min="0" max="10" value={form.cgpa || ''} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} /></div>
        </div>
        <button type="submit" className="btn mt">Save Profile</button>
      </form>
    </>
  )
}
