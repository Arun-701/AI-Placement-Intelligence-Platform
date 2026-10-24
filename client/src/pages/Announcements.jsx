import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import './Announcements.css'

const targetLabel = (announcement) => {
  if (announcement.targetType === 'DEPARTMENT') {
    const departments = [...new Set((announcement.departments?.length ? announcement.departments : [announcement.department]).filter(Boolean))]
    return departments.length ? `Department: ${departments.join(', ')}` : 'Your department'
  }
  if (announcement.targetType === 'ALL_STUDENTS') return 'All Students'
  if (announcement.targetType === 'ALL_USERS') return 'All Users'
  return 'All Faculty'
}

const getCategory = (announcement) => {
  const content = `${announcement.title || ''} ${announcement.message || ''}`.toLowerCase()
  if (/\b(assessment|assignment|exam|examination|test|quiz|result|submission)\b/.test(content)) return 'Assessments'
  if (/\b(academic|semester|course|class|lecture|curriculum|campus|college)\b/.test(content)) return 'Academic'
  return 'General'
}

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const categoryIcon = (category) => {
  const paths = {
    Academic: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6" /></>,
    Assessments: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
    General: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[category] || paths.General}</svg>
}

export default function Announcements() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    let active = true
    api.get('/announcements')
      .then((response) => {
        if (!active) return
        if (response.ok && Array.isArray(response.data?.data)) setItems(response.data.data)
        else setError(response.data?.message || 'Unable to load announcements.')
      })
      .catch(() => { if (active) setError('Unable to load announcements. Check your connection and try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (user?.role !== 'student') {
    if (error) return <div className="alert error">{error}</div>
    return <>
      <div className="page-title"><div><h1>Announcements</h1><div className="subtitle">Important updates for your account</div></div></div>
      {loading ? <div className="card">Loading announcements…</div> : items.length === 0 ? <div className="card"><p className="muted">No announcements available.</p></div> : <div className="grid">{items.map((announcement) => <div className="card" key={announcement._id}><div className="row between"><h3>{announcement.title}</h3><span className="badge gray">{targetLabel(announcement)}</span></div><p>{announcement.message}</p><small className="muted">{formatDate(announcement.createdAt)}</small></div>)}</div>}
    </>
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = items.filter((announcement) => {
    const matchesSearch = !normalizedSearch || `${announcement.title || ''} ${announcement.message || ''}`.toLowerCase().includes(normalizedSearch)
    return matchesSearch && (filter === 'All' || getCategory(announcement) === filter)
  })

  return (
    <section className="student-announcements-page">
      <header className="student-announcements-header">
        <div>
          <span className="student-announcements-eyebrow">CAMPUS UPDATES</span>
          <h1>Announcements</h1>
          <p>Important updates for your account</p>
        </div>
      </header>

      {error && <div className="student-announcements-error" role="alert">{error}</div>}

      <div className="student-announcements-summary" aria-label="Announcement summary">
        <article className="student-announcement-summary-card">
          <span className="student-announcement-summary-icon all">{categoryIcon('General')}</span>
          <span><small>All Announcements</small><strong>{loading ? '—' : items.length}</strong></span>
        </article>
        <article className="student-announcement-summary-card">
          <span className="student-announcement-summary-icon unread">{categoryIcon('Assessments')}</span>
          <span><small>Unread</small><strong>—</strong><em>Read status not tracked</em></span>
        </article>
        <article className="student-announcement-summary-card">
          <span className="student-announcement-summary-icon for-you">{categoryIcon('Academic')}</span>
          <span><small>For You</small><strong>{loading ? '—' : items.length}</strong></span>
        </article>
      </div>

      <div className="student-announcements-controls">
        <label className="student-announcements-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements" aria-label="Search announcements" />
        </label>
        <nav className="student-announcements-filters" aria-label="Filter announcements">
          {['All', 'Academic', 'Assessments', 'General'].map((category) => (
            <button type="button" key={category} className={filter === category ? 'active' : ''} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="student-announcements-state" role="status">Loading announcements…</div>
      ) : filteredItems.length === 0 ? (
        <div className="student-announcements-state">
          <h2>{items.length ? 'No matching announcements' : 'No announcements yet'}</h2>
          <p>{items.length ? 'Try a different search or category filter.' : 'Important updates for your account will appear here.'}</p>
        </div>
      ) : (
        <section className="student-announcements-list" aria-label="Announcements">
          {filteredItems.map((announcement) => {
            const category = getCategory(announcement)
            return (
              <article className="student-announcement-card" key={announcement._id}>
                <span className={`student-announcement-icon ${category.toLowerCase()}`}>{categoryIcon(category)}</span>
                <div className="student-announcement-content">
                  <div className="student-announcement-title-row">
                    <h2>{announcement.title}</h2>
                    <span className={`student-announcement-audience ${announcement.targetType === 'DEPARTMENT' ? 'department' : ''}`}>{targetLabel(announcement)}</span>
                  </div>
                  <p>{announcement.message}</p>
                  <div className="student-announcement-meta">
                    <span className={`student-announcement-category ${category.toLowerCase()}`}>{category}</span>
                    <time dateTime={announcement.createdAt}>{formatDate(announcement.createdAt)}</time>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </section>
  )
}
