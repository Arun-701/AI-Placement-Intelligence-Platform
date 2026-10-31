import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { formatReadinessPercentage } from '../../readinessUtils'
import './FacultyPages.css'

export default function FacultyResults() {
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const assessmentId = searchParams.get('assessmentId')
        const response = await api.get(`/faculty/results${assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : ''}`)
        if (!active) return
        if (!response.ok) {
          setError(response.data?.message || 'Failed to load leaderboard')
          return
        }
        setResults(response.data.data?.results || [])
      } catch {
        if (active) setError('Failed to load leaderboard. Check your connection and try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [searchParams])

  const leaderboard = useMemo(() => {
    const grouped = new Map()
    results.forEach((result) => {
      const student = result.student || {}
      const key = student._id || result.studentId
      const current = grouped.get(key) || { student, assessments: 0, totalPercentage: 0, results: [] }
      current.assessments += 1
      current.totalPercentage += Number(result.percentage) || 0
      current.results.push(result)
      grouped.set(key, current)
    })
    return [...grouped.values()]
      .map((entry) => ({
        ...entry,
        averageScore: entry.assessments ? Math.round(entry.totalPercentage / entry.assessments) : 0,
        readiness: Number(entry.student.placementReadinessScore) || 0
      }))
      .filter((entry) => `${entry.student.name || ''} ${entry.student.email || ''} ${entry.student.department || ''}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.readiness - a.readiness) || (b.averageScore - a.averageScore))
  }, [results, search])

  const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    const rows = [['Rank', 'Student', 'Department', 'Assessments', 'Average Score', 'Readiness'], ...leaderboard.map((entry, index) => [
      index + 1,
      entry.student.name || entry.student.email || '',
      entry.student.department || '',
      entry.assessments,
      `${entry.averageScore}%`,
      formatReadinessPercentage(entry.readiness)
    ])]
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'faculty-leaderboard.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="faculty-page faculty-leaderboard-page">
      <header className="faculty-leaderboard-hero">
        <div>
          <span className="faculty-page-eyebrow">FACULTY PORTAL</span>
          <h1>Leaderboard</h1>
          <p>Assessment performance for students assigned to you.</p>
        </div>
        <button className="btn secondary faculty-export-button faculty-leaderboard-export" disabled={!leaderboard.length} onClick={exportCsv}>Export CSV</button>
      </header>

      {error && <div className="alert error faculty-page-alert" role="alert">{error}</div>}

      <div className="faculty-data-card">
        <div className="faculty-leaderboard-toolbar">
          <h2>Student Performance</h2>
          <input className="faculty-leaderboard-search" aria-label="Search leaderboard" placeholder="Search student or department" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {loading ? (
          <div className="faculty-content-state" role="status">Loading leaderboard…</div>
        ) : leaderboard.length ? (
          <div className="table-wrap">
            <table className="faculty-leaderboard-table">
              <thead><tr><th>Rank</th><th>Student</th><th>Department</th><th>Assessments</th><th>Average score</th><th>Readiness</th></tr></thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const rank = index + 1
                  const scoreTone = entry.averageScore >= 80 ? 'high' : entry.averageScore >= 60 ? 'medium' : 'low'
                  return (
                    <tr key={entry.student._id || index} className={rank <= 3 ? `top-rank-${rank}` : ''}>
                      <td><span className={`faculty-leaderboard-rank${rank <= 3 ? ` rank-${rank}` : ''}`}>{rank}</span></td>
                      <td><strong className="faculty-leaderboard-student">{entry.student.name || entry.student.email || '—'}</strong></td>
                      <td>{entry.student.department || '—'}</td>
                      <td>{entry.assessments}</td>
                      <td><span className={`faculty-leaderboard-score ${scoreTone}`}>{entry.averageScore}%</span></td>
                      <td><span className="faculty-leaderboard-score">{formatReadinessPercentage(entry.readiness)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="faculty-content-state">{results.length ? 'No students match your search.' : 'No assessment results are available yet.'}</div>
        )}
      </div>
    </section>
  )
}
