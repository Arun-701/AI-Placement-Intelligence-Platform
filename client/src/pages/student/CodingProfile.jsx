import { useState, useEffect } from 'react'
import { api } from '../../api'

const platforms = [
  { key: 'leetcode', name: 'LeetCode', host: 'leetcode.com', placeholder: 'https://leetcode.com/username' },
  { key: 'codechef', name: 'CodeChef', host: 'codechef.com', placeholder: 'https://www.codechef.com/users/username' },
  { key: 'github', name: 'GitHub', host: 'github.com', placeholder: 'https://github.com/username' },
  { key: 'hackerrank', name: 'HackerRank', host: 'hackerrank.com', placeholder: 'https://www.hackerrank.com/username' },
  { key: 'codeforces', name: 'Codeforces', host: 'codeforces.com', placeholder: 'https://codeforces.com/profile/username' },
]

const emptyForm = Object.fromEntries(platforms.map(({ key }) => [key, '']))
const displayValue = (value) => {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value))) return 0
  if (typeof value === 'string' && ['Nill', '—', 'N/A', 'NA', 'null', 'undefined'].includes(value.trim())) return 0
  return value
}

const isValidPlatformUrl = (value, host) => {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase()
    return ['http:', 'https:'].includes(url.protocol)
      && (hostname === host || hostname.endsWith(`.${host}`))
      && url.pathname.split('/').filter(Boolean).length > 0
  } catch {
    return false
  }
}

