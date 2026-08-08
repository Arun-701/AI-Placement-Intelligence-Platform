import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function FacultyStudents() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/faculty/students').then((r) => {
      if (r.ok) setStudents(r.data.data?.students || r.data.data || [])
      else setError(r.data?.message || 'Failed to load students')
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>My Students</h1>
          <div className="subtitle">Students assigned to you by the admin</div>
        </div>
      </div>
      {students.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No students assigned to you yet.</p></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Year</th><th>CGPA</th><th>Readiness</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.fullName || s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.department}</td>
                  <td>{s.year}</td>
                  <td>{s.cgpa ?? '—'}</td>
                  <td>
                    <span className={`badge ${(s.placementReadinessScore || 0) >= 60 ? 'green' : (s.placementReadinessScore || 0) >= 40 ? 'amber' : 'red'}`}>
                      {s.placementReadinessScore ?? 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}