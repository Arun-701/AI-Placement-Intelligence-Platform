import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: 1, cgpa: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [readiness, setReadiness] = useState('ALL')

  const load = () => {
    api.get('/admin/students').then((r) => { if (r.ok) setStudents(r.data.data?.students || r.data.data || []) })
  }

  useEffect(load, [])

  const departments = [...new Set(students.map((student) => student.department).filter(Boolean))].sort()
  const years = [...new Set(students.map((student) => student.year).filter(Boolean))].sort((a, b) => a - b)
  const filteredStudents = students.filter((student) => {
    const matchesSearch = `${student.name || ''} ${student.fullName || ''} ${student.email || ''}`.toLowerCase().includes(search.toLowerCase())
    const score = Number(student.placementReadinessScore) || 0
    const matchesReadiness = readiness === 'ALL' || (readiness === 'READY' ? score >= 80 : readiness === 'DEVELOPING' ? score >= 60 && score < 80 : score < 60)
    return matchesSearch && (department === 'ALL' || student.department === department) && (year === 'ALL' || String(student.year) === year) && matchesReadiness
  })

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

      <div className="card mb"><div className="results-filters"><input placeholder="Search student" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><select value={year} onChange={(event) => setYear(event.target.value)}><option value="ALL">All Years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="ALL">All Readiness</option><option value="READY">Ready (80%+)</option><option value="DEVELOPING">Developing (60-79%)</option><option value="NEEDS_SUPPORT">Needs Support (&lt;60%)</option></select></div></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>CGPA</th><th>Readiness</th><th></th></tr></thead>
          <tbody>
            {filteredStudents.map((s) => (
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
        {!filteredStudents.length && <p className="muted mt">No students match the selected filters.</p>}
      </div>
    </>
  )
}