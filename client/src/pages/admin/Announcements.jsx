import { useEffect, useState } from 'react'
import { api } from '../../api'

const targetLabel = (announcement) => announcement.targetType === 'DEPARTMENT' ? `Departments: ${(announcement.departments?.length ? announcement.departments : [announcement.department]).filter(Boolean).join(', ')}` : announcement.targetType === 'ALL_STUDENTS' ? 'All Students' : announcement.targetType === 'ALL_USERS' ? 'All Students + All Faculty' : 'All Faculty'

export default function AdminAnnouncements() {
  const [items, setItems] = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ title: '', message: '', targetType: 'ALL_STUDENTS', departments: [] })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const response = await api.get('/admin/announcements')
    if (response.ok) setItems(response.data.data || [])
    else setError(response.data?.message || 'Unable to load announcements')
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get('/admin/announcements'), api.get('/admin/announcements/departments')]).then(([announcementResponse, departmentResponse]) => {
      if (cancelled) return
      if (announcementResponse.ok) setItems(announcementResponse.data.data || [])
      else setError(announcementResponse.data?.message || 'Unable to load announcements')
      if (departmentResponse.ok) setDepartments(departmentResponse.data.data || [])
    }).catch(() => { if (!cancelled) setError('Unable to load announcements') })
    return () => { cancelled = true }
  }, [])

  const send = async (event) => {
    event.preventDefault(); setError(''); setStatus('')
    setBusy(true)
    const response = await api.post('/admin/announcements', form)
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Unable to send announcement')
    setStatus('Announcement sent successfully.'); setForm({ title: '', message: '', targetType: 'ALL_STUDENTS', departments: [] }); await load()
  }

  return <>
    <div className="page-title"><div><h1>Announcements</h1><div className="subtitle">Send updates to students, faculty, or a department.</div></div></div>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    <form className="card mb" onSubmit={send}><h3>Send Announcement</h3><div className="form-group"><label>Title</label><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div><div className="form-group"><label>Message</label><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></div><div className="form-group"><label>Send To</label><select value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value, departments: [] })}><option value="ALL_STUDENTS">All Students</option><option value="ALL_FACULTY">All Faculty</option><option value="ALL_USERS">All Students + All Faculty</option><option value="DEPARTMENT">Department</option></select></div>{form.targetType === 'DEPARTMENT' && <div className="form-group"><label>Departments</label><div className="row mt"><button type="button" className="btn small secondary" onClick={() => setForm({ ...form, departments: [...departments] })}>Select All</button><button type="button" className="btn small secondary" onClick={() => setForm({ ...form, departments: [] })}>Clear All</button></div><div className="student-selection">{departments.map((department) => <label className="option-row" key={department}><input type="checkbox" checked={form.departments.includes(department)} onChange={(event) => setForm({ ...form, departments: event.target.checked ? [...form.departments, department] : form.departments.filter((item) => item !== department) })} /><span>{department}</span></label>)}</div>{form.departments.length === 0 && <small className="muted">Please select at least one department.</small>}</div>}<button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send Announcement'}</button></form>
    <div className="card"><h3>Created Announcements</h3>{items.length === 0 ? <p className="muted">No announcements created yet.</p> : items.map((announcement) => <div className="list-item" key={announcement._id}><div className="row between"><strong>{announcement.title}</strong><span className="badge gray">{targetLabel(announcement)}</span></div><p>{announcement.message}</p><small className="muted">{new Date(announcement.createdAt).toLocaleString()}{announcement.createdBy?.name ? ` - ${announcement.createdBy.name}` : ''}</small></div>)}</div>
  </>
}
