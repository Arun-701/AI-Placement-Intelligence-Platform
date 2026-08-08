import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState([])
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', designation: '' })
  const [assignTo, setAssignTo] = useState('')
  const [assignIds, setAssignIds] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const load = () => {
    api.get('/admin/faculties').then((r) => {
      if (r.ok) setFaculties(r.data.data?.faculties || r.data.data || [])
    })
    api.get('/admin/students').then((r) => {
      if (r.ok) setStudents(r.data.data?.students || r.data.data || [])
    })
  }

  useEffect(load, [])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    const r = await api.post('/admin/faculties', form)
    if (r.ok) {
      setInfo('Faculty created successfully')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', department: '', designation: '' })
      load()
    } else {
      setError(r.data?.message || 'Creation failed')
    }
  }

  const assign = async () => {
    if (!assignTo) return
    setError('')
    setInfo('')
    const r = await api.post(`/admin/faculties/${assignTo}/assign-students`, { studentIds: assignIds })
    if (r.ok) {
      setInfo('Students assigned successfully')
      setAssignTo('')
      setAssignIds([])
      load()
    } else {
      setError(r.data?.message || 'Assignment failed')
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this faculty?')) return
    const r = await api.del(`/admin/faculties/${id}`)
    if (r.ok) load()
    else setError(r.data?.message || 'Delete failed')
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Manage Faculties</h1>
          <div className="subtitle">Create faculty accounts and assign students</div>
        </div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Faculty'}</button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      {showForm && (
        <form className="card mb" onSubmit={create}>
          <h3>New Faculty</h3>
          <div className="grid cols-3">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Password</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="form-group"><label>Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="form-group"><label>Designation</label><input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          </div>
          <button className="btn">Create Faculty</button>
        </form>
      )}

      <div className="card mb">
        <h3>Assign Students to Faculty</h3>
        <div className="row">
          <select style={{ flex: 1 }} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Select faculty...</option>
            {faculties.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
          </select>
          <select
            style={{ flex: 2 }}
            multiple
            value={assignIds}
            onChange={(e) => setAssignIds(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {students.map((s) => <option key={s._id} value={s._id}>{s.fullName || s.name} ({s.email})</option>)}
          </select>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>Hold Ctrl (Cmd on Mac) to select multiple students.</p>
        <button className="btn mt" onClick={assign}>Assign Selected Students</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th>Students</th><th></th></tr></thead>
          <tbody>
            {faculties.map((f) => (
              <tr key={f._id}>
                <td>{f.name}</td>
                <td>{f.email}</td>
                <td>{f.department || '—'}</td>
                <td>{f.designation || '—'}</td>
                <td>{f.assignedStudents?.length ?? 0}</td>
                <td><button className="btn small danger" onClick={() => remove(f._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}