import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

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
          { to: '/faculty/profile', label: 'Profile' },
        ]
      : user?.role === 'admin'
        ? [
            { to: '/admin', label: 'Dashboard', end: true },
            { to: '/admin/students', label: 'Students' },
            { to: '/admin/faculties', label: 'Faculties' },
            { to: '/admin/reports', label: 'Reports' },
            { to: '/admin/assessments', label: 'Assessments' },
            { to: '/admin/notifications', label: 'Notifications' },
            { to: '/admin/profile', label: 'Profile' },
          ]
        : [
            { to: '/student', label: 'Dashboard', end: true },
            { to: '/student/assessments', label: 'Assessments' },
            { to: '/student/resume', label: 'Resume AI' },
            { to: '/student/coding', label: 'Coding Profile' },
            { to: '/student/roadmap', label: 'Learning Roadmap' },
            { to: '/student/ai-chat', label: 'AI Mentor' },
            { to: '/student/notifications', label: 'Notifications' },
            { to: '/student/profile', label: 'Profile' },
          ]

  const title =
    user?.role === 'faculty' ? 'Faculty Panel' : user?.role === 'admin' ? 'Admin Panel' : 'Student Portal'
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
      <aside className="sidebar">
        <h2>{title}</h2>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
        <button className="logout" onClick={handleLogout}>Sign Out</button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
