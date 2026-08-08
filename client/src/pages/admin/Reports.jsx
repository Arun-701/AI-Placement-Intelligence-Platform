import { useState, useEffect } from 'react'
import { api } from '../../api'

function ReportCard({ title, data }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="ai-box">{JSON.stringify(data || {}, null, 2)}</div>
    </div>
  )
}

export default function AdminReports() {
  const [students, setStudents] = useState(null)
  const [faculties, setFaculties] = useState(null)
  const [assessments, setAssessments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/reports/students').then((r) => {
      if (r.ok) setStudents(r.data.data)
      else setError(r.data?.message || 'Failed to load student report')
    })
    api.get('/admin/reports/faculties').then((r) => {
      if (r.ok) setFaculties(r.data.data)
    })
    api.get('/admin/reports/assessments').then((r) => {
      if (r.ok) setAssessments(r.data.data)
    })
  }, [])

  if (error) return <div className="alert error">{error}</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Reports</h1>
          <div className="subtitle">Platform-wide reports</div>
        </div>
      </div>
      <div className="grid">
        <ReportCard title="Student Report" data={students} />
        <ReportCard title="Faculty Report" data={faculties} />
        <ReportCard title="Assessment Report" data={assessments} />
      </div>
    </>
  )
}