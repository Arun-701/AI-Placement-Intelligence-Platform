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
          const s = r.data.data
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
    if (payload.skills !== undefined) payload.skills = payload.skills.split(',').map((x) => x.trim()).filter(Boolean)
    const r = await api.put('/student/profile', payload)
    if (r.ok) {
      setInfo('Profile updated successfully')
      refreshUser()
    } else {
      setError(r.data?.message || 'Update failed')
    }
  }

  if (user?.role !== 'student') {
    return (
      <>
        <h1>My Profile</h1>
        <div className="card">
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          {user?.department && <p><strong>Department:</strong> {user.department}</p>}
          {user?.designation && <p><strong>Designation:</strong> {user.designation}</p>}
        </div>
      </>
    )
  }

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
          <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label>College</label><input value={form.college || ''} onChange={(e) => setForm({ ...form, college: e.target.value })} /></div>
          <div className="form-group"><label>Section</label><input value={form.section || ''} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
          <div className="form-group"><label>GitHub URL</label><input value={form.github || ''} onChange={(e) => setForm({ ...form, github: e.target.value })} /></div>
          <div className="form-group"><label>LinkedIn URL</label><input value={form.linkedin || ''} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></div>
          <div className="form-group"><label>Skills (comma separated)</label><input value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
          <div className="form-group"><label>CGPA</label><input type="number" step="0.01" min="0" max="10" value={form.cgpa || ''} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} /></div>
        </div>
        <button className="btn mt">Save Profile</button>
      </form>
    </>
  )
}