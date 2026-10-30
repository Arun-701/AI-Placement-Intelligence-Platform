import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { getAssessmentResultsPath } from '../../assessmentSets'
import './AssignmentHistory.css'

const formatDeadline = (date) => date ? new Date(date).toLocaleString() : 'Not set'
const requestAssignmentHistory = () => api.get(`/admin/assessments?refresh=${Date.now()}`)

function filterAssignmentHistory(items, filters) {
  const [startYear, startMonth, startDay] = filters.startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = filters.endDate.split('-').map(Number)
  const startBoundary = new Date(startYear, startMonth - 1, startDay).getTime()
  const endBoundary = new Date(endYear, endMonth - 1, endDay + 1).getTime()
  return items.filter((item) => {
    if (Number(item.assignedCount) <= 0) return false
    if (Number(item.assignedCount) <= 0) return false

    const recordDate = item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN
    return Number.isFinite(recordDate) && recordDate >= startBoundary && recordDate < endBoundary
  })
}

function HistoryIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" />
    </svg>
  )
}

function AssignmentHistoryIllustration() {
  return (
    <svg className="admin-assignment-history-illustration" viewBox="0 0 250 155" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="history-paper" x1="91" y1="18" x2="174" y2="135" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#EAF1FF" />
        </linearGradient>
        <linearGradient id="history-accent" x1="50" y1="44" x2="112" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#438CF0" />
          <stop offset="1" stopColor="#7654D8" />
        </linearGradient>
      </defs>
      <path d="M26 112c-13-20-5-59 17-78 24-21 58-17 85-9 32 10 65 1 88 22 18 17 11 47-11 63-30 22-160 23-179 2Z" fill="#EAF1FF" />
      <rect x="114" y="20" width="75" height="111" rx="12" fill="url(#history-paper)" stroke="#B8CAEA" strokeWidth="2" />
      <rect x="130" y="38" width="43" height="22" rx="6" fill="#EDF3FF" />
      <path d="M138 49h27M130 76h42M130 88h42M130 100h24" stroke="#AABCDC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="94" r="25" fill="#EEF2FF" stroke="#CBD8F1" strokeWidth="2" />
      <path d="M54 80v15l10 6" stroke="#6678C6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M76 65h18v47H43V65h11" fill="url(#history-accent)" />
      <path d="M53 65v-6a9 9 0 0 1 18 0v6" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="m207 39 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#F1BD6C" />
      <circle cx="96" cy="29" r="4" fill="#8BC7B0" />
    </svg>
  )
}

export default function AdminAssignmentHistory() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [appliedFilters, setAppliedFilters] = useState(null)
  const [validationMessage, setValidationMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const searchHistory = async (event) => {
    event.preventDefault()
    setError('')

    if (!startDate || !endDate) {
      setItems([])
      setAppliedFilters(null)
      setValidationMessage('Please select both Start Date and End Date.')
      return
    }

    if (startDate > endDate) {
      setItems([])
      setAppliedFilters(null)
      setValidationMessage('Start Date must be on or before End Date.')
      return
    }

    setValidationMessage('')
    setAppliedFilters(null)
    setLoading(true)
    try {
      const response = await requestAssignmentHistory()
      if (!response.ok) {
        setError(response.data?.message || 'Unable to load assignment history')
        setItems([])
        setAppliedFilters(null)
      } else {
        setItems(response.data?.data || [])
        setAppliedFilters({ startDate, endDate })
      }
    } catch {
      setError('Unable to load assignment history')
      setItems([])
      setAppliedFilters(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = appliedFilters ? filterAssignmentHistory(items, appliedFilters) : []

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setItems([])
    setAppliedFilters(null)
    setError('')
    setValidationMessage('')
  }

  return (
    <div className="admin-assignment-history-page">
      <header className="admin-assignment-history-hero">
        <div className="admin-assignment-history-hero-copy">
          <span className="admin-assignment-history-badge"><HistoryIcon /> Assessment management</span>
          <h1>Assignment History</h1>
          <p>View previously assigned assessments and their status.</p>
        </div>
        <AssignmentHistoryIllustration />
      </header>

      {error && <div className="alert error">{error}</div>}
      <form className="admin-assignment-history-toolbar" aria-label="Filter assignment history" onSubmit={searchHistory}>
        <label className="admin-assignment-history-date-filter">
          <span>Start Date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="admin-assignment-history-date-filter">
          <span>End Date</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <div className="admin-assignment-history-filter-actions">
          <button className="admin-assignment-history-submit" type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button className="admin-assignment-history-clear" type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>
      {validationMessage && <p className="admin-assignment-history-date-error" role="alert">{validationMessage}</p>}

      {appliedFilters && !error && filteredHistory.length > 0 && (
        <p className="admin-assignment-history-result-count" aria-live="polite">
          Showing {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'}
        </p>
      )}

      {!appliedFilters && !error && !validationMessage && (
        <section className="admin-assignment-history-empty">
          <span className="admin-assignment-history-empty-icon"><HistoryIcon /></span>
          <h2>Select a Start Date and End Date, then click Search to view assignment history.</h2>
        </section>
      )}

      {appliedFilters && !error && filteredHistory.length === 0 && (
        <section className="admin-assignment-history-empty">
          <h2>No assignment history found for the selected date range.</h2>
        </section>
      )}

      {appliedFilters && !error && filteredHistory.length > 0 && (
        <div className="admin-assignment-history-list">
          {filteredHistory.map((item) => (
            <article className="admin-assignment-history-card" key={item._id}>
              <div className="admin-assignment-history-card-header">
                <span className="admin-assignment-history-card-icon"><HistoryIcon /></span>
                <div className="admin-assignment-history-title">
                  <h2>{item.title}</h2>
                  <p>{item.department || 'No department'} <span aria-hidden="true">·</span> {item.totalQuestions} questions <span aria-hidden="true">·</span> {item.duration} minutes</p>
                </div>
                <span className={`admin-assignment-history-status ${item.statusLabel === 'EXPIRED' ? 'is-expired' : item.statusLabel === 'ASSIGNED' ? 'is-assigned' : 'is-other'}`}>
                  {item.statusLabel.replace('_', ' ')}
                </span>
              </div>

              <div className="admin-assignment-history-details">
                <div className="admin-assignment-history-detail">
                  <span>Deadline</span>
                  <strong>{formatDeadline(item.endDate)}</strong>
                </div>
                <div className="admin-assignment-history-detail">
                  <span>Assigned</span>
                  <strong>{item.assignedCount}</strong>
                </div>
                <div className="admin-assignment-history-detail">
                  <span>Attended</span>
                  <strong>{item.attendedCount}</strong>
                </div>
                <div className="admin-assignment-history-detail">
                  <span>Not attended</span>
                  <strong>{item.notAttendedCount}</strong>
                </div>
                {item.averagePercentage !== null && (
                  <div className="admin-assignment-history-detail">
                    <span>Average score</span>
                    <strong>{item.averagePercentage}%</strong>
                  </div>
                )}
              </div>

              <div className="admin-assignment-history-card-footer">
                <button className="btn admin-assignment-history-result" onClick={() => navigate(getAssessmentResultsPath(item))}>
                  View Result
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}