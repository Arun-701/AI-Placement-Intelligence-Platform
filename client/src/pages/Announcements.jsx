import { useEffect, useState } from 'react'
import { api } from '../api'

const targetLabel = (announcement) => announcement.targetType === 'DEPARTMENT' ? `Departments: ${(announcement.departments?.length ? announcement.departments : [announcement.department]).filter(Boolean).join(', ')}` : announcement.targetType === 'ALL_STUDENTS' ? 'All Students' : announcement.targetType === 'ALL_USERS' ? 'All Students + All Faculty' : 'All Faculty'

export default function Announcements() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/announcements').then((response) => response.ok ? setItems(response.data.data || []) : setError(response.data?.message || 'Unable to load announcements')).catch(() => setError('Unable to load announcements'))
  }, [])

  if (error) return <div className="alert error">{error}</div>
  return <>
    <div className="page-title"><div><h1>Announcements</h1><div className="subtitle">Important updates for your account</div></div></div>
    {items.length === 0 ? <div className="card"><p className="muted">No announcements available.</p></div> : <div className="grid">{items.map((announcement) => <div className="card" key={announcement._id}><div className="row between"><h3>{announcement.title}</h3><span className="badge gray">{targetLabel(announcement)}</span></div><p>{announcement.message}</p><small className="muted">{new Date(announcement.createdAt).toLocaleString()}</small></div>)}</div>}
  </>
}
