import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Layout from './pages/Layout'
import StudentDashboard from './pages/student/Dashboard'
import AssessmentList from './pages/student/AssessmentList'
import TakeAssessment from './pages/student/TakeAssessment'
import AssessmentResult from './pages/student/AssessmentResult'
import ResumeAnalysis from './pages/student/ResumeAnalysis'
import CodingProfile from './pages/student/CodingProfile'
import Roadmap from './pages/student/Roadmap'
import CareerRecommendation from './pages/student/CareerRecommendation'
import AIChat from './pages/student/AIChat'
import FacultyDashboard from './pages/faculty/Dashboard'
import FacultyStudents from './pages/faculty/Students'
import FacultyResults from './pages/faculty/Results'
import FacultyAssessments from './pages/faculty/Assessments'
import AdminDashboard from './pages/admin/Dashboard'
import AdminStudents from './pages/admin/Students'
import AdminFaculties from './pages/admin/Faculties'
import AdminReports from './pages/admin/Reports'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

function Protected({ role, children }) {
  const { user, loading } = useAuth()
  const location = window.location
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    if (user.role === 'student') return <Navigate to="/student" replace />
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />
    return <Navigate to="/admin" replace />
  }

  // If student, enforce onboarding stages client-side for UX
  if (user.role === 'student') {
    const path = (location && location.pathname) || '';
    // If profile incomplete: only allow /student/profile
    if (!user.profileCompleted) {
      if (!path.startsWith('/student/profile')) return <Navigate to="/student/profile" replace />
      return children
    }
    // If profile complete but assignment incomplete: allow profile and assessments routes only
    if (!user.initialAssessmentCompleted) {
      if (path.startsWith('/student/assessments') || path.startsWith('/student/profile')) return children
      return <Navigate to="/student/assessments" replace />
    }
  }
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (user) {
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/student" replace />
  }
  return children
}

function Home() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (!user.profileCompleted) return <Navigate to="/student/profile" replace />
  if (!user.initialAssessmentCompleted) return <Navigate to="/student/assessments" replace />
  return <Navigate to="/student" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
          <Route path="/verify-email" element={<PublicOnly><VerifyEmail /></PublicOnly>} />

          <Route path="/student" element={<Protected role="student"><Layout /></Protected>}>
            <Route index element={<StudentDashboard />} />
            <Route path="assessments" element={<AssessmentList />} />
            <Route path="assessments/:id/take" element={<TakeAssessment />} />
            <Route path="assessments/result/:resultId" element={<AssessmentResult />} />
            <Route path="resume" element={<ResumeAnalysis />} />
            <Route path="coding" element={<CodingProfile />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="career" element={<CareerRecommendation />} />
            <Route path="ai-chat" element={<AIChat />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/faculty" element={<Protected role="faculty"><Layout /></Protected>}>
            <Route index element={<FacultyDashboard />} />
            <Route path="assessments" element={<FacultyAssessments />} />
            <Route path="students" element={<FacultyStudents />} />
            <Route path="results" element={<FacultyResults />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/admin" element={<Protected role="admin"><Layout /></Protected>}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="faculties" element={<AdminFaculties />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
