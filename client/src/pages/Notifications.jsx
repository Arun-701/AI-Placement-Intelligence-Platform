import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import './admin/Notifications.css'
import './Notifications.css'

const filters = ['All', 'Unread', 'Assignments', 'Roadmap', 'Profile']

const notificationCategory = (type = '') => {
  const normalized = type.toLowerCase()
  if (normalized.includes('roadmap')) return 'Roadmap'
  if (normalized.includes('assessment') || normalized.includes('assignment') || normalized.includes('student request')) return 'Assignments'
  if (normalized.includes('profile') || normalized.includes('resume') || normalized.includes('career recommendation')) return 'Profile'
  return 'Other'
}

const notificationBadge = (type = '') => {
  const normalized = type.toLowerCase()
  if (normalized.includes('roadmap')) return 'Roadmap'
  if (normalized.includes('profile')) return 'Profile'
  if (normalized.includes('assessment')) return 'Assessment'
  if (normalized.includes('assignment') || normalized.includes('student request')) return 'Assignment'
  if (normalized.includes('resume')) return 'Resume'
  if (normalized.includes('career recommendation')) return 'Career'
  return 'Notification'
}

const categoryIcon = (category) => {
  const paths = {
    Roadmap: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="19" r="2" /><path d="M8 5h4a4 4 0 0 1 4 4v1M8 19h4a4 4 0 0 0 4-4v-1" /></>,
    Assignments: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
    Profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    Resume: <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    Other: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[category] || paths.Other}</svg>
}

