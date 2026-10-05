import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import './Layout.css'

const adminNavigationIcons = {
  Dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  Students: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20" /></>,
  Faculty: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6" /></>,
  Leaderboard: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8m-7-3h6v3H9v-3Z" /></>,
  Assessments: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></>,
  'Assignment History': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M4 5v4h4" /></>,
  Notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  Announcements: <><path d="m3 11 18-5v12L3 13v-2Zm0 2v4h5l2 4h4l-3-6M21 9l-2 1" /></>,
  Profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>
}

function AdminSidebarIcon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{adminNavigationIcons[name]}</svg>
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const links =
    user?.role === 'faculty'
      ? [
          { to: '/faculty', label: 'Dashboard', end: true },
          { to: '/faculty/students', label: 'Students' },
          { to: '/faculty/assessments', label: 'Assessments' },
          { to: '/faculty/results', label: 'Leaderboard' },
          { to: '/faculty/notifications', label: 'Notifications' },
          { to: '/faculty/announcements', label: 'Announcements' },
          { to: '/faculty/profile', label: 'Profile' },
        ]
      : user?.role === 'admin'
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
            { to: '/student', label: 'Dashboard', end: true },
            { to: '/student/assessments', label: 'Assessments' },
            { to: '/student/resume', label: 'Resume AI' },
            { to: '/student/coding', label: 'Coding Profile' },
            { to: '/student/roadmap', label: 'Learning Roadmap' },
            { to: '/student/ai-chat', label: 'AI Mentor' },
            { to: '/student/notifications', label: 'Notifications' },
            { to: '/student/announcements', label: 'Announcements' },
            { to: '/student/profile', label: 'Profile' },
          ]

  const title =
    user?.role === 'faculty' ? 'Faculty Panel' : user?.role === 'admin' ? 'Admin Panel' : 'Student Portal'
  const isAdmin = user?.role === 'admin'
  const isStudentOnboarding = user?.role === 'student' && (!user?.profileCompleted || !user?.initialAssessmentCompleted)

  if (isStudentOnboarding) {
    return (
      <div className="app-root">
        <main className="main onboarding">
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
    <div className="app-root">
      <aside className={`sidebar${isAdmin ? ' admin-sidebar' : ''}`}>
        <h2>{title}</h2>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {isAdmin && <span className="admin-sidebar-icon"><AdminSidebarIcon name={l.icon} /></span>}
            {l.label}
          </NavLink>
        ))}
        <button className="logout" onClick={handleLogout}>
          {isAdmin && <span className="admin-sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg></span>}
          Sign Out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
