import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import './AssessmentAssign.css'

// Helper function to calculate number of sets consistently
const calculateNumSets = (assessment) => {
  if (!assessment) return 0
  return assessment.questionSets?.length || 0
}

export default function AdminAssessmentAssign() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Configuration for each set (assuming assessment has questionSets)
  const [setConfigs, setSetConfigs] = useState({})

  // Dropdown state for department selector
  const [openDropdowns, setOpenDropdowns] = useState({})
  const dropdownRefs = useRef({})

  useEffect(() => {
    loadData()
  }, [assessmentId])

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (e) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(e.target)) {
          setOpenDropdowns((prev) => ({ ...prev, [key]: false }))
        }
      })
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      const [assessmentRes, deptRes] = await Promise.all([
        api.get('/admin/assessments'),
        api.get('/admin/assessments/departments'),
      ])

      if (!assessmentRes.ok) {
        setError(assessmentRes.data?.message || 'Assessment not found')
        return
      }

      const item = assessmentRes.data?.data?.find((entry) => entry._id === assessmentId)
      if (!item) {
        setError('Assessment not found')
        return
      }

      setAssessment(item)
      if (deptRes.ok) setDepartments(deptRes.data?.data || [])

      const configs = {}
      const numSets = calculateNumSets(item)
      for (let i = 0; i < numSets; i++) {
        configs[i] = {
          departments: [],
          startDate: '',
          endDate: '',
        }
      }
      setSetConfigs(configs)
    } catch (err) {
      setError('Unable to load assessment')
    }
  }

  const toggleDepartment = (setIndex, dept) => {
    setSetConfigs((prev) => ({
      ...prev,
      [setIndex]: {
        ...prev[setIndex],
        departments: prev[setIndex].departments.includes(dept)
          ? prev[setIndex].departments.filter((d) => d !== dept)
          : [...prev[setIndex].departments, dept],
      },
    }))
  }

  const handleDateChange = (setIndex, field, value) => {
    setSetConfigs((prev) => ({
      ...prev,
      [setIndex]: { ...prev[setIndex], [field]: value },
    }))
  }

  const handleAssign = async () => {
    setError('')

    const numSets = calculateNumSets(assessment)

    // Check for partially filled sets
    for (let i = 0; i < numSets; i++) {
      const config = setConfigs[i]
      const hasDepts = config.departments?.length > 0
      const hasStart = config.startDate?.trim()
      const hasEnd = config.endDate?.trim()

      // If any field is filled, all must be filled
      if ((hasDepts || hasStart || hasEnd) && !(hasDepts && hasStart && hasEnd)) {
        setError(`Please complete Set ${i + 1} or clear its fields.`)
        return
      }
    }

    // Collect only configured sets
    const configuredSets = []
    for (let i = 0; i < numSets; i++) {
      const config = setConfigs[i]
      if (config.departments?.length && config.startDate && config.endDate) {
        // Validate dates for configured sets
        const startDate = new Date(config.startDate)
        const endDate = new Date(config.endDate)

        if (endDate <= startDate) {
          setError(`Set ${i + 1}: End date must be after start date`)
          return
        }

        configuredSets.push({
          setIndex: i,
          departments: config.departments,
          startDate: config.startDate,
          endDate: config.endDate,
        })
      }
    }

    // At least one set must be configured
    if (configuredSets.length === 0) {
      setError('Please configure at least one set before assigning')
      return
    }

    setBusy(true)

    try {
      console.log('=== ASSIGNMENT REQUEST ===')
      console.log('Assessment ID:', assessmentId)
      console.log('Configured Sets:', configuredSets)

      const response = await api.post(`/admin/assessments/${assessmentId}/assign-sets`, { sets: configuredSets })

      console.log('=== ASSIGNMENT RESPONSE ===')
      console.log('HTTP Status:', response.status)
      console.log('Response OK:', response.ok)
      console.log('Response Data:', response.data)

      if (!response.ok) {
        const errorMsg = response.data?.message || 'Assignment failed'
        console.error('Assignment Error:', errorMsg)
        setError(errorMsg)
        return
      }

      alert('✓ Assessment assigned successfully')
      navigate('/admin/assessments')
    } catch (err) {
      console.error('Assignment Exception:', err)
      setError(err.message || 'Assignment failed')
    } finally {
      setBusy(false)
    }
  }

  if (error && !assessment) return <div className="alert error">{error}</div>
  if (!assessment) return <div className="loading">Loading...</div>

  const numSets = calculateNumSets(assessment)

  if (numSets === 0) return <div className="alert error">This assessment has no questions. Please add questions first before assigning.</div>

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Assign Assessment</h1>
          <div className="subtitle">{assessment.title}</div>
        </div>
        <Link className="btn secondary" to="/admin/assessments">
          Back to Assessments
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <table className="assignment-table">
          <thead>
            <tr>
              <th>Set</th>
              <th>Departments</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numSets }).map((_, idx) => (
              <tr key={idx}>
                <td className="set-label">Set {idx + 1}</td>
                <td className="department-cell">
                  <div
                    className="department-dropdown"
                    ref={(el) => (dropdownRefs.current[idx] = el)}
                  >
                    <button
                      type="button"
                      className="dropdown-button"
                      onClick={() =>
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))
                      }
                    >
                      {setConfigs[idx]?.departments?.length > 0 ? (
                        <>
                          {setConfigs[idx].departments.length === 1
                            ? setConfigs[idx].departments[0]
                            : `${setConfigs[idx].departments.length} Departments Selected`}
                        </>
                      ) : (
                        'Select Departments'
                      )}
                      <span className="dropdown-arrow">▼</span>
                    </button>

                    {openDropdowns[idx] && (
                      <div className="dropdown-panel">
                        {departments.map((dept) => (
                          <label key={dept} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={setConfigs[idx]?.departments?.includes(dept) || false}
                              onChange={() => toggleDepartment(idx, dept)}
                            />
                            <span>{dept}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={setConfigs[idx]?.startDate || ''}
                    onChange={(e) => handleDateChange(idx, 'startDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={setConfigs[idx]?.endDate || ''}
                    onChange={(e) => handleDateChange(idx, 'endDate', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="form-actions">
          <button className="btn primary" disabled={busy} onClick={handleAssign}>
            {busy ? 'Assigning...' : 'Assign Assessment'}
          </button>
        </div>
      </div>
    </>
  )
}