const formatTimestamp = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function NotificationBell({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

function NotificationIllustration() {
  return (
    <svg className="admin-notifications-illustration" viewBox="0 0 240 150" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="notification-bell-gradient" x1="67" y1="40" x2="153" y2="126" gradientUnits="userSpaceOnUse">
          <stop stopColor="#438CF0" />
          <stop offset="1" stopColor="#7654D8" />
        </linearGradient>
        <linearGradient id="notification-card-gradient" x1="142" y1="24" x2="207" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#EAF1FF" />
        </linearGradient>
      </defs>
      <path d="M28 105c-8-20 2-52 22-67 25-18 52-16 77-8 30 9 68 1 86 22 16 20 6 47-16 59-27 16-153 17-169-6Z" fill="#EAF1FF" />
      <rect x="143" y="22" width="61" height="89" rx="13" fill="url(#notification-card-gradient)" stroke="#B8CAEA" strokeWidth="2" />
      <circle cx="173.5" cy="43" r="8" fill="#EDF3FF" />
      <path d="M159 68h29M159 78h29M159 88h19" stroke="#AABCDC" strokeWidth="3" strokeLinecap="round" />
      <path d="M71 93c8-8 10-17 10-34a28 28 0 0 1 56 0c0 17 2 26 10 34 3 3 1 8-4 8H75c-5 0-7-5-4-8Z" fill="url(#notification-bell-gradient)" />
      <path d="M101 106a8 8 0 0 0 16 0" stroke="#6A66D2" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 55c-6 9-8 20-6 30M157 52c4 5 6 11 6 17" stroke="#AAB9E9" strokeWidth="3" strokeLinecap="round" />
      <path d="m47 32 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#F1BD6C" />
      <circle cx="129" cy="29" r="4" fill="#8BC7B0" />
    </svg>
  )
}

export default function Notifications() {
  const { user } = useAuth()
  const outletContext = useOutletContext() || {}
  const setUnreadCount = outletContext.setUnreadCount
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await api.get('/notification')
        if (!active) return
        if (!response.ok || !Array.isArray(response.data?.data)) {
          setError(response.data?.message || 'Unable to load notifications.')
          return
        }
        const notifications = response.data.data
        setItems(notifications)
        setError('')
        if (user?.role === 'student' || user?.role === 'faculty') {
          setUnreadCount?.(notifications.filter((notification) => !notification.isRead).length)
        }
      } catch {
        if (active) setError('Unable to load notifications. Check your connection and try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [reloadToken, setUnreadCount, user?.role])

  const markRead = async (id) => {
    if (busyId || markingAll) return
    setBusyId(id)
    setError('')
    try {
      const response = await api.patch(`/notification/${id}/read`, {})
      if (!response.ok) {
        setError(response.data?.message || 'Unable to mark this notification as read.')
        return
      }
      const updated = items.map((notification) => notification._id === id ? { ...notification, isRead: true } : notification)
      setItems(updated)
      if (user?.role === 'student' || user?.role === 'faculty') setUnreadCount?.(updated.filter((notification) => !notification.isRead).length)
    } catch {
      setError('Unable to mark this notification as read. Check your connection and try again.')
    } finally {
      setBusyId('')
    }
  }

  const markAll = async () => {
    if (markingAll || busyId || unreadCount === 0) return
    setMarkingAll(true)
    setError('')
    try {
      const response = await api.patch('/notification/read-all', {})
      if (!response.ok) {
        setError(response.data?.message || 'Unable to mark notifications as read.')
        return
      }
      setItems((current) => current.map((notification) => ({ ...notification, isRead: true })))
      if (user?.role === 'student' || user?.role === 'faculty') setUnreadCount?.(0)
    } catch {
      setError('Unable to mark notifications as read. Check your connection and try again.')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = items.filter((notification) => !notification.isRead).length
  const visibleItems = items.filter((notification) => {
    if (filter === 'Unread') return !notification.isRead
    if (['Assignments', 'Roadmap', 'Profile'].includes(filter)) return notificationCategory(notification.type) === filter
    return true
  })

  if (user?.role === 'admin') {
    return (
      <div className="admin-notifications-page">
        <header className="admin-notifications-hero">
          <div className="admin-notifications-hero-copy">
            <span className="admin-notifications-badge"><NotificationBell /> Notification center</span>
            <h1>Notifications</h1>
            <p>Updates, assignments and results</p>
          </div>
          <div className="admin-notifications-hero-actions">
            <button className="btn admin-notifications-mark-all" onClick={markAll}>
              <NotificationBell />
              Mark all read
            </button>
            <NotificationIllustration />
          </div>
        </header>

        {items.length === 0 ? (
          <section className="admin-notifications-empty">
            <span className="admin-notifications-empty-icon"><NotificationBell /></span>
            <h2>No notifications yet.</h2>
            <p>You're all caught up. New updates will appear here.</p>
          </section>
        ) : (
          <section className="admin-notifications-list" aria-label="Notifications">
            {items.map((n) => (
              <article key={n._id} className={`admin-notification-card${n.isRead ? ' is-read' : ' is-unread'}`}>
                <span className="admin-notification-icon"><NotificationBell /></span>
                <div className="admin-notification-content">
                  <div className="admin-notification-title-row">
                    <h2>{n.title}</h2>
                    <span className="admin-notification-status">{n.isRead ? 'Read' : 'New'}</span>
                  </div>
                  <p>{n.message}</p>
                  <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString()}</time>
                  {n.type === 'Student Request' && n.referenceId && (
                    <Link
                      className="btn secondary small"
                      to={`/admin/assessments/results/${n.referenceId}?setIndex=${Number(n.context?.setIndex) || 0}&studentId=${encodeURIComponent(n.context?.studentId || '')}`}
                    >
                      View Request
                    </Link>
                  )}
                </div>
                {!n.isRead && <button className="btn secondary small admin-notification-mark-read" onClick={() => markRead(n._id)}>Mark read</button>}
              </article>
            ))}
          </section>
        )}
      </div>
    )
  }

  if (user?.role === 'faculty') {
    return (
      <section className="faculty-notifications-page">
        <header className="faculty-notifications-hero">
          <div className="faculty-notifications-hero-copy">
            <span className="faculty-notifications-badge"><NotificationBell />Notification Center</span>
            <h1>Notifications</h1>
            <p>Assessment updates, student requests and faculty activity</p>
          </div>
          <div className="faculty-notifications-hero-actions">
            <button type="button" className="faculty-notifications-mark-all" onClick={markAll} disabled={unreadCount === 0 || markingAll || Boolean(busyId)}>
              <NotificationBell />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
            <NotificationIllustration />
          </div>
        </header>

        {error && (
          <div className="faculty-notifications-error" role="alert">
            <span>{error}</span>
            {!loading && <button type="button" onClick={() => { setLoading(true); setReloadToken((token) => token + 1) }}>Retry</button>}
          </div>
        )}

        {loading ? (
          <div className="faculty-notifications-state" role="status">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="faculty-notifications-state">
            <span className="faculty-notifications-empty-icon"><NotificationBell /></span>
            <h2>No notifications yet</h2>
            <p>New assessment and faculty updates will appear here.</p>
          </div>
        ) : (
          <section className="faculty-notifications-list" aria-label="Faculty notifications">
            {items.map((notification) => {
              const category = notificationCategory(notification.type)
              const isStudentRequest = notification.type === 'Student Request' && notification.referenceId
              return (
                <article key={notification._id} className={`faculty-notification-card${notification.isRead ? ' is-read' : ' is-unread'}`}>
                  <span className={`faculty-notification-icon ${category.toLowerCase()}`}>{categoryIcon(category)}</span>
                  <div className="faculty-notification-content">
                    <div className="faculty-notification-title-row">
                      <h2>{notification.title}</h2>
                      <span className={`faculty-notification-status${notification.isRead ? ' is-read' : ''}`}>{notification.isRead ? 'Read' : 'New'}</span>
                    </div>
                    <p>{notification.message}</p>
                    <div className="faculty-notification-meta">
                      <span className="faculty-notification-category">{notification.type || 'Notification'}</span>
                      <time dateTime={notification.createdAt}>{formatTimestamp(notification.createdAt)}</time>
                    </div>
                    {isStudentRequest && (
                      <Link className="faculty-notification-view-request" to={`/faculty/assessments/results/${encodeURIComponent(notification.referenceId)}`}>
                        View Request
                      </Link>
                    )}
                  </div>
                  {!notification.isRead && (
                    <button type="button" className="faculty-notification-read-action" onClick={() => markRead(notification._id)} disabled={markingAll || Boolean(busyId)}>
                      {busyId === notification._id ? 'Saving…' : 'Mark as read'}
                    </button>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </section>
    )
  }

  if (user?.role !== 'student') {
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Notifications</h1>
            <div className="subtitle">Updates, assignments and results</div>
          </div>
          <button className="btn secondary small" onClick={markAll} disabled={unreadCount === 0 || markingAll || Boolean(busyId)}>
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        {loading ? <div className="card">Loading notifications…</div> : items.length === 0 ? (
          <div className="card"><p style={{ color: 'var(--muted)' }}>No notifications yet.</p></div>
        ) : (
          <div className="card">
            {items.map((notification) => (
              <div key={notification._id} className="list-item row between" style={{ opacity: notification.isRead ? 0.6 : 1 }}>
                <div>
                  <strong>{notification.title}</strong>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{notification.message}</p>
                  <small style={{ color: 'var(--muted)' }}>{formatTimestamp(notification.createdAt)}</small>
                </div>
                {!notification.isRead && <button className="btn secondary small" onClick={() => markRead(notification._id)} disabled={markingAll || Boolean(busyId)}>{busyId === notification._id ? 'Saving…' : 'Mark read'}</button>}
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <section className="student-notifications-page">
      <header className="student-notifications-hero">
        <div className="student-notifications-hero-copy">
          <span className="student-notifications-badge"><NotificationBell />Notification Center</span>
          <h1>Notifications</h1>
          <p>Updates, assignments and results</p>
        </div>
        <div className="student-notifications-hero-actions">
          <button type="button" className="student-notifications-mark-all" onClick={markAll} disabled={unreadCount === 0 || markingAll || Boolean(busyId)}>
            <NotificationBell />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
          <NotificationIllustration />
        </div>
      </header>

      {error && (
        <div className="student-notifications-error" role="alert">
          <span>{error}</span>
          {!loading && <button type="button" onClick={() => { setLoading(true); setReloadToken((token) => token + 1) }}>Retry</button>}
        </div>
      )}

      <nav className="student-notifications-filters" aria-label="Filter notifications">
        {filters.map((option) => (
          <button key={option} type="button" className={filter === option ? 'active' : ''} aria-pressed={filter === option} onClick={() => setFilter(option)}>
            {option}
            {option === 'Unread' && <span>{loading ? '—' : unreadCount}</span>}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="student-notifications-state" role="status">Loading notifications…</div>
      ) : visibleItems.length === 0 ? (
        <div className="student-notifications-state">
          <span className="student-notifications-empty-icon"><NotificationBell /></span>
          <h2>{items.length === 0 ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}</h2>
          <p>{items.length === 0 ? "You're all caught up. New updates will appear here." : 'Try another filter to see more updates.'}</p>
        </div>
      ) : (
        <section className="student-notifications-list" aria-label="Notifications">
          {visibleItems.map((notification) => {
            const category = notificationCategory(notification.type)
            const badge = notificationBadge(notification.type)
            return (
              <article key={notification._id} className={`student-notification-item${notification.isRead ? ' is-read' : ' is-unread'}`}>
                <span className={`student-notification-type-icon ${category.toLowerCase()}`}>{categoryIcon(category)}</span>
                <div className="student-notification-body">
                  <div className="student-notification-title-row">
                    <h2>{notification.title}</h2>
                    {!notification.isRead && <span className="student-notification-new">NEW</span>}
                  </div>
                  <p>{notification.message}</p>
                  <div className="student-notification-meta">
                    <span className={`student-notification-category ${category.toLowerCase()}`}>{badge}</span>
                    <time dateTime={notification.createdAt}>{formatTimestamp(notification.createdAt)}</time>
                  </div>
                </div>
                {!notification.isRead && (
                  <button type="button" className="student-notification-read-action" onClick={() => markRead(notification._id)} disabled={markingAll || Boolean(busyId)}>
                    {busyId === notification._id ? 'Saving…' : 'Mark as read'}
                  </button>
                )}
                {!notification.isRead && <span className="student-notification-unread-dot" aria-label="Unread" />}
              </article>
            )
          })}
        </section>
      )}
    </section>
  )
}