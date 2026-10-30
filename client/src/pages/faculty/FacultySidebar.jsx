import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './FacultySidebar.css'

const navigation = [
  { to: '/faculty', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/faculty/students', label: 'Students', icon: 'students' },
  { to: '/faculty/assessments', label: 'Assessments', icon: 'assessments' },
  { to: '/faculty/results', label: 'Leaderboard', icon: 'leaderboard' },
  { to: '/faculty/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/faculty/announcements', label: 'Announcements', icon: 'announcements' },
  { to: '/faculty/profile', label: 'Profile', icon: 'profile' },
]

const iconPaths = {
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  assessments: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h4" /></>,
  leaderboard: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8m-7-3h6v3H9v-3Z" /></>,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  announcements: <><path d="m3 11 18-5v12L3 13v-2Zm0 2v4h5l2 4h4l-3-6M21 9l-2 1" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
}

function FacultyIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {iconPaths[name]}
    </svg>
  )
}

export default function FacultySidebar({ unreadCount = 0, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="faculty-mobile-menu-toggle"
        aria-label={mobileOpen ? 'Close faculty navigation' : 'Open faculty navigation'}
        aria-expanded={mobileOpen}
        aria-controls="faculty-sidebar"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <FacultyIcon name={mobileOpen ? 'close' : 'menu'} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="faculty-sidebar-backdrop"
          aria-label="Close faculty navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside id="faculty-sidebar" className={`faculty-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} aria-label="Faculty navigation">
        <div className="faculty-sidebar__brand">
          <span className="faculty-sidebar__cap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m2 9 10-5 10 5-10 5L2 9Z" />
              <path d="M6 11v5.2c3.4 2.5 8.6 2.5 12 0V11l-6 3-6-3Z" />
              <path d="M21 10v6" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <span>Faculty Panel</span>
          <button type="button" className="faculty-sidebar__close" aria-label="Close faculty navigation" onClick={() => setMobileOpen(false)}>
            <FacultyIcon name="close" />
          </button>
        </div>

        <nav className="faculty-sidebar__navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) => `faculty-sidebar__link${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="faculty-sidebar__icon"><FacultyIcon name={item.icon} /></span>
              <span className="faculty-sidebar__label">{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="faculty-sidebar__count">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="faculty-sidebar__footer">
          <button type="button" className="faculty-sidebar__sign-out" onClick={onSignOut}>
            <span className="faculty-sidebar__icon"><FacultyIcon name="logout" /></span>
            <span className="faculty-sidebar__label">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
