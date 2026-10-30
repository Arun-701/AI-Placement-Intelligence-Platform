import { useState, useEffect } from 'react'
import { api } from '../../api'
import './Faculties.css'

function FacultyHeroIllustration() {
  return (
    <svg className="faculty-header-illustration" viewBox="0 0 380 230" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="faculty-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e7f1ff" />
        </linearGradient>
        <linearGradient id="faculty-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#92c6f0" />
          <stop offset="1" stopColor="#648dc9" />
        </linearGradient>
        <linearGradient id="faculty-book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfc4f4" />
          <stop offset="1" stopColor="#a695de" />
        </linearGradient>
      </defs>
      <path d="M44 174c-18-22-13-72 9-102C77 35 119 19 170 25c59 7 118-3 153 31 29 29 23 81-4 111-32 35-235 37-275 7Z" fill="#e9f2ff" />
      <circle cx="311" cy="48" r="28" fill="#f0ecff" />
      <rect x="171" y="43" width="147" height="105" rx="13" fill="url(#faculty-board)" stroke="#c8d8f0" strokeWidth="3" />
      <path d="M197 75h74m-74 17h50" stroke="#b8cbee" strokeLinecap="round" strokeWidth="5" />
      <path d="m202 123 23-20 17 11 28-29" fill="none" stroke="#8194d2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <circle cx="270" cy="85" r="5" fill="#8194d2" />
      <path d="m291 62 4 9 10 4-10 4-4 10-4-10-10-4 10-4 4-9Z" fill="#9e8bd8" />
      <path d="M72 168c4-29 19-47 43-52l20 12 20-12c20 5 33 20 39 45l-13 33H82l-10-26Z" fill="url(#faculty-shirt)" />
      <path d="M111 104c0-19 12-33 28-33s28 14 28 33l-8 16h-39l-9-16Z" fill="#edbd99" />
      <path d="M110 95c-2-22 10-37 30-37 18 0 29 13 27 34-8-3-14-9-17-17-9 10-21 16-40 20Z" fill="#384b70" />
      <path d="M102 78c7-24 28-36 50-27 7 3 12 8 16 15-20-6-38-3-54 12l-12 0Z" fill="#4a5e87" />
      <path d="M143 120c6 6 15 6 21 0l11 12-21 18-21-18 10-12Z" fill="#f4cfb0" />
      <path d="M101 148c18 1 31 9 39 22m41-33c-13 5-22 14-28 28" fill="none" stroke="#edbd99" strokeLinecap="round" strokeWidth="9" />
      <path d="M76 195h146" stroke="#aec4e6" strokeLinecap="round" strokeWidth="4" />
      <path d="M82 173h50v14H82z" fill="#85b7e6" />
      <path d="M91 157h49v14H91z" fill="url(#faculty-book)" />
      <path d="M102 142h43v13h-43z" fill="#f0c987" />
      <path d="M91 157v14m-9 2v14m20-45v13" stroke="#fff" strokeOpacity=".78" strokeWidth="2" />
      <path d="m247 31 22-10 23 10-23 11-22-11Z" fill="#6375b8" />
      <path d="M255 36v9c9 7 20 7 29 0v-9" fill="#8291cb" />
      <path d="m292 32 7 20" stroke="#dfb85f" strokeLinecap="round" strokeWidth="3" />
      <circle cx="299" cy="54" r="4" fill="#dfb85f" />
      <path d="m58 57 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#91b2e5" />
    </svg>
  )
}

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState([])
  const [students, setStudents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', designation: '' })
  const [assignTo, setAssignTo] = useState('')
  const [assignDepartment, setAssignDepartment] = useState('')
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

  const departments = [...new Set(students.map((student) => student.department).filter(Boolean))].sort()
  const departmentStudents = students.filter((student) => student.department === assignDepartment)
  const assign = async () => {
    if (!assignTo || !assignDepartment) return setError('Select a faculty and department.')
    if (!window.confirm(`Assign all ${departmentStudents.length} ${assignDepartment} students to this faculty?`)) return
    setError('')
    setInfo('')
    const r = await api.post(`/admin/faculties/${assignTo}/assign-students`, { studentIds: departmentStudents.map((student) => student._id) })
    if (r.ok) {
      setInfo('Students assigned successfully')
      setAssignTo('')
      setAssignDepartment('')
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

  const approve = async (id) => {
    setError('')
    setInfo('')
    const r = await api.patch(`/admin/faculties/${id}/approve`)
    if (r.ok) {
      setInfo('Faculty approved and approval email sent')
      load()
    } else {
      setError(r.data?.message || 'Approval failed')
      load()
    }
  }

  const reject = async (id) => {
    if (!window.confirm('Reject this faculty registration request?')) return
    setError('')
    setInfo('')
    const r = await api.patch(`/admin/faculties/${id}/reject`)
    if (r.ok) {
      setInfo('Faculty registration rejected')
      load()
    } else {
      setError(r.data?.message || 'Rejection failed')
    }
  }

  return (
    <div className="admin-faculty-page">
      <div className="page-title faculty-page-header">
        <div className="faculty-page-title-copy">
          <h1>Manage Faculties</h1>
          <div className="subtitle">Create faculty accounts and assign students</div>
        </div>
        <FacultyHeroIllustration />
        <button className="btn faculty-add-button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Faculty'}</button>
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

      <div className="card mb faculty-assign-card">
        <div className="faculty-section-heading">
          <span className="faculty-section-icon assign-icon" aria-hidden="true">⇄</span>
          <div><h2>Assign Department to Faculty</h2><p>Select a faculty and assign a department</p></div>
        </div>
        <div className="faculty-assignment-controls">
          <label className="faculty-select-control">
            <span aria-hidden="true">♙</span>
            <select aria-label="Select faculty" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Select faculty...</option>
            {faculties.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
            </select>
          </label>
          <label className="faculty-select-control">
            <span aria-hidden="true">▦</span>
            <select aria-label="Select department" value={assignDepartment} onChange={(e) => setAssignDepartment(e.target.value)}><option value="">Select department...</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
          </label>
          <button className="btn faculty-assign-button" onClick={assign}><span aria-hidden="true">＋</span>Assign Department</button>
        </div>
        <p className="faculty-student-count"><span>Students in department:</span><strong>{departmentStudents.length}</strong></p>
      </div>

      <div className="card table-wrap faculty-list-card">
        <div className="faculty-section-heading faculty-list-heading">
          <span className="faculty-section-icon list-icon" aria-hidden="true">♧</span>
          <div><h2>Faculty List</h2><p>View and manage faculty accounts</p></div>
        </div>
        <table className="faculty-table">
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {faculties.map((f, index) => (
              <tr key={f._id}>
                <td><div className="faculty-name-cell"><span className={`faculty-avatar faculty-avatar--${index % 4}`}>{Array.from(String(f.name || '').trim())[0]?.toUpperCase() || '?'}</span><strong>{f.name}</strong></div></td>
                <td><span className="faculty-email-cell"><span aria-hidden="true">✉</span>{f.email}</span></td>
                <td><span className={`faculty-department-badge faculty-department-badge--${index % 4}`}>{f.department || '—'}</span></td>
                <td>{f.designation || '—'}</td>
                <td><span className="faculty-student-badge">{f.assignedStudents?.length ?? 0}</span></td>
                <td><span className={`faculty-status-badge ${f.approvalStatus === 'PENDING' ? 'pending' : f.approvalStatus === 'REJECTED' ? 'rejected' : 'approved'}`}><span aria-hidden="true">●</span>{f.approvalStatus === 'PENDING' ? 'Pending approval' : f.approvalStatus === 'REJECTED' ? 'Rejected' : 'Approved'}</span></td>
                <td><div className="faculty-actions-cell">{f.approvalStatus === 'PENDING' && f.isVerified ? <><button className="btn small faculty-approve-button" onClick={() => approve(f._id)}>Approve</button><button className="btn small danger" onClick={() => reject(f._id)}>Reject</button></> : null}<button className="faculty-delete-button" aria-label={`Delete ${f.name}`} title="Delete faculty" onClick={() => remove(f._id)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5" /></svg></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