export default function CodingProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const applyProfileResponse = (response) => {
    if (!response.ok) {
      setError(response.data?.message || 'Failed to load coding profile')
      return
    }
    const data = response.data.data
    setProfile(data)
    setForm({ ...emptyForm, ...(data.profileUrls || Object.fromEntries((data.platforms || []).map((platform) => [platform.platform?.toLowerCase(), platform.profileUrl]))) })
  }

  useEffect(() => {
    api.get('/student/coding-profile').then(applyProfileResponse)
  }, [])

  const save = async () => {
    setError('')
    setInfo('')
    const errors = {}
    platforms.forEach(({ key, name, host }) => {
      if (!isValidPlatformUrl(form[key] || '', host)) errors[key] = `Enter a valid ${name} profile URL.`
    })
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSaving(true)
    const response = await api.put('/student/coding-profile', form)
    setSaving(false)
    if (!response.ok) {
      setFieldErrors(response.data?.data?.fieldErrors || {})
      setError(response.data?.message || 'Unable to save coding profile')
      return
    }
    setInfo('Coding profile verified and updated successfully!')
    if (response.data?.data?.profileUrls) {
      applyProfileResponse(response)
    } else {
      const refreshed = await api.get('/student/coding-profile')
      applyProfileResponse(refreshed)
    }
  }

  const refresh = async () => {
    setError('')
    setInfo('')
    setRefreshing(true)
    const response = await api.post('/student/coding-profile/refresh')
    setRefreshing(false)
    if (!response.ok) {
      setError(response.data?.message || 'Unable to refresh coding profile')
      return
    }
    applyProfileResponse(response)
    const refreshErrors = response.data?.data?.refreshErrors || []
    setInfo(refreshErrors.length > 0
      ? refreshErrors.map((item) => `${item.platform}: ${item.message}`).join(' | ')
      : 'Coding profile refreshed successfully!')
  }

  const platformStats = Object.fromEntries((profile?.platforms || []).map((item) => [item.platform?.toLowerCase(), item]))
  const total = profile?.totalProblemsSolved || 0
  const easy = profile?.easySolved || 0
  const medium = profile?.mediumSolved || 0
  const hard = profile?.hardSolved || 0

  const statBlock = (label, value, tone = '', key = label) => (
    <div className={`coding-stat ${tone}`} key={key}>
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  )

  const getCurrentRating = (stats) => stats?.currentRating ?? stats?.contestDetails?.currentRating
  const getContestSummary = (stats) => stats?.contestDetails?.contestsParticipated ?? null

  return (
    <>
      <div className="page-title">
        <div><h1>Coding Profile</h1><div className="subtitle">Connect verified public profiles and track your coding progress</div></div>
        <div><button className="btn" onClick={refresh} disabled={refreshing || saving}>{refreshing ? 'Refreshing...' : 'Refresh'}</button></div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      <section className="coding-summary">
        <div><span className="eyebrow">Verified activity</span><h2>Coding progress</h2></div>
        <div className="coding-summary-grid">
          {statBlock('Total solved', total, 'total')}
          {statBlock('Easy', easy, 'easy')}
          {statBlock('Medium', medium, 'medium')}
          {statBlock('Hard', hard, 'hard')}
        </div>
      </section>

      <div className="coding-platform-grid">
        {platforms.map(({ key, name, placeholder }) => {
          const stats = platformStats[key]
          const isLeetCode = key === 'leetcode'
          const isHackerRank = key === 'hackerrank'
          const isCodeChef = key === 'codechef'
          const isCodeforces = key === 'codeforces'
          return (
            <article className={`coding-platform-card ${isLeetCode ? 'featured' : ''}`} key={key}>
              <div className="coding-card-header">
                <div><span className="eyebrow">{isLeetCode ? 'Primary signal' : 'Public profile'}</span><h3>{name}</h3></div>
                <span className={`platform-mark ${key}`}>{name.slice(0, 1)}</span>
              </div>
              <div className="form-group coding-url-group">
                <label>Profile URL</label>
                <input value={form[key] || ''} onChange={(event) => {
                  setForm({ ...form, [key]: event.target.value })
                  setFieldErrors({ ...fieldErrors, [key]: '' })
                }} placeholder={placeholder} />
                {fieldErrors[key] && <div className="alert error" style={{ marginTop: 8 }}>{fieldErrors[key]}</div>}
              </div>

              {stats && isLeetCode && <>
                <div className="coding-stat-grid four">
                  {statBlock('Total solved', stats.totalSolved, 'total')}
                  {statBlock('Easy', stats.easySolved, 'easy')}
                  {statBlock('Medium', stats.mediumSolved, 'medium')}
                  {statBlock('Hard', stats.hardSolved, 'hard')}
                </div>
                <div className="coding-stat-grid two">
                  {statBlock('Badges', stats.badges, 'badges')}
                  {statBlock('Current rating', getCurrentRating(stats), 'rating')}
                </div>
              </>}

              {stats && isHackerRank && <div className="coding-stat-grid two">
                {statBlock('Badges', stats.badges, 'badges')}
                {statBlock('Contest', getContestSummary(stats), 'rating')}
                {statBlock('Certificates', stats.certificates, 'certificates')}
                {statBlock('Skills', stats.skills, 'github-stat')}
              </div>}

              {stats && isCodeChef && <div className="coding-stat-grid three">
                {statBlock('Total solved', stats.totalSolved, 'total')}
                {statBlock('Badges', stats.badges, 'badges')}
                {statBlock('Current rating', getCurrentRating(stats), 'rating')}
              </div>}

              {stats && isCodeforces && <div className="coding-stat-grid four">
                {statBlock('Total problems solved', stats.totalSolved, 'total')}
                {statBlock('Current rating', stats.currentRating, 'rating')}
                {statBlock('Max rating', stats.maxRating, 'rating')}
                {statBlock('Contest', getContestSummary(stats), 'github-stat')}
              </div>}

              {stats && key === 'github' && <div className="coding-stat-grid three">
                {stats.statistics?.map((stat) => statBlock(stat.label, stat.value, 'github-stat', stat.label))}
              </div>}
            </article>
          )
        })}
      </div>

      <button className="btn" onClick={save} disabled={saving}>{saving ? 'Verifying profiles...' : 'Save Coding Profile'}</button>
    </>
  )
}
