import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import './admin/Notifications.css'

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
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const load = () => {
    api.get('/notification').then((r) => {
      if (r.ok) setItems(r.data.data || [])
      else setError(r.data?.message || 'Failed to load notifications')
    })
  }

  useEffect(load, [])

  const markRead = async (id) => {
    await api.patch(`/notification/${id}/read`, {})
    load()
  }

  const markAll = async () => {
    await api.patch('/notification/read-all', {})
    load()
  }

  if (error) return <div className="alert error">{error}</div>

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

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Notifications</h1>
          <div className="subtitle">Updates, assignments and results</div>
        </div>
        <button className="btn secondary small" onClick={markAll}>Mark all read</button>
      </div>
      {items.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--muted)' }}>No notifications yet.</p></div>
      ) : (
        <div className="card">
          {items.map((n) => (
            <div key={n._id} className="list-item row between" style={{ opacity: n.isRead ? 0.6 : 1 }}>
              <div>
                <strong>{n.title}</strong>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{n.message}</p>
                <small style={{ color: 'var(--muted)' }}>{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              {!n.isRead && <button className="btn secondary small" onClick={() => markRead(n._id)}>Mark read</button>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}