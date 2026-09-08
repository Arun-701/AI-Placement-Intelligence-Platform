import { NavLink } from 'react-router-dom'

export default function AssessmentSectionNav({ basePath = '/admin/assessments' }) {
  return <div className="role-tabs assessment-section-nav"><NavLink to={`${basePath}/upload`} className={({ isActive }) => isActive ? 'active' : ''}>Upload</NavLink><NavLink to={basePath} end className={({ isActive }) => isActive ? 'active' : ''}>Assessments</NavLink></div>
}
