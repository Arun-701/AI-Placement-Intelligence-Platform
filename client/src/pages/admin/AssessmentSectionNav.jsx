import { NavLink } from 'react-router-dom'

export default function AssessmentSectionNav({ basePath = '/admin/assessments' }) {
  const isAdminNav = basePath.startsWith('/admin')
  return <div className={`role-tabs assessment-section-nav${isAdminNav ? ' assessment-section-nav--sticky' : ''}`}><NavLink to={`${basePath}/upload`} className={({ isActive }) => isActive ? 'active' : ''}><span className="assessment-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg></span>Upload</NavLink><NavLink to={basePath} end className={({ isActive }) => isActive ? 'active' : ''}><span className="assessment-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v-1h6v1M8 9h8M8 13h8M8 17h4" /></svg></span>Assessments</NavLink></div>
}
