import { useState, useEffect } from 'react'
import { api } from '../../api'
import './Students.css'

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

  const getStudentName = (student) => student.fullName || student.name || ''
  const getInitial = (name) => Array.from(String(name).trim())[0]?.toUpperCase() || '?'

  const create = async (e) => {
    e.preventDefault()
    setError('')
    const r = await api.post('/admin/students', { ...form, year: Number(form.year), cgpa: form.cgpa ? Number(form.cgpa) : undefined })
    if (r.ok) { setInfo('Student created'); setShowForm(false); setForm({ name: '', email: '', password: '', department: '', year: 3, cgpa: '' }); load() }
    else setError(r.data?.message || 'Creation failed')
  }

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Student Name', 'Email', 'Department', 'Year / Batch', 'CGPA', 'Placement Readiness'], ...filteredStudents.map((student) => [student.fullName || student.name, student.email, student.department || '', student.year || '', student.cgpa ?? '', `${student.placementReadinessScore ?? 0}%`])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'admin-students.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-students-page">
      <div className="page-title students-page-header">
        <svg className="students-header-illustration" viewBox="0 0 340 210" role="img" aria-label="Student studying with books and a graduation cap">
          <defs>
            <linearGradient id="study-illustration-book-blue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a9d6ff" />
              <stop offset="1" stopColor="#6e9ee8" />
            </linearGradient>
            <linearGradient id="study-illustration-book-lilac" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c9bafa" />
              <stop offset="1" stopColor="#9b88d7" />
            </linearGradient>
            <linearGradient id="study-illustration-shirt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#83b8ed" />
              <stop offset="1" stopColor="#527fc4" />
            </linearGradient>
          </defs>
          <path d="M46 166c-17-22-8-65 13-91 24-30 59-49 101-48 48 1 87 17 112 48 25 32 23 78-1 100-28 25-187 20-225-9Z" fill="#e8f1ff" />
          <circle cx="265" cy="50" r="24" fill="#f2ecff" />
          <path d="m44 62 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#9b8adb" opacity=".8" />
          <path d="m139 28 3 7 8 3-8 3-3 8-3-8-8-3 8-3 3-7Z" fill="#77a9e5" />
          <rect x="242" y="108" width="55" height="17" rx="4" fill="url(#study-illustration-book-lilac)" />
          <rect x="250" y="88" width="53" height="18" rx="4" fill="url(#study-illustration-book-blue)" />
          <rect x="239" y="68" width="59" height="18" rx="4" fill="#f3c987" />
          <path d="M250 68v18m12-18v18m-5 2v18m15 0v17" stroke="#fff" strokeOpacity=".72" strokeWidth="2" />
          <path d="M95 155c5-27 19-42 42-46l18 9 19-9c22 6 37 21 42 46l-14 25H105l-10-25Z" fill="url(#study-illustration-shirt)" />
          <path d="M138 101c0-17 11-30 26-30s26 13 26 30l-8 15h-37l-7-15Z" fill="#f0bd98" />
          <path d="M138 93c-2-21 9-36 27-36 18 0 29 13 27 33-7-3-12-8-15-15-7 9-20 15-39 18Z" fill="#344c78" />
          <path d="M150 109c5 5 11 7 17 7s12-2 17-7l9 10-21 16-22-16 0-10Z" fill="#f6cfad" />
          <path d="M108 147c21 6 40 18 50 32m52-33c-21 7-38 18-49 33" fill="none" stroke="#f0bd98" strokeLinecap="round" strokeWidth="10" />
          <path d="M95 171c21-10 44-10 67 2 23-12 46-12 68-2v21c-24-12-47-12-68 1-21-13-44-13-67-1v-21Z" fill="#fff" stroke="#8ca9d5" strokeLinejoin="round" strokeWidth="3" />
          <path d="M162 173v20" stroke="#8ca9d5" strokeWidth="2" />
          <path d="m205 42 31-14 32 14-32 14-31-14Z" fill="#5568ad" />
          <path d="M216 48v13c11 9 29 9 41 0V48" fill="#7889c7" />
          <path d="m267 43 9 25" stroke="#e1b962" strokeLinecap="round" strokeWidth="3" />
          <circle cx="277" cy="70" r="4" fill="#e1b962" />
          <path d="M73 180h225" stroke="#b9cbed" strokeLinecap="round" strokeWidth="3" />
        </svg>
        <div className="students-page-title-copy">
          <h1>Manage Students</h1>
          <div className="subtitle">Create and manage student accounts</div>
        </div>
        <button className="btn students-add-button" onClick={() => setShowForm(!showForm)}><span aria-hidden="true">＋</span>{showForm ? 'Cancel' : 'Add Student'}</button>
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

      <div className="card mb students-filter-card">
        <div className="students-filters">
          <label className="students-filter search-filter">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search student" placeholder="Search student..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="students-filter">
            <span aria-hidden="true">▦</span>
            <select aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="students-filter">
            <span aria-hidden="true">▣</span>
            <select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)}><option value="ALL">All Years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label className="students-filter">
            <span aria-hidden="true">◉</span>
            <select aria-label="Readiness" value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="ALL">All Readiness</option><option value="READY">Ready (80%+)</option><option value="DEVELOPING">Developing (60-79%)</option><option value="NEEDS_SUPPORT">Needs Support (&lt;60%)</option></select>
          </label>
          <button className="btn secondary students-export-button" disabled={!filteredStudents.length} onClick={exportCsv}><span aria-hidden="true">⇩</span>Export CSV</button>
        </div>
      </div>
      <div className="card table-wrap students-table-card">
        <table className="students-table">
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>CGPA</th><th>Readiness</th></tr></thead>
          <tbody>
            {filteredStudents.map((s, index) => {
              const studentName = getStudentName(s)
              const readinessScore = Number(s.placementReadinessScore) || 0
              const cgpaTone = s.cgpa == null ? 'neutral' : Number(s.cgpa) >= 8 ? 'high' : Number(s.cgpa) >= 6 ? 'medium' : 'low'
              const readinessTone = readinessScore >= 80 ? 'ready' : readinessScore >= 60 ? 'developing' : 'support'
              return (
              <tr key={s._id}>
                <td><div className="student-name-cell"><span className={`student-avatar student-avatar--${index % 4}`}>{getInitial(studentName)}</span><span className="student-name-text">{studentName}</span></div></td>
                <td>{s.email}</td>
                <td><span className={`department-badge department-badge--${index % 4}`} title={s.department}>{s.department}</span></td>
                <td>{s.year}</td>
                <td><span className={`student-value-badge cgpa-badge cgpa-badge--${cgpaTone}`}>{s.cgpa ?? '—'}</span></td>
                <td><span className={`student-value-badge readiness-badge readiness-badge--${readinessTone}`}>{s.placementReadinessScore ?? 0}%</span></td>
              </tr>
            )})}
          </tbody>
        </table>
        {!filteredStudents.length && <p className="muted mt">No students match the selected filters.</p>}
      </div>
    </div>
  )
}