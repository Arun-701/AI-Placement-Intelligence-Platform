import { useState, useEffect } from 'react'
import { api } from '../../api'

function Kpi({ value, label }) {
  return <div className="card kpi-card"><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div></div>
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => { if (r.ok) setDashboard(r.data.data) })
    api.get('/admin/statistics').then((r) => { if (r.ok) setStats(r.data.data) })
  }, [])

  const d = dashboard || {}
  const s = stats || {}
  const studentOverview = s.studentOverview || d.studentOverview || {}
  const facultyOverview = s.facultyOverview || d.facultyOverview || {}
  const assessmentOverview = s.assessmentOverview || d.assessmentOverview || {}

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Admin Dashboard</h1>
          <div className="subtitle">Platform overview</div>
        </div>
      </div>
      <div className="grid cols-4 mb">
        <Kpi value={studentOverview.totalStudents ?? '–'} label="Total Students" />
        <Kpi value={facultyOverview.totalFaculties ?? '–'} label="Faculties" />
        <Kpi value={assessmentOverview.totalAssessments ?? '–'} label="Assessments" />
        <Kpi value={assessmentOverview.completedAssessments ?? '–'} label="Results" />
      </div>
      {d.recentStudents?.length > 0 && (
        <div className="card">
          <h3>Recently Registered Students</h3>
          {d.recentStudents?.map((st) => <div key={st._id} className="list-item">{st.name} — {st.email}</div>)}
        </div>
      )}
    </>
  )
}