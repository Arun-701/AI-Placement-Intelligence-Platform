import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('ALL')
  const [readiness, setReadiness] = useState('ALL')

  useEffect(() => {
    api.get('/faculty/students').then((r) => {
      if (r.ok) setStudents(r.data.data?.students || r.data.data || [])
      else setError(r.data?.message || 'Failed to load students')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  const years = [...new Set(students.map((student) => student.year).filter(Boolean))].sort((a, b) => a - b)
  const filteredStudents = students.filter((student) => {
    const text = `${student.name || ''} ${student.fullName || ''} ${student.email || ''}`.toLowerCase()
    const score = Number(student.placementReadinessScore) || 0
    const matchesReadiness = readiness === 'ALL' || (readiness === 'READY' ? score >= 80 : readiness === 'DEVELOPING' ? score >= 60 && score < 80 : score < 60)
    return text.includes(search.toLowerCase()) && (year === 'ALL' || String(student.year) === year) && matchesReadiness
  })

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Student', 'Email', 'Department', 'Year', 'CGPA', 'Readiness'], ...filteredStudents.map((student) => [student.fullName || student.name, student.email, student.department || '', student.year || '', student.cgpa ?? '', `${student.placementReadinessScore ?? 0}%`])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'faculty-students.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Students</h1>
          <div className="subtitle">Students assigned to you by the admin</div>
        </div>
      </div>
      <div className="card mb"><div className="results-filters"><input placeholder="Search student" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={year} onChange={(event) => setYear(event.target.value)}><option value="ALL">All Years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="ALL">All Readiness</option><option value="READY">Ready (80%+)</option><option value="DEVELOPING">Developing (60-79%)</option><option value="NEEDS_SUPPORT">Needs Support (&lt;60%)</option></select><button className="btn secondary" disabled={!filteredStudents.length} onClick={exportCsv}>Export CSV</button></div></div>
      <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>CGPA</th><th>Readiness</th></tr></thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s._id}>
                  <td>{s.fullName || s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.department}</td>
                  <td>{s.year}</td>
                  <td>{s.cgpa ?? '—'}</td>
                  <td>
                    <span className={`badge ${(s.placementReadinessScore || 0) >= 80 ? 'green' : (s.placementReadinessScore || 0) >= 60 ? 'amber' : 'red'}`}>
                      {s.placementReadinessScore ?? 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredStudents.length && <p className="muted mt">No students match the selected filters.</p>}
      </div>
    </>
  )
}