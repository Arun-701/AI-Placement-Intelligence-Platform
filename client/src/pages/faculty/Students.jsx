import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { normalizeDepartment } from '../../department'
import './FacultyPages.css'

export default function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [assignedDepartment, setAssignedDepartment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [readiness, setReadiness] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profileResponse, studentsResponse] = await Promise.all([
        api.get('/faculty/profile'),
        api.get('/faculty/students'),
      ])
      if (!profileResponse.ok) {
        setError(profileResponse.data?.message || 'Failed to load your assigned department')
        return
      }
      if (!studentsResponse.ok) {
        setError(studentsResponse.data?.message || 'Failed to load assigned students')
        return
      }
      const data = studentsResponse.data.data
      const assignedStudents = Array.isArray(data?.students) ? data.students : Array.isArray(data) ? data : []
      const department = String(profileResponse.data?.data?.department || '').trim()
      setAssignedDepartment(department)
      setDepartment(department || 'ALL')
      setStudents(department
        ? assignedStudents.filter((student) => normalizeDepartment(student.department) === normalizeDepartment(department))
        : [])
    } catch {
      setError('Failed to load assigned students. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  const years = [...new Set(students.map((student) => student.year).filter(Boolean))].sort((a, b) => a - b)
  const filteredStudents = students.filter((student) => {
    const text = `${student.name || ''} ${student.studentId || ''} ${student.department || ''}`.toLowerCase()
    const score = Number(student.placementReadinessScore) || 0
    const matchesReadiness = readiness === 'ALL' || (readiness === 'READY' ? score >= 80 : readiness === 'DEVELOPING' ? score >= 60 && score < 80 : score < 60)
    return text.includes(search.toLowerCase())
      && (department === 'ALL' || student.department === department)
      && (year === 'ALL' || String(student.year) === year)
      && matchesReadiness
  })

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Student', 'Student ID', 'Department', 'Year', 'Section', 'Readiness'], ...filteredStudents.map((student) => [
      student.name,
      student.studentId,
      student.department || '',
      student.year || '',
      student.section || '',
      `${student.placementReadinessScore ?? 0}%`
    ])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'faculty-students.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="faculty-page faculty-students-page">
      <header className="faculty-page-header">
        <div>
          <span className="faculty-page-eyebrow">FACULTY PORTAL</span>
          <h1>Students</h1>
          <p>View students assigned to you by the admin.</p>
        </div>
        <span className="faculty-page-count">{loading ? 'Loading…' : `${students.length} assigned`}</span>
      </header>

      {error && <div className="alert error faculty-page-alert" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}

      <div className="faculty-students-filters">
        <label className="faculty-filter-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Search assigned students" placeholder="Search name, student ID, or department" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select
          aria-label="Filter by department"
          value={assignedDepartment ? (department === 'ALL' ? assignedDepartment : department) : 'ALL'}
          disabled
          onChange={(event) => setDepartment(event.target.value)}
        >
          {!assignedDepartment && <option value="ALL">No department assigned</option>}
          {assignedDepartment && <option value={assignedDepartment}>{assignedDepartment}</option>}
        </select>
        <select aria-label="Filter by year" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="ALL">All Years</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filter by readiness" value={readiness} onChange={(event) => setReadiness(event.target.value)}>
          <option value="ALL">All Readiness</option>
          <option value="READY">Ready (80%+)</option>
          <option value="DEVELOPING">Developing (60–79%)</option>
          <option value="NEEDS_SUPPORT">Needs Support (&lt;60%)</option>
        </select>
        <button className="btn secondary faculty-export-button" disabled={!filteredStudents.length} onClick={exportCsv}>Export CSV</button>
      </div>

      {loading ? (
        <div className="faculty-content-state" role="status">Loading assigned students…</div>
      ) : (
        <div className="faculty-data-card table-wrap">
          <table className="faculty-students-table">
            <thead><tr><th>Student</th><th>Student ID</th><th>Department</th><th>Year</th><th>Section</th><th>Readiness</th></tr></thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const name = student.name || 'Student'
                const score = Number(student.placementReadinessScore) || 0
                const readinessTone = score >= 80 ? 'ready' : score >= 60 ? 'developing' : 'support'
                return (
                  <tr key={student._id}>
                    <td><div className="faculty-student-name"><span className={`faculty-student-avatar avatar-${index % 4}`}>{Array.from(name.trim())[0]?.toUpperCase() || '?'}</span><strong>{name}</strong></div></td>
                    <td>{student.studentId || '—'}</td>
                    <td>{student.department || '—'}</td>
                    <td>{student.year || '—'}</td>
                    <td>{student.section || '—'}</td>
                    <td><span className={`faculty-readiness-badge ${readinessTone}`}>{student.placementReadinessScore ?? 0}%</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!error && !filteredStudents.length && (
            <p className="faculty-empty-message">
              {!assignedDepartment
                ? 'No department has been assigned to your faculty account. Contact an administrator.'
                : students.length
                  ? 'No students match the selected filters.'
                  : `No students are assigned to the ${assignedDepartment} department.`}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
