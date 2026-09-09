import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'

const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function AdminReports() {
  const [report, setReport] = useState(null)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/reports/students').then((response) => response.ok ? setReport(response.data.data) : setError(response.data?.message || 'Failed to load placement report')).catch(() => setError('Failed to load placement report'))
  }, [])

  const students = report?.students || []
  const departments = [...new Set(students.map((student) => student.department).filter(Boolean))].sort()
  const filtered = useMemo(() => students.filter((student) => {
    const text = `${student.name || ''} ${student.email || ''}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (department === 'ALL' || student.department === department)
  }), [students, search, department])
  const metrics = useMemo(() => {
    const readiness = students.map((student) => Number(student.placementReadinessScore) || 0)
    const scores = students.map((student) => Number(student.averageAssessmentScore) || 0)
    return { problems: students.reduce((sum, student) => sum + (Number(student.problemsSolved) || 0), 0), assessments: students.reduce((sum, student) => sum + (Number(student.assessmentCount) || 0), 0), averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null, averageReadiness: readiness.length ? Math.round(readiness.reduce((sum, score) => sum + score, 0) / readiness.length) : null, ready: students.filter((student) => Number(student.placementReadinessScore) >= 80).length }
  }, [students])

  const exportCsv = () => {
    const rows = [['Rank', 'Student', 'Department', 'Problems Solved', 'Assessments', 'Average Score', 'Placement Readiness'], ...filtered.map((student, index) => [index + 1, student.name, student.department, student.problemsSolved, student.assessmentCount, `${student.averageAssessmentScore}%`, `${student.placementReadinessScore}%`])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'placement-leaderboard.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  if (error) return <div className="alert error">{error}</div>
  if (!report) return <div className="loading">Loading placement report...</div>

  return <>
    <div className="page-title"><div><h1>Leaderboard</h1><div className="subtitle">Student readiness and assessment leaderboard</div></div><button className="btn secondary" disabled={!filtered.length} onClick={exportCsv}>Export CSV</button></div>
    <div className="card"><div className="row between"><h3>Placement Leaderboard</h3><div className="results-filters"><input placeholder="Search student" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Student</th><th>Department</th><th>Problems Solved</th><th>Assessments</th><th>Avg Score</th><th>Readiness</th></tr></thead><tbody>{filtered.map((student, index) => <tr key={student._id} onClick={() => setSelected(student)} style={{ cursor: 'pointer' }}><td>{index + 1}</td><td>{student.name}</td><td>{student.department || '—'}</td><td>{student.problemsSolved}</td><td>{student.assessmentCount}</td><td>{student.averageAssessmentScore}%</td><td>{student.placementReadinessScore}%</td></tr>)}</tbody></table></div>{!filtered.length && <p className="muted mt">No students match the selected filters.</p>}</div>
    {selected && <div className="card mt"><div className="row between"><h3>{selected.name} Performance</h3><button className="btn small secondary" onClick={() => setSelected(null)}>Close</button></div><div className="stat-inline"><span>Department</span><strong>{selected.department || '—'}</strong></div><div className="stat-inline"><span>Problems solved</span><strong>{selected.problemsSolved}</strong></div><div className="stat-inline"><span>Assessments completed</span><strong>{selected.assessmentCount}</strong></div><div className="stat-inline"><span>Average assessment score</span><strong>{selected.averageAssessmentScore}%</strong></div><div className="stat-inline"><span>Placement readiness</span><strong>{selected.placementReadinessScore}%</strong></div></div>}
  </>
}
