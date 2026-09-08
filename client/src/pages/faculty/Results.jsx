import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'

export default function FacultyResults() {
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState([])
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    const assessmentId = searchParams.get('assessmentId')
    api.get(`/faculty/results${assessmentId ? `?assessmentId=${assessmentId}` : ''}`).then((response) => response.ok ? setResults(response.data.data?.results || []) : setError(response.data?.message || 'Failed to load leaderboard')).catch(() => setError('Failed to load leaderboard'))
  }, [searchParams])

  const departments = [...new Set(results.map((result) => result.student?.department).filter(Boolean))].sort()
  const leaderboard = useMemo(() => {
    const grouped = new Map()
    results.forEach((result) => {
      const student = result.student || {}
      const key = student._id || result.studentId
      const current = grouped.get(key) || { student, assessments: 0, totalPercentage: 0, results: [] }
      current.assessments += 1; current.totalPercentage += Number(result.percentage) || 0; current.results.push(result); grouped.set(key, current)
    })
    return [...grouped.values()].map((entry) => ({ ...entry, averageScore: entry.assessments ? Math.round(entry.totalPercentage / entry.assessments) : 0, readiness: Number(entry.student.placementReadinessScore) || 0 })).filter((entry) => `${entry.student.name || ''} ${entry.student.email || ''}`.toLowerCase().includes(search.toLowerCase()) && (department === 'ALL' || entry.student.department === department)).sort((a, b) => (b.readiness - a.readiness) || (b.averageScore - a.averageScore))
  }, [results, search, department])

  if (error) return <div className="alert error">{error}</div>
  return <><div className="page-title"><div><h1>Leaderboard</h1><div className="subtitle">Assessment performance for your assigned students</div></div></div><div className="card"><div className="row between"><h3>Student Performance</h3><div className="results-filters"><input placeholder="Search student" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></div></div>{leaderboard.length ? <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Student</th><th>Department</th><th>Assessments</th><th>Average Score</th><th>Readiness</th></tr></thead><tbody>{leaderboard.map((entry, index) => <tr key={entry.student._id || index}><td>{index + 1}</td><td>{entry.student.name || entry.student.email || '—'}</td><td>{entry.student.department || '—'}</td><td>{entry.assessments}</td><td>{entry.averageScore}%</td><td>{entry.readiness}%</td></tr>)}</tbody></table></div> : <p className="muted mt">No results yet.</p>}</div></>
}
