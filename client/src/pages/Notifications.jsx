import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Notifications() {
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
            <div key={n._id} className="list-item row between" style={{ opacity: n.read ? 0.6 : 1 }}>
              <div>
                <strong>{n.title}</strong>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{n.message}</p>
                <small style={{ color: 'var(--muted)' }}>{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              {!n.read && <button className="btn secondary small" onClick={() => markRead(n._id)}>Mark read</button>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}