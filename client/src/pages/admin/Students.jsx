import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: 1, cgpa: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const load = () => {
    api.get('/admin/students').then((r) => { if (r.ok) setStudents(r.data.data?.students || r.data.data || []) })
  }

  useEffect(load, [])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    const r = await api.post('/admin/students', { ...form, year: Number(form.year), cgpa: form.cgpa ? Number(form.cgpa) : undefined })
    if (r.ok) { setInfo('Student created'); setShowForm(false); setForm({ name: '', email: '', password: '', department: '', year: 3, cgpa: '' }); load() }
    else setError(r.data?.message || 'Creation failed')
  }

  const remove = async (id) => {
    if (!confirm('Delete this student?')) return
    const r = await api.del(`/admin/students/${id}`)
    if (r.ok) load()
    else setError(r.data?.message || 'Delete failed')
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Manage Students</h1>
          <div className="subtitle">Create and manage student accounts</div>
        </div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Student'}</button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      {showForm && (
        <form className="card mb" onSubmit={create}>
          <h3>New Student</h3>
          <div className="grid cols-3">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Password</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="form-group"><label>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></div>
            <div className="form-group"><label>Year</label><select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>{[1, 2, 3, 4].map((y) => <option key={y}>{y}</option>)}</select></div>
            <div className="form-group"><label>CGPA</label><input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} /></div>
          </div>
          <button className="btn">Create Student</button>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>CGPA</th><th>Readiness</th><th></th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td>{s.fullName || s.name}</td>
                <td>{s.email}</td>
                <td>{s.department}</td>
                <td>{s.year}</td>
                <td>{s.cgpa ?? '—'}</td>
                <td>{s.placementReadinessScore ?? 0}%</td>
                <td><button className="btn small danger" onClick={() => remove(s._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}