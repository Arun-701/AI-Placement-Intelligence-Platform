import { useEffect, useState } from 'react'
import { api } from '../../api'
import './Announcements.css'

const announcementIconShapes = {
  megaphone: <><path d="m3 11 18-5v12L3 13v-2Z" /><path d="M3 13v4h5l2 4h4l-3-6M21 9l-2 1" /></>,
  title: <><path d="M4 7V4h16v3M12 4v16M8 20h8" /></>,
  message: <><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h6" /></>,
  audience: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>,
  document: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>
}

function AnnouncementIcon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{announcementIconShapes[name]}</svg>
}

function AnnouncementIllustration() {
  return (
    <svg className="admin-announcements-illustration" viewBox="0 0 280 170" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="announcement-paper" x1="62" y1="20" x2="202" y2="155" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#EAF1FF" />
        </linearGradient>
        <linearGradient id="announcement-megaphone" x1="56" y1="56" x2="118" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#438CF0" />
          <stop offset="1" stopColor="#7955D9" />
        </linearGradient>
      </defs>
      <path d="M27 121c-18-25-8-70 19-91 30-23 72-17 105-9 39 10 80 3 101 31 18 24 7 60-18 77-36 25-180 22-207-8Z" fill="#EAF1FF" />
      <circle cx="223" cy="42" r="29" fill="#F0EBFF" />
      <rect x="148" y="28" width="82" height="112" rx="12" fill="url(#announcement-paper)" stroke="#B8CAEA" strokeWidth="2.5" />
      <path d="M166 55h45M166 68h45M166 81h31" stroke="#9CB2D6" strokeWidth="4" strokeLinecap="round" />
      <rect x="165" y="98" width="47" height="22" rx="7" fill="#EEF5FF" />
      <path d="m177 104 7 5 14-10" stroke="#5186D3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 73h18l39-20v64L62 97H44V73Z" fill="url(#announcement-megaphone)" />
      <path d="M62 97 70 127h19l-10-32" fill="#97B5E5" />
      <path d="M109 66c12 12 12 28 0 40" stroke="#8171D9" strokeWidth="5" strokeLinecap="round" />
      <path d="M119 56c19 18 19 43 0 61" stroke="#B4A9EC" strokeWidth="3" strokeLinecap="round" />
      <path d="m41 39 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#F1BD6C" />
      <circle cx="126" cy="35" r="4" fill="#8BC7B0" />
    </svg>
  )
}

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

  return (
    <div className="admin-announcements-page admin-announcement-workflow-page">
      <header className="admin-announcements-hero">
        <div className="admin-announcements-hero-copy">
          <span className="admin-announcements-badge"><AnnouncementIcon name="document" /> Admin communication</span>
          <h1>Announcements</h1>
          <p>Send updates to students, faculty, or a department.</p>
        </div>
        <AnnouncementIllustration />
      </header>

      {error && <div className="alert error">{error}</div>}
      {status && <div className="alert success">{status}</div>}

      <form className="card admin-announcement-form" onSubmit={send}>
        <div className="admin-announcement-section-heading">
          <span className="admin-announcement-section-icon"><AnnouncementIcon name="megaphone" /></span>
          <div>
            <h2>Send Announcement</h2>
            <p>Create a message and send it to students, faculty, or selected departments.</p>
          </div>
        </div>

        <div className="admin-announcement-fields">
          <div className="form-group">
            <label className="admin-announcement-field-label"><AnnouncementIcon name="title" />Title</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div className="form-group">
            <label className="admin-announcement-field-label"><AnnouncementIcon name="message" />Message</label>
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required />
          </div>
          <div className="form-group">
            <label className="admin-announcement-field-label"><AnnouncementIcon name="audience" />Send To</label>
            <select value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value, departments: [] })}>
              <option value="ALL_STUDENTS">All Students</option>
              <option value="ALL_FACULTY">All Faculty</option>
              <option value="ALL_USERS">All Students + All Faculty</option>
              <option value="DEPARTMENT">Department</option>
            </select>
          </div>
        </div>

        {form.targetType === 'DEPARTMENT' && (
          <div className="form-group admin-announcement-departments">
            <label>Departments</label>
            <div className="row mt">
              <button type="button" className="btn small secondary" onClick={() => setForm({ ...form, departments: [...departments] })}>Select All</button>
              <button type="button" className="btn small secondary" onClick={() => setForm({ ...form, departments: [] })}>Clear All</button>
            </div>
            <div className="student-selection">
              {departments.map((department) => (
                <label className="option-row" key={department}>
                  <input
                    type="checkbox"
                    checked={form.departments.includes(department)}
                    onChange={(event) => setForm({ ...form, departments: event.target.checked ? [...form.departments, department] : form.departments.filter((item) => item !== department) })}
                  />
                  <span>{department}</span>
                </label>
              ))}
            </div>
            {form.departments.length === 0 && <small className="muted">Please select at least one department.</small>}
          </div>
        )}

        <div className="admin-announcement-form-footer">
          <button className="btn admin-announcement-submit" disabled={busy}>
            <AnnouncementIcon name="send" />
            {busy ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>
      </form>

      <section className="card admin-announcement-list-card">
        <div className="admin-announcement-section-heading">
          <span className="admin-announcement-section-icon"><AnnouncementIcon name="document" /></span>
          <div>
            <h2>Created Announcements</h2>
            <p>View and manage previously sent announcements.</p>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="admin-announcement-empty-state">
            <span className="admin-announcement-empty-icon"><AnnouncementIcon name="document" /></span>
            <p>No announcements created yet.</p>
          </div>
        ) : (
          <div className="admin-announcement-list">
            {items.map((announcement) => (
              <div className="list-item admin-announcement-list-item" key={announcement._id}>
                <div className="row between">
                  <strong>{announcement.title}</strong>
                  <span className="badge gray">{targetLabel(announcement)}</span>
                </div>
                <p>{announcement.message}</p>
                <small className="muted">{new Date(announcement.createdAt).toLocaleString()}{announcement.createdBy?.name ? ` - ${announcement.createdBy.name}` : ''}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
