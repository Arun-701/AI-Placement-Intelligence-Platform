import { Navigate, useParams } from 'react-router-dom'

export default function AdminAssessmentDetails() {
  const { assessmentId } = useParams()
  return <Navigate to={`/admin/assessments/results/${assessmentId}`} replace />
}
