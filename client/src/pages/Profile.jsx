import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import './Profile.css'

const emptyForm = {
  fullName: '',
  phone: '',
  studentId: '',
  college: '',
  department: '',
  degree: '',
  year: '',
  semester: '',
  section: '',
  cgpa: '',
  graduationYear: '',
  skills: [],
  github: '',
  linkedin: '',
  portfolio: '',
}

const getStudent = (data) => data?.student || data || {}

const toProfileForm = (student) => ({
  fullName: student.fullName || '',
  phone: student.phone || '',
  studentId: student.studentId || '',
  college: student.college || '',
  department: student.department || '',
  degree: student.degree || '',
  year: student.year ?? '',
  semester: student.semester ?? '',
  section: student.section || '',
  cgpa: student.cgpa ?? '',
  graduationYear: student.graduationYear ?? '',
  skills: Array.isArray(student.skills) ? student.skills : [],
  github: student.github || '',
  linkedin: student.linkedin || '',
  portfolio: student.portfolio || '',
})

const getInitials = (name) => String(name || 'Student')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('')

const normalizeUrl = (value) => {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const parsed = new URL(candidate)
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.') ? candidate : null
  } catch {
    return null
  }
}

const inputValue = (value) => value === null || value === undefined ? '' : String(value)

function ProfileSectionIcon({ name }) {
  const paths = {
    personal: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1.2a5.8 5.8 0 0 1 5.8-5.8h2.4a5.8 5.8 0 0 1 5.8 5.8V20" /></>,
    academic: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11.2v4.3c2.8 2.4 7.2 2.4 10 0v-4.3M21 9v6" /></>,
    professional: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  }

  return (
    <svg className="student-profile-section-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [savedForm, setSavedForm] = useState(emptyForm)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [skillsInput, setSkillsInput] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeStatus, setResumeStatus] = useState('')
  const resumeInputRef = useRef(null)

  const fetchProfile = useCallback(async (preserveDraft = false) => {
    try {
      const response = await api.get('/student/profile')
      if (!response.ok) throw new Error(response.data?.message || 'Unable to load your profile.')
      const student = getStudent(response.data?.data)
      const nextForm = toProfileForm(student)
      setProfile(student)
      setSavedForm(nextForm)
      if (!preserveDraft) setForm(nextForm)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role !== 'student') return
    let active = true
    api.get('/student/profile')
      .then((response) => {
        if (!active) return
        if (!response.ok) throw new Error(response.data?.message || 'Unable to load your profile.')
        const student = getStudent(response.data?.data)
        const nextForm = toProfileForm(student)
        setProfile(student)
        setSavedForm(nextForm)
        setForm(nextForm)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your profile.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user?.role])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setValidationErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const addSkills = (value = skillsInput) => {
    const additions = value.split(',').map((skill) => skill.trim()).filter(Boolean)
    if (!additions.length) {
      setSkillsInput('')
      return
    }
    setForm((current) => {
      const known = new Set(current.skills.map((skill) => skill.toLowerCase()))
      return {
        ...current,
        skills: [...current.skills, ...additions.filter((skill) => {
          const key = skill.toLowerCase()
          if (known.has(key)) return false
          known.add(key)
          return true
        })],
      }
    })
    setValidationErrors((current) => {
      if (!current.skills) return current
      const next = { ...current }
      delete next.skills
      return next
    })
    setSkillsInput('')
  }

  const removeSkill = (skillToRemove) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const cancelEditing = () => {
    setForm(savedForm)
    setSkillsInput('')
    setResumeFile(null)
    setError('')
    setValidationErrors({})
    setInfo('')
    setEditing(false)
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const fullName = form.fullName.trim()
    const phone = form.phone.trim()
    const department = form.department.trim()
    const onboarding = profile?.profileCompleted === false
    const errors = {}
    if (fullName.length < 2) {
      errors.fullName = 'Enter your full name (at least 2 characters).'
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
    }
    if (department.length < 2) {
      errors.department = 'Enter your department (at least 2 characters).'
    }
    if (onboarding) {
      if (form.college.trim().length < 2) errors.college = 'Enter your college name (at least 2 characters) to complete your profile.'
      if (!form.section.trim()) errors.section = 'Section is required to complete your profile.'
      if (!form.github.trim()) errors.github = 'GitHub URL is required to complete your profile.'
      if (!form.linkedin.trim()) errors.linkedin = 'LinkedIn URL is required to complete your profile.'
      if (!form.skills.length) errors.skills = 'Add at least one skill to complete your profile.'
      if (form.cgpa === '') errors.cgpa = 'CGPA is required to complete your profile.'
    }
    if (form.year !== '' && (!Number.isInteger(Number(form.year)) || Number(form.year) < 1 || Number(form.year) > 8)) {
      errors.year = 'Current year must be a whole number between 1 and 8.'
    }
    if (form.semester !== '' && (!Number.isInteger(Number(form.semester)) || Number(form.semester) < 1 || Number(form.semester) > 16)) {
      errors.semester = 'Current semester must be a whole number between 1 and 16.'
    }
    if (form.cgpa !== '' && (!Number.isFinite(Number(form.cgpa)) || Number(form.cgpa) < 0 || Number(form.cgpa) > 10)) {
      errors.cgpa = 'CGPA must be between 0 and 10.'
    }
    const latestGraduationYear = new Date().getFullYear() + 10
    if (form.graduationYear !== '' && (!Number.isInteger(Number(form.graduationYear)) || Number(form.graduationYear) < 1950 || Number(form.graduationYear) > latestGraduationYear)) {
      errors.graduationYear = `Graduation year must be between 1950 and ${latestGraduationYear}.`
    }

    const payload = {
      fullName,
      phone,
      studentId: form.studentId.trim(),
      college: form.college.trim(),
      department,
      degree: form.degree.trim(),
      year: form.year === '' ? undefined : Number(form.year),
      semester: form.semester === '' ? null : Number(form.semester),
      section: form.section.trim(),
      cgpa: form.cgpa === '' ? null : Number(form.cgpa),
      graduationYear: form.graduationYear === '' ? null : Number(form.graduationYear),
      skills: form.skills,
    }

    for (const field of ['github', 'linkedin', 'portfolio']) {
      const value = form[field].trim()
      if (!value) {
        payload[field] = ''
        continue
      }
      const normalized = normalizeUrl(value)
      if (!normalized) {
        errors[field] = `Enter a valid ${field === 'github' ? 'GitHub' : field === 'linkedin' ? 'LinkedIn' : 'portfolio'} URL.`
        continue
      }
      payload[field] = normalized
    }

    setValidationErrors(errors)
    if (Object.keys(errors).length) {
      setError('Please correct the highlighted fields before saving.')
      return
    }

    setSaving(true)
    try {
      const response = await api.put('/student/profile', payload)
      if (!response.ok) throw new Error(response.data?.message || 'Your profile could not be saved.')
      const student = getStudent(response.data?.data)
      const nextForm = toProfileForm(student)
      setProfile(student)
      setForm(nextForm)
      setSavedForm(nextForm)
      setSkillsInput('')
      setValidationErrors({})
      setEditing(false)
      setInfo('Your profile has been saved.')
      await refreshUser()
      if (onboarding) {
        if (student.profileCompleted === true) {
          navigate('/student/assessments', { replace: true })
        } else {
          const remaining = response.data?.data?.missingFields || []
          setInfo(remaining.length
            ? `Your information was saved. Still required: ${remaining.join(', ')}.`
            : 'Your information was saved. Complete the remaining required fields to continue.')
          setEditing(true)
        }
      }
    } catch (requestError) {
      setError(requestError.message || 'Your profile could not be saved. Your unsaved changes are still here.')
    } finally {
      setSaving(false)
    }
  }

  const chooseResume = (file) => {
    setResumeStatus('')
    if (!file) {
      setResumeFile(null)
      return
    }
    const allowedExtension = /\.(pdf|doc|docx)$/i.test(file.name)
    if (!allowedExtension || file.size > 5 * 1024 * 1024) {
      setError(!allowedExtension ? 'Choose a PDF, DOC, or DOCX resume.' : 'Resume must be 5 MB or smaller.')
      setResumeFile(null)
      return
    }
    setError('')
    setResumeFile(file)
  }

  const uploadResume = async () => {
    if (!resumeFile) return
    setUploadingResume(true)
    setError('')
    setResumeStatus('')
    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      const response = profile?.resume
        ? await api.putUpload('/student/resume', formData)
        : await api.upload('/student/resume', formData)
      if (!response.ok) throw new Error(response.data?.message || 'Resume upload failed.')
      setResumeFile(null)
      setResumeStatus('Resume uploaded successfully.')
      setInfo('Resume uploaded successfully.')
      await fetchProfile(true)
      await refreshUser()
    } catch (requestError) {
      setError(requestError.message || 'Resume upload failed. Please try again.')
    } finally {
      setUploadingResume(false)
    }
  }

  const removeResume = async () => {
    setError('')
    setResumeStatus('')
    try {
      const response = await api.del('/student/resume')
      if (!response.ok) throw new Error(response.data?.message || 'Resume could not be removed.')
      setProfile((current) => current ? { ...current, resume: '', resumeFileName: '', resumeSize: 0 } : current)
      setResumeStatus('Resume removed.')
      setInfo('Resume removed.')
      await fetchProfile(true)
      await refreshUser()
    } catch (requestError) {
      setError(requestError.message || 'Resume could not be removed.')
    }
  }

  if (user?.role === 'faculty') {
    const initial = (user?.name || 'Faculty Member').trim().charAt(0).toUpperCase()
    const isActive = user?.isActive !== false
    return (
      <div className="faculty-profile">
        <header className="faculty-profile-hero">
          <div className="faculty-profile-identity">
            <div className="faculty-avatar" aria-hidden="true">{initial}</div>
            <div className="faculty-profile-heading">
              <div className="eyebrow">Faculty profile</div>
              <h1>{user?.name || 'Faculty Member'}</h1>
              <p>{user?.designation || 'Faculty'}{user?.department ? ` · ${user.department}` : ''}</p>
            </div>
          </div>
          <span className={`faculty-profile-status${isActive ? ' is-active' : ' is-inactive'}`}>
            {isActive ? 'Active account' : 'Inactive account'}
          </span>
        </header>
        <div className="faculty-profile-grid">
          <section className="faculty-profile-card card">
            <h2>Account Information</h2>
            <div className="faculty-profile-row"><span>Email</span><strong>{user?.email || '—'}</strong></div>
            <div className="faculty-profile-row"><span>Role</span><strong>Faculty</strong></div>
          </section>
          <section className="faculty-profile-card card">
            <h2>Professional Details</h2>
            <div className="faculty-profile-row"><span>Department</span><strong>{user?.department || 'Not provided'}</strong></div>
            <div className="faculty-profile-row"><span>Designation</span><strong>{user?.designation || 'Not provided'}</strong></div>
          </section>
        </div>
      </div>
    )
  }

  if (user?.role !== 'student') return <><h1>My Profile</h1><div className="card"><p><strong>Name:</strong> {user?.name}</p><p><strong>Email:</strong> {user?.email}</p><p><strong>Role:</strong> {user?.role}</p></div></>

  const completion = profile?.profileCompleteness
  const completionPercent = Math.min(100, Math.max(0, Number(completion?.percentage) || 0))
  const missingFields = completion?.missingFields || []
  const isOnboarding = profile?.profileCompleted === false
  const canEdit = editing || isOnboarding
  const displayName = profile?.fullName || user?.name || user?.fullName || 'Student'
  const resumeName = profile?.resumeFileName || (profile?.resume ? 'Uploaded resume' : '')

  const field = (label, name, options = {}) => (
    <label className={`student-profile-field${options.wide ? ' is-wide' : ''}${options.className ? ` ${options.className}` : ''}`} key={name}>
      <span>{label}{options.required && <em>Required</em>}</span>
      {options.select ? (
        <select
          value={inputValue(form[name])}
          disabled={!canEdit || saving}
          aria-invalid={Boolean(validationErrors[name])}
          onChange={(event) => setField(name, event.target.value)}
        >
          <option value="">{options.placeholder || 'Select'}</option>
          {options.select.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input
          type={options.type || 'text'}
          inputMode={options.inputMode}
          min={options.min}
          max={options.max}
          step={options.step}
          maxLength={options.maxLength}
          autoComplete={options.autoComplete}
          value={inputValue(form[name])}
          disabled={!canEdit || saving}
          aria-invalid={Boolean(validationErrors[name])}
          readOnly={options.readOnly}
          onChange={(event) => setField(name, event.target.value)}
          placeholder={options.placeholder}
        />
      )}
      {options.help && <small>{options.help}</small>}
      {validationErrors[name] && <small className="student-profile-field-error" role="alert">{validationErrors[name]}</small>}
    </label>
  )

  if (loading) {
    return <main className="student-profile"><div className="student-profile-state">Loading your saved profile…</div></main>
  }

  return (
    <main className="student-profile">
      <nav className="student-profile-breadcrumb" aria-label="Breadcrumb"><span>Student Portal</span><b>/</b><span aria-current="page">Profile</span></nav>
      <header className="student-profile-heading">
        <div>
          <h1>{isOnboarding ? 'Complete Your Profile' : 'My Profile'}</h1>
          <p>{isOnboarding ? 'Add your personal, academic and professional details to continue to your initial assessment.' : 'Manage your personal, academic and professional information.'}</p>
        </div>
        {!canEdit && <button className="student-profile-primary" type="button" onClick={() => { setError(''); setInfo(''); setValidationErrors({}); setEditing(true) }}>Edit Profile</button>}
      </header>

      {error && <div className="student-profile-alert is-error" role="alert">{error}</div>}
      {info && <div className="student-profile-alert is-success" role="status">{info}</div>}

      {!profile && (
        <section className="student-profile-card student-profile-state">
          <h2>Profile unavailable</h2>
          <p>We couldn’t load your profile information.</p>
          <button type="button" className="student-profile-secondary" onClick={() => { setLoading(true); fetchProfile() }}>Try again</button>
        </section>
      )}

      {profile && (
        <>
          <section className="student-profile-identity-card">
            <div className="student-profile-identity">
              <div className="student-profile-avatar" aria-hidden="true">{getInitials(displayName)}</div>
              <div className="student-profile-identity-copy">
                <div className="student-profile-role">Student account</div>
                <h2>{displayName}</h2>
                <div className="student-profile-email">
                  <span>{profile.email || user?.email || 'Email unavailable'}</span>
                  <span className={`student-profile-verified${profile.emailVerified ? ' is-verified' : ''}`}>{profile.emailVerified ? 'Verified' : 'Not verified'}</span>
                </div>
                <p>{profile.phone || 'Phone number not added'}{profile.department ? ` · ${profile.department}` : ''}</p>
              </div>
            </div>
            <div className="student-profile-completion">
              <div className="student-profile-completion-copy"><span>Profile completion</span><strong>{completionPercent}%</strong></div>
              <div className="student-profile-progress" role="progressbar" aria-label="Profile completion" aria-valuenow={completionPercent} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${completionPercent}%` }} /></div>
              {missingFields.length > 0
                ? <p>Still to add: {missingFields.join(', ')}.</p>
                : <p>Your profile information is complete.</p>}
            </div>
          </section>

          <form className="student-profile-form" onSubmit={save}>
            <section className="student-profile-card">
              <div className="student-profile-section-heading"><div><ProfileSectionIcon name="personal" /><div><h2>Personal information</h2><p>Your account identity and contact details.</p></div></div></div>
              <div className="student-profile-personal-grid">
                {field('Full name', 'fullName', { required: true, autoComplete: 'name' })}
                <label className="student-profile-field">
                  <span>Email address</span>
                  <input value={profile.email || user?.email || ''} disabled readOnly />
                  <small>{profile.emailVerified ? 'Verified account email; email changes are not supported here.' : 'Email changes are not supported here.'}</small>
                </label>
                {field('Phone number', 'phone', { required: true, type: 'tel', inputMode: 'numeric', maxLength: 10, autoComplete: 'tel' })}
              </div>
            </section>

            <section className="student-profile-card">
              <div className="student-profile-section-heading"><div><ProfileSectionIcon name="academic" /><div><h2>Academic information</h2><p>Keep your education details up to date.</p></div></div></div>
              <div className="student-profile-academic-grid">
                {field('Registration number', 'studentId', { placeholder: 'University register number', className: 'academic-third' })}
                {field('College name', 'college', { required: isOnboarding, className: 'academic-third' })}
                {field('Department', 'department', { required: true, className: 'academic-third' })}
                {field('Degree', 'degree', { placeholder: 'e.g. B.E. Computer Science', className: 'academic-quarter' })}
                {field('Current year', 'year', { type: 'number', inputMode: 'numeric', min: 1, max: 8, step: 1, className: 'academic-quarter' })}
                {field('Current semester', 'semester', { type: 'number', inputMode: 'numeric', min: 1, max: 16, step: 1, className: 'academic-quarter' })}
                {field('Section', 'section', { required: isOnboarding, className: 'academic-quarter' })}
                {field('CGPA', 'cgpa', { required: isOnboarding, type: 'number', inputMode: 'decimal', min: 0, max: 10, step: 0.01, className: 'academic-third' })}
                {field('Graduation year', 'graduationYear', { type: 'number', inputMode: 'numeric', min: 1950, max: new Date().getFullYear() + 10, step: 1, className: 'academic-third' })}
              </div>
            </section>

            <section className="student-profile-card">
              <div className="student-profile-section-heading"><div><ProfileSectionIcon name="professional" /><div><h2>Professional information</h2><p>Showcase your skills, profiles and resume.</p></div></div></div>
              <div className="student-profile-professional-grid">
                <div className="student-profile-field student-profile-skills-column">
                  <label htmlFor="student-profile-skills">Skills</label>
                  <div className={`student-profile-skill-entry${canEdit ? ' is-editing' : ''}`} aria-invalid={Boolean(validationErrors.skills)}>
                    {form.skills.map((skill) => (
                      <span className="student-profile-skill" key={skill}>{skill}{canEdit && <button type="button" aria-label={`Remove ${skill}`} onClick={() => removeSkill(skill)}>×</button>}</span>
                    ))}
                    {canEdit && <input id="student-profile-skills" value={skillsInput} disabled={saving} onChange={(event) => {
                      const pieces = event.target.value.split(',')
                      if (pieces.length > 1) {
                        addSkills(pieces.slice(0, -1).join(','))
                        setSkillsInput(pieces[pieces.length - 1])
                      } else {
                        setSkillsInput(event.target.value)
                      }
                    }} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault()
                        addSkills()
                      }
                    }} onBlur={() => { if (skillsInput.trim()) addSkills() }} placeholder="Type a skill and press Enter or comma" />}
                    {!canEdit && form.skills.length === 0 && <span className="student-profile-placeholder">No skills added</span>}
                  </div>
                  {validationErrors.skills && <small className="student-profile-field-error" role="alert">{validationErrors.skills}</small>}
                  {canEdit && <small>Duplicate skills are ignored.</small>}
                </div>
                <div className="student-profile-professional-details">
                  {field('GitHub URL', 'github', { required: isOnboarding, placeholder: 'https://github.com/username' })}
                  {field('LinkedIn URL', 'linkedin', { required: isOnboarding, placeholder: 'https://linkedin.com/in/username' })}
                  {field('Portfolio URL', 'portfolio', { placeholder: 'https://your-portfolio.example' })}
                  <div className="student-profile-field student-profile-resume-field">
                    <span>Resume</span>
                    <div className="student-profile-resume">
                      <div className="student-profile-resume-info">
                        <span className="student-profile-resume-icon" aria-hidden="true">PDF</span>
                        <div><strong>{resumeFile?.name || resumeName || 'No resume uploaded'}</strong><small>{resumeFile ? `${(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload` : resumeName ? `${profile.resumeSize ? `${(profile.resumeSize / (1024 * 1024)).toFixed(2)} MB · ` : ''}Saved privately` : 'PDF, DOC, or DOCX · Maximum 5 MB'}</small></div>
                      </div>
                      {canEdit && (
                        <div className="student-profile-resume-actions">
                          <input ref={resumeInputRef} className="student-profile-file-input" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => chooseResume(event.target.files?.[0])} />
                          <button type="button" className="student-profile-secondary" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>{resumeName ? 'Choose replacement' : 'Choose file'}</button>
                          {resumeFile && <button type="button" className="student-profile-primary" onClick={uploadResume} disabled={uploadingResume}>{uploadingResume ? 'Uploading…' : 'Upload resume'}</button>}
                          {resumeName && !resumeFile && <button type="button" className="student-profile-danger" onClick={removeResume} disabled={uploadingResume}>Remove</button>}
                        </div>
                      )}
                    </div>
                    {resumeStatus && <small className="student-profile-inline-success">{resumeStatus}</small>}
                  </div>
                </div>
              </div>
            </section>

            {canEdit && (
              <div className="student-profile-form-actions">
                {!isOnboarding && <button type="button" className="student-profile-secondary" onClick={cancelEditing} disabled={saving || uploadingResume}>Cancel</button>}
                <button type="submit" className="student-profile-primary" disabled={saving || uploadingResume}>{saving ? 'Saving…' : isOnboarding ? 'Save & Continue' : 'Save Changes'}</button>
              </div>
            )}
          </form>
        </>
      )}
    </main>
  )
}
