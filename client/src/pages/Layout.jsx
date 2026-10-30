import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import FacultySidebar from './faculty/FacultySidebar'
import './Layout.css'

const adminNavigationIcons = {
  Dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  Students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  Assessments: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
  Leaderboard: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8m-7-3h6v3H9v-3Z" /></>,
  Notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  Announcements: <><path d="m3 11 18-5v12L3 13v-2Zm0 2v4h5l2 4h4l-3-6M21 9l-2 1" /></>,
  Profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  Logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  Faculty: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6" /></>,
  'Assignment History': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M4 5v4h4" /></>,
  'Resume AI': <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
  'Coding Profile': <><path d="m8 7-5 5 5 5M16 7l5 5-5 5m-2-12-4 14" /></>,
  'Learning Roadmap': <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="19" r="2" /><path d="M8 5h4a4 4 0 0 1 4 4v1M8 19h4a4 4 0 0 0 4-4v-1" /></>,
  'AI Mentor': <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-4-.9L4 20l1.2-3.4A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
}

function AdminSidebarIcon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{adminNavigationIcons[name]}</svg>
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const isStudent = user?.role === 'student'
  const isFaculty = user?.role === 'faculty'
  const readinessScore = user?.readinessProfile?.score ?? user?.placementReadinessScore
  const readinessValue = readinessScore === null || readinessScore === undefined || readinessScore === ''
    ? '—'
    : Number.isFinite(Number(readinessScore)) ? `${Math.round(Number(readinessScore))}%` : '—'

  useEffect(() => {
    if (!isStudent && !isFaculty) return undefined
    let active = true
    api.get('/notification/unread').then((response) => {
      if (active && response.ok && Array.isArray(response.data?.data)) {
        setUnreadCount(response.data.data.length)
      }
    }).catch(() => {
      if (active) console.warn(`Unable to load the ${isFaculty ? 'faculty' : 'student'} notification count.`)
    })
    return () => { active = false }
  }, [isFaculty, isStudent])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const links =
    user?.role === 'admin'
        ? [
            { to: '/admin', label: 'Dashboard', end: true, icon: 'Dashboard' },
            { to: '/admin/students', label: 'Students', icon: 'Students' },
            { to: '/admin/faculties', label: 'Faculty', icon: 'Faculty' },
            { to: '/admin/reports', label: 'Leaderboard', icon: 'Leaderboard' },
            { to: '/admin/assessments', label: 'Assessments', icon: 'Assessments' },
            { to: '/admin/assignment-history', label: 'Assignment History', icon: 'Assignment History' },
            { to: '/admin/notifications', label: 'Notifications', icon: 'Notifications' },
            { to: '/admin/announcements', label: 'Announcements', icon: 'Announcements' },
            { to: '/admin/profile', label: 'Profile', icon: 'Profile' },
          ]
        : [
            { to: '/student', label: 'Dashboard', end: true, icon: 'Dashboard' },
            { to: '/student/assessments', label: 'Assessments', icon: 'Assessments' },
            { to: '/student/resume', label: 'Resume AI', icon: 'Resume AI' },
            { to: '/student/coding', label: 'Coding Profile', icon: 'Coding Profile' },
            { to: '/student/roadmap', label: 'Learning Roadmap', icon: 'Learning Roadmap' },
            { to: '/student/ai-chat', label: 'AI Mentor', icon: 'AI Mentor' },
            { to: '/student/notifications', label: 'Notifications', icon: 'Notifications', unread: unreadCount },
            { to: '/student/announcements', label: 'Announcements', icon: 'Announcements' },
            { to: '/student/profile', label: 'Profile', icon: 'Profile' },
          ]

  const title =
    user?.role === 'faculty' ? 'Faculty Panel' : user?.role === 'admin' ? 'Admin Panel' : 'Student Portal'
  const isAdmin = user?.role === 'admin'
  const isStudentOnboarding = isStudent && (!user?.profileCompleted || !user?.initialAssessmentCompleted)

  if (isStudentOnboarding) {
    return (
      <div className="app-root">
        <main className="main onboarding">
          <div className="student-onboarding-content">
            <div className="student-onboarding-header">
              <h2>{title}</h2>
              <button className="logout" onClick={handleLogout}>Sign Out</button>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={`app-root${isStudent ? ' student-app' : ''}${isFaculty ? ' faculty-app' : ''}`}>
      {isFaculty ? (
        <FacultySidebar unreadCount={unreadCount} onSignOut={handleLogout} />
      ) : (
        <aside className={`sidebar${isAdmin ? ' admin-sidebar' : ''}${isStudent ? ' student-sidebar' : ''}`}>
          <h2>{title}</h2>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} title={l.label} aria-label={l.label} className={({ isActive }) => (isActive ? 'active' : '')}>
              {(isAdmin || isStudent) && <span className="admin-sidebar-icon"><AdminSidebarIcon name={l.icon} /></span>}
              <span className="student-sidebar-label">{l.label}</span>
              {isStudent && l.unread > 0 && <span className="student-sidebar-count">{l.unread > 99 ? '99+' : l.unread}</span>}
            </NavLink>
          ))}
          {isStudent && (
            <NavLink className="student-readiness-mini" to="/student" title="Placement readiness details">
              <span className="student-readiness-mini-label">Placement Readiness</span>
              <strong>{readinessValue}</strong>
              <small>{user?.readinessProfile?.level || 'View your progress'}</small>
            </NavLink>
          )}
          <button className="logout" onClick={handleLogout}>
            {isAdmin && <span className="admin-sidebar-icon"><AdminSidebarIcon name="Logout" /></span>}
            Sign Out
          </button>
        </aside>
      )}
      <main className={`main${isStudent ? ' student-main' : ''}${isFaculty ? ' faculty-main' : ''}`}>
        <Outlet context={{ unreadCount, setUnreadCount }} />
      </main>
    </div>
  )
}
