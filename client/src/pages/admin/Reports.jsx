import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import './Reports.css'

const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

function LeaderboardHeroIllustration() {
  return (
    <svg className="leaderboard-hero-illustration" viewBox="0 0 340 190" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="leaderboard-podium-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a9d5ff" /><stop offset="1" stopColor="#6c9ee0" /></linearGradient>
        <linearGradient id="leaderboard-podium-lilac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d0c5f2" /><stop offset="1" stopColor="#a291d9" /></linearGradient>
      </defs>
      <path d="M28 145c-18-28-4-72 22-94 29-25 69-31 112-28 47 3 98-3 132 27 31 28 31 70 4 96-32 31-242 31-270-1Z" fill="#eaf2ff" />
      <circle cx="284" cy="47" r="24" fill="#f1edff" />
      <path d="m267 34 6 13 14 2-10 9 3 14-13-7-12 7 2-14-10-9 14-2 6-13Z" fill="#f2c873" />
      <path d="M59 134h66v39H59z" fill="url(#leaderboard-podium-blue)" />
      <path d="M126 111h66v62h-66z" fill="url(#leaderboard-podium-lilac)" />
      <path d="M193 126h66v47h-66z" fill="#a9d7bb" />
      <path d="M59 134h66m1-23h66m1 15h66" stroke="#fff" strokeOpacity=".8" strokeWidth="3" />
      <circle cx="159" cy="80" r="17" fill="#efbf9b" />
      <path d="M142 78c-1-16 8-27 21-27 12 0 20 9 19 23-8-1-15-6-18-12-5 8-12 13-22 16Z" fill="#45577e" />
      <path d="M132 130c2-26 13-39 28-39 18 0 29 13 31 39l-15 12h-30l-14-12Z" fill="#6e9fe0" />
      <path d="M139 106 117 92m57 14 24-24" stroke="#efbf9b" strokeLinecap="round" strokeWidth="8" />
      <path d="m188 74 17-8 18 8-18 9-17-9Z" fill="#6577b8" />
      <path d="M194 78v8c7 5 15 5 22 0v-8" fill="#8292ca" />
      <path d="m218 76 6 16" stroke="#dfb75f" strokeLinecap="round" strokeWidth="2.5" />
      <circle cx="224" cy="93" r="3" fill="#dfb75f" />
      <path d="M45 174h246" stroke="#b8cbed" strokeLinecap="round" strokeWidth="3" />
      <path d="m86 74 4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6 9-2 4-8Z" fill="#91b4e8" />
    </svg>
  )
}

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

  return <div className="admin-leaderboard-page">
    <div className="leaderboard-hero">
      <div className="leaderboard-hero-copy"><h1>Leaderboard</h1><p>Student readiness and assessment leaderboard</p></div>
      <LeaderboardHeroIllustration />
      <button className="leaderboard-export-button" disabled={!filtered.length} onClick={exportCsv}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 17v3h14v-3" /></svg>Export CSV</button>
    </div>
    <div className="card leaderboard-card">
      <div className="leaderboard-card-header">
        <div className="leaderboard-section-title"><span className="leaderboard-title-icon" aria-hidden="true">♜</span><div><h2>Placement Leaderboard</h2></div></div>
        <div className="leaderboard-controls">
          <label className="leaderboard-control leaderboard-search"><span aria-hidden="true">⌕</span><input aria-label="Search student" placeholder="Search student" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="leaderboard-control"><span aria-hidden="true">▦</span><select aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </div>
      <div className="table-wrap leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th>Rank</th><th>Student</th><th>Department</th><th>Problems Solved</th><th>Assessments</th><th>Avg Score</th><th>Readiness</th></tr></thead><tbody>{filtered.map((student, index) => {
        const score = Number(student.averageAssessmentScore)
        const scoreTone = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
        const scoreProgress = Math.min(Math.max(Number.isFinite(score) ? score : 0, 0), 100)
        const readiness = Number(student.placementReadinessScore) || 0
        const readinessProgress = Math.min(Math.max(readiness, 0), 100)
        return <tr key={student._id} onClick={() => setSelected(student)} style={{ cursor: 'pointer' }}>
          <td><span className={`leaderboard-rank leaderboard-rank--${index < 3 ? index + 1 : 'regular'}`}>{index + 1}</span></td>
          <td><div className="leaderboard-student"><span className={`leaderboard-avatar leaderboard-avatar--${index % 4}`}>{Array.from(String(student.name || '').trim())[0]?.toUpperCase() || '?'}</span><strong>{student.name}</strong></div></td>
          <td><span className={`leaderboard-department leaderboard-department--${index % 4}`}>{student.department || '—'}</span></td>
          <td><strong className="leaderboard-problems">{student.problemsSolved}</strong></td>
          <td><span className="leaderboard-assessment-count">{student.assessmentCount}</span></td>
          <td><div className="leaderboard-progress-cell"><span className={`leaderboard-score leaderboard-score--${scoreTone}`}>{student.averageAssessmentScore}%</span><span className="leaderboard-progress-track" role="progressbar" aria-label="Average score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={scoreProgress}><span className={`leaderboard-progress-fill leaderboard-progress-fill--${scoreTone}`} style={{ width: `${scoreProgress}%` }} /></span></div></td>
          <td><div className="leaderboard-progress-cell"><span className="leaderboard-readiness">{student.placementReadinessScore}%</span><span className="leaderboard-progress-track" role="progressbar" aria-label="Placement readiness" aria-valuemin="0" aria-valuemax="100" aria-valuenow={readinessProgress}><span className="leaderboard-progress-fill leaderboard-progress-fill--readiness" style={{ width: `${readinessProgress}%` }} /></span></div></td>
        </tr>
      })}</tbody></table></div>
      {!filtered.length && <p className="muted mt">No students match the selected filters.</p>}
    </div>
    {selected && <div className="card mt"><div className="row between"><h3>{selected.name} Performance</h3><button className="btn small secondary" onClick={() => setSelected(null)}>Close</button></div><div className="stat-inline"><span>Department</span><strong>{selected.department || '—'}</strong></div><div className="stat-inline"><span>Problems solved</span><strong>{selected.problemsSolved}</strong></div><div className="stat-inline"><span>Assessments completed</span><strong>{selected.assessmentCount}</strong></div><div className="stat-inline"><span>Average assessment score</span><strong>{selected.averageAssessmentScore}%</strong></div><div className="stat-inline"><span>Placement readiness</span><strong>{selected.placementReadinessScore}%</strong></div></div>}
  </div>
}
