import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { api } from '../../api'
import leetCodeLogo from '../../assets/platform-icons/leetcode.svg'
import codeChefLogo from '../../assets/platform-icons/codechef.svg'
import gitHubLogo from '../../assets/platform-icons/github.svg'
import './CodingProfile.css'

const platforms = [
  { key: 'leetcode', name: 'LeetCode', host: 'leetcode.com', placeholder: 'https://leetcode.com/username', logo: leetCodeLogo },
  { key: 'codechef', name: 'CodeChef', host: 'codechef.com', placeholder: 'https://www.codechef.com/users/username', logo: codeChefLogo },
  { key: 'github', name: 'GitHub', host: 'github.com', placeholder: 'https://github.com/username', logo: gitHubLogo },
]

const searchItems = [
  { title: 'Dashboard', detail: 'Student Portal', to: '/student' },
  { title: 'Assessments', detail: 'Assigned assessments', to: '/student/assessments' },
  { title: 'Resume AI', detail: 'Upload and analyze your resume', to: '/student/resume' },
  { title: 'Coding Profile', detail: 'Connected coding platforms', to: '/student/coding' },
  { title: 'Learning Roadmap', detail: 'Personalized learning plan', to: '/student/roadmap' },
  { title: 'AI Mentor', detail: 'Career guidance', to: '/student/ai-chat' },
  { title: 'Notifications', detail: 'Updates and assignments', to: '/student/notifications' },
  { title: 'Announcements', detail: 'College announcements', to: '/student/announcements' },
  { title: 'Profile', detail: 'Student information', to: '/student/profile' },
]

const emptyForm = Object.fromEntries(platforms.map(({ key }) => [key, '']))

const displayValue = (value) => {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value))) return '—'
  if (typeof value === 'string' && ['Nill', '—', 'N/A', 'NA', 'null', 'undefined'].includes(value.trim())) return '—'
  return value
}

const numberValue = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const formatResponseError = (response, fallback) => {
  const message = response.data?.message || fallback
  const detail = response.data?.data?.detail
  return detail ? `${message} Details: ${detail}` : message
}

const normalizeProfileUrl = (value, host) => {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase()
    if (!['http:', 'https:'].includes(url.protocol)
      || (hostname !== host && !hostname.endsWith(`.${host}`))
      || !url.pathname.split('/').filter(Boolean).length) return null
    return url.href
  } catch {
    return null
  }
}

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5m-2-12-4 14" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15v5Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" /></>,
    external: <><path d="M14 4h6v6m-11 4L20 4" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h7" /></>,
    trophy: <><path d="M8 21h8m-4-4v4m-4-17h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function PlatformLogo({ platform, className = '' }) {
  return <span className={`coding-platform-logo ${platform.key} ${className}`}><img src={platform.logo} alt={`${platform.name} logo`} /></span>
}

function EmptyState({ children }) {
  return <div className="coding-empty-state">{children}</div>
}

export default function CodingProfile() {
  const { user } = useAuth()
  const { unreadCount = 0 } = useOutletContext() || {}
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingPlatform, setEditingPlatform] = useState(null)
  const [query, setQuery] = useState('')

  const applyProfileResponse = (response) => {
    if (!response.ok) {
      setError(formatResponseError(response, 'Failed to load coding profile'))
      return false
    }
    const data = response.data?.data
    if (!data || typeof data !== 'object') {
      setError('The coding profile response was empty or invalid.')
      return false
    }
    setProfile(data)
    setForm({
      ...emptyForm,
      ...(data.profileUrls || Object.fromEntries((data.platforms || []).map((platform) => [platform.platform?.toLowerCase(), platform.profileUrl]))),
    })
    return true
  }

  useEffect(() => {
    let active = true
    api.get('/student/coding-profile').then((response) => {
      if (active) applyProfileResponse(response)
    }).catch(() => {
      if (active) setError('Unable to load coding profile. Check your connection and try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const startEditing = (key) => {
    setError('')
    setInfo('')
    setEditingPlatform(key)
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  const save = async (platformKey) => {
    setError('')
    setInfo('')
    const platform = platforms.find(({ key }) => key === platformKey)
    const value = form[platformKey] || ''
    if (value && !normalizeProfileUrl(value, platform.host)) {
      setFieldErrors((current) => ({ ...current, [platformKey]: `Enter a valid ${platform.name} profile URL.` }))
      return
    }

    setFieldErrors((current) => ({ ...current, [platformKey]: '' }))
    setSaving(true)
    try {
      const response = await api.put('/student/coding-profile', { [platformKey]: value })
      if (!response.ok) {
        setFieldErrors((current) => ({ ...current, ...(response.data?.data?.fieldErrors || {}) }))
        setError(formatResponseError(response, 'Unable to save coding profile'))
        return
      }
      if (!applyProfileResponse(response)) return
      setInfo('Coding profile verified and updated successfully.')
      setEditingPlatform(null)
    } catch {
      setError('Unable to verify this profile. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setError('')
    setInfo('')
    setRefreshing(true)
    try {
      const response = await api.post('/student/coding-profile/refresh')
      if (!response.ok) {
        setError(formatResponseError(response, 'Unable to refresh coding profile'))
        return
      }
      if (!applyProfileResponse(response)) return
      const refreshErrors = response.data?.data?.refreshErrors || []
      setInfo(refreshErrors.length
        ? refreshErrors.map((item) => `${item.platform}: ${item.message}`).join(' | ')
        : 'Coding profile refreshed successfully.')
    } catch {
      setError('Unable to refresh coding profile. Check your connection and try again.')
    } finally {
      setRefreshing(false)
    }
  }

  const platformStats = Object.fromEntries(
    (profile?.platforms || [])
      .filter((item) => platforms.some(({ key }) => key === item.platform?.toLowerCase()))
      .map((item) => [item.platform.toLowerCase(), item]),
  )
  const verifiedCodingPlatforms = platforms
    .map(({ key }) => platformStats[key])
    .filter((stats) => stats?.profileVerified === true)
  const aggregateMetric = (...fields) => {
    const values = verifiedCodingPlatforms
      .map((stats) => {
        const breakdownAvailable = stats.difficultyBreakdownAvailable === true
          || (stats.platform?.toLowerCase() === 'leetcode'
            && ['easySolved', 'mediumSolved', 'hardSolved'].every((field) => numberValue(stats[field]) !== null))
        if (!breakdownAvailable) return null
        const field = fields.find((candidate) => stats[candidate] !== null && stats[candidate] !== undefined)
        return field ? numberValue(stats[field]) : null
      })
      .filter((value) => value !== null)
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null
  }
  const totalValues = verifiedCodingPlatforms
    .map((stats) => numberValue(stats.totalSolved ?? stats.problemsSolved))
    .filter((value) => value !== null)
  const total = totalValues.length ? totalValues.reduce((sum, value) => sum + value, 0) : null
  const easy = aggregateMetric('easySolved')
  const medium = aggregateMetric('mediumSolved')
  const hard = aggregateMetric('hardSolved')
  const platformDifficultyStats = platforms.map((platform) => {
    const stats = platformStats[platform.key]
    const counts = ['easySolved', 'mediumSolved', 'hardSolved'].map((field) => numberValue(stats?.[field]))
    const isLeetCodeBreakdown = platform.key === 'leetcode'
      && counts.every((value) => value !== null)
    const hasDifficultyStats = stats?.profileVerified === true
      && (stats?.difficultyBreakdownAvailable === true || isLeetCodeBreakdown)
      && counts.every((value) => value !== null)
    return { ...platform, stats, counts, hasDifficultyStats }
  })
  const leetcodeDifficultyStats = platformDifficultyStats.find(({ key }) => key === 'leetcode')
  const hasDifficultyStats = leetcodeDifficultyStats?.hasDifficultyStats === true
  const chartDifficultyCounts = hasDifficultyStats ? leetcodeDifficultyStats.counts : [null, null, null]
  const difficultyPanelTotal = hasDifficultyStats
    ? chartDifficultyCounts.reduce((sum, value) => sum + value, 0)
    : null
  const difficultyRows = [
    { key: 'easy', label: 'Easy', value: chartDifficultyCounts[0] },
    { key: 'medium', label: 'Medium', value: chartDifficultyCounts[1] },
    { key: 'hard', label: 'Hard', value: chartDifficultyCounts[2] },
  ]
  const leetcodeReportedTotal = numberValue(leetcodeDifficultyStats?.stats?.totalSolved ?? leetcodeDifficultyStats?.stats?.problemsSolved)
  const leetcodeUnclassifiedTotal = hasDifficultyStats && leetcodeReportedTotal !== null
    ? Math.max(0, leetcodeReportedTotal - difficultyPanelTotal)
    : null
  const studentName = user?.fullName || user?.name || 'Student'
  const departmentLine = [user?.department, user?.year ? `Year ${user.year}` : ''].filter(Boolean).join(' · ')
  const initials = studentName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const searchResults = query.trim()
    ? searchItems.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : []
  const activityItems = Array.isArray(profile?.activity) && profile.activity.length
    ? profile.activity
    : (() => {
      const syncEvents = platforms
        .filter(({ key }) => platformStats[key]?.profileVerified && formatDate(platformStats[key]?.lastUpdated))
        .map(({ key, name }) => ({
          id: `${key}-${new Date(platformStats[key].lastUpdated).getTime()}`,
          title: `${name} profile data synchronized`,
          platform: name,
          timestamp: platformStats[key].lastUpdated,
          kind: 'sync',
        }))
      if (!syncEvents.length && formatDate(profile?.updatedAt)) {
        syncEvents.push({
          id: `coding-profile-${new Date(profile.updatedAt).getTime()}`,
          title: 'Coding profile data updated',
          timestamp: profile.updatedAt,
          kind: 'sync',
        })
      }
      return syncEvents.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)).slice(0, 5)
    })()
  const comparisonMaxValue = Math.max(
    0,
    ...platformDifficultyStats.flatMap(({ hasDifficultyStats: hasCounts, counts }) => hasCounts ? counts : []),
  )
  const comparisonAxisMax = Math.max(4, Math.ceil(comparisonMaxValue / 4) * 4)
  const comparisonTicks = Array.from({ length: 5 }, (_, index) => comparisonAxisMax - (comparisonAxisMax / 4) * index)

  const platformMetrics = (key, stats) => {
    if (key === 'leetcode') {
      return [
        ['Problems solved', stats?.totalSolved ?? stats?.problemsSolved],
        ['Easy solved', stats?.easySolved],
        ['Medium solved', stats?.mediumSolved],
        ['Hard solved', stats?.hardSolved],
      ].filter(([label, value]) => ['Easy', 'Medium', 'Hard'].includes(label) || numberValue(value) !== null)
    }
    if (key === 'codechef') {
      const breakdownAvailable = stats?.difficultyBreakdownAvailable === true
      return [
        ['Rating', stats?.currentRating ?? stats?.contestDetails?.currentRating],
        ['Problems solved', stats?.totalSolved ?? stats?.problemsSolved],
        ['Contests', stats?.contestsParticipated ?? stats?.contestDetails?.contestsParticipated],
        ...(stats?.profileVerified
          ? [
            ['Easy', breakdownAvailable ? stats.easySolved : null],
            ['Medium', breakdownAvailable ? stats.mediumSolved : null],
            ['Hard', breakdownAvailable ? stats.hardSolved : null],
          ]
          : []),
        ...(stats?.profileVerified && !breakdownAvailable
          ? [['Unclassified', stats.unclassifiedSolved ?? stats.totalSolved ?? stats.problemsSolved]]
          : []),
      ].filter(([, value]) => numberValue(value) !== null)
    }
    return (stats?.statistics || [])
      .filter((item) => ['public repositories', 'public repos', 'followers', 'contributions'].includes(item.label?.toLowerCase()))
      .slice(0, 3)
      .map((item) => [item.label, item.value])
  }

  return (
    <div className="coding-page">
      <header className="coding-topbar">
        <div className="coding-search-area">
          <label className="coding-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Search the student portal"
              placeholder="Search anything..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) {
                  navigate(searchResults[0].to)
                  setQuery('')
                }
                if (event.key === 'Escape') setQuery('')
              }}
            />
          </label>
          {query.trim() && (
            <div className="coding-search-results">
              {searchResults.length
                ? searchResults.map((item) => (
                  <button key={item.to} onClick={() => { navigate(item.to); setQuery('') }}>
                    <span>{item.title}<small>{item.detail}</small></span><Icon name="arrow" size={15} />
                  </button>
                ))
                : <div className="coding-search-empty">No matching pages found.</div>}
            </div>
          )}
        </div>
        <div className="coding-topbar-account">
          <Link className="coding-notification-button" to="/student/notifications" aria-label="Notifications">
            <Icon name="bell" size={19} />
            {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
          <Link className="coding-account" to="/student/profile">
            <span className="coding-avatar">{initials || 'S'}</span>
            <span className="coding-account-copy"><strong>{studentName}</strong><small>{departmentLine || 'Student account'}</small></span>
          </Link>
        </div>
      </header>

      <div className="coding-heading">
        <div>
          <span className="coding-breadcrumb">Student Portal <span>/</span> Coding Profile</span>
          <h1>Coding Profile</h1>
          <p>Connect verified public profiles and track your coding progress</p>
        </div>
        <button className="coding-button coding-button-secondary" onClick={refresh} disabled={refreshing || saving}>
          <Icon name="refresh" size={16} />{refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {error && <div className="coding-alert error" role="alert">{error}</div>}
      {info && <div className={`coding-alert ${info.includes('Could not be refreshed') || info.includes('could not be refreshed') ? 'warning' : 'success'}`} role="status">{info}</div>}

      {loading ? (
        <div className="coding-loading" role="status">Loading your coding profile...</div>
      ) : (
        <>
          <section className="coding-summary" aria-label="Coding progress summary">
            <div className="coding-summary-heading">
              <div className="coding-summary-icon"><Icon name="code" size={23} /></div>
              <div>
                <span className="coding-eyebrow"><i /> Verified activity</span>
                <h2>Coding progress</h2>
                <p>{formatDate(profile?.updatedAt) ? `Last updated ${formatDate(profile.updatedAt)}` : 'Connect a profile to start tracking your progress'}</p>
              </div>
            </div>
            <div className="coding-summary-grid">
              {[
                { label: 'Total reported', value: total },
                { label: 'Easy classified', value: easy },
                { label: 'Medium classified', value: medium },
                { label: 'Hard classified', value: hard },
              ].map(({ label, value }) => (
                <div className="coding-summary-stat" key={label}>
                  <span>{label}</span><strong>{displayValue(value)}</strong>
                </div>
              ))}
            </div>
            {verifiedCodingPlatforms.length > 0 && <p className="coding-summary-note">Total sums platform-reported counts; difficulty totals include only classified data.</p>}
          </section>

          <section className="coding-section">
            <div className="coding-section-heading">
              <div><span className="coding-eyebrow">Your accounts</span><h2>Platform profiles</h2></div>
              <span>{verifiedCodingPlatforms.length} connected</span>
            </div>
            <div className="coding-platform-grid">
              {platforms.map((platform) => {
                const { key, name, placeholder, host } = platform
                const stats = platformStats[key]
                const verified = stats?.profileVerified === true
                const rawUrl = form[key] || stats?.profileUrl || ''
                const safeUrl = normalizeProfileUrl(rawUrl, host)
                const isEditing = editingPlatform === key
                const metrics = platformMetrics(key, stats)
                return (
                  <article className={`coding-platform-card ${key}`} key={key}>
                    <div className="coding-card-header">
                      <PlatformLogo platform={platform} />
                      <div className="coding-platform-title">
                        <h3>{name}</h3>
                        <span className={`coding-connection ${verified ? 'is-connected' : rawUrl ? 'needs-verification' : ''}`}><i />{verified ? 'Connected' : rawUrl ? 'Needs verification' : 'Not connected'}</span>
                      </div>
                      {safeUrl && <a className="coding-external-button" href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} profile`}><Icon name="external" size={16} /></a>}
                    </div>
                    {isEditing ? (
                      <form className="coding-edit-form" onSubmit={(event) => { event.preventDefault(); save(key) }}>
                        <label htmlFor={`profile-url-${key}`}>Profile URL</label>
                        <input
                          id={`profile-url-${key}`}
                          type="url"
                          value={form[key] || ''}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, [key]: event.target.value }))
                            setFieldErrors((current) => ({ ...current, [key]: '' }))
                          }}
                          placeholder={placeholder}
                          aria-invalid={Boolean(fieldErrors[key])}
                          aria-describedby={fieldErrors[key] ? `profile-error-${key}` : undefined}
                        />
                        {fieldErrors[key] && <div className="coding-field-error" id={`profile-error-${key}`}>{fieldErrors[key]}</div>}
                        <div className="coding-edit-actions">
                          <button type="button" className="coding-button coding-button-light" onClick={() => {
                            setForm((current) => ({ ...current, [key]: profile?.profileUrls?.[key] || stats?.profileUrl || '' }))
                            setFieldErrors((current) => ({ ...current, [key]: '' }))
                            setEditingPlatform(null)
                          }}>Cancel</button>
                          <button type="submit" className="coding-button coding-button-primary" disabled={saving}>{saving ? 'Verifying...' : 'Save profile'}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="coding-profile-link">
                        <span>Profile URL</span>
                        {safeUrl
                          ? <a href={safeUrl} target="_blank" rel="noopener noreferrer">{rawUrl}<Icon name="external" size={14} /></a>
                          : <span className="coding-unavailable">{rawUrl ? 'This profile URL is invalid.' : 'Add a public profile URL'}</span>}
                      </div>
                    )}
                    <div className="coding-platform-metrics">
                      {metrics.length
                        ? metrics.map(([label, value]) => <div className="coding-platform-metric" key={label}><span>{label}</span><strong>{displayValue(value)}</strong></div>)
                        : <div className="coding-metrics-unavailable">{verified ? 'No supported statistics are currently available.' : 'Verified statistics appear here after connection.'}</div>}
                    </div>
                    {key === 'codechef' && verified && stats?.difficultyBreakdownAvailable !== true && (
                      <p className="coding-difficulty-unavailable">
                        CodeChef provides the profile total and rating, but no reliable per-problem difficulty data is available.
                      </p>
                    )}
                    {stats?.difficultyBreakdownStatus === 'stale' && (
                      <p className="coding-difficulty-unavailable">
                        Showing the last successfully retrieved difficulty counts; the latest refresh did not provide a new breakdown.
                      </p>
                    )}
                    {formatDate(stats?.lastUpdated) && <div className="coding-platform-updated"><Icon name="clock" size={13} /> Updated {formatDate(stats.lastUpdated)}</div>}
                    {!isEditing && <button className="coding-edit-button" onClick={() => startEditing(key)} disabled={saving}><Icon name="edit" size={15} />{rawUrl ? 'Edit Profile' : 'Add Profile'}</button>}
                  </article>
                )
              })}
            </div>
          </section>

          <section className="coding-analytics-grid">
            <article className="coding-panel">
              <div className="coding-panel-heading"><div><span className="coding-eyebrow">Solved problem mix</span><h2>Problem Solved by Difficulty</h2></div><span className="coding-panel-icon"><Icon name="chart" size={18} /></span></div>
              {hasDifficultyStats ? (
                <>
                  <div className="coding-difficulty-body">
                    <div
                      className={`coding-donut${difficultyPanelTotal === 0 ? ' is-empty' : ''}`}
                      role="img"
                      aria-label={`Difficulty distribution: ${difficultyRows.map(({ label, value }) => `${value} ${label}`).join(', ')}`}
                      style={{
                        '--easy-share': `${difficultyPanelTotal > 0 ? chartDifficultyCounts[0] / difficultyPanelTotal * 100 : 0}%`,
                        '--medium-share': `${difficultyPanelTotal > 0 ? (chartDifficultyCounts[0] + chartDifficultyCounts[1]) / difficultyPanelTotal * 100 : 0}%`,
                        '--hard-share': `${difficultyPanelTotal > 0 ? chartDifficultyCounts.reduce((sum, value) => sum + value, 0) / difficultyPanelTotal * 100 : 0}%`,
                      }}
                    >
                      <div><strong>{displayValue(difficultyPanelTotal)}</strong><span>Problems</span></div>
                    </div>
                    <div className="coding-difficulty-legend">
                      {difficultyRows.map(({ key, label, value }) => {
                        const percent = difficultyPanelTotal > 0
                          ? Math.round((value / difficultyPanelTotal) * 100)
                          : 0
                        return <div className={`coding-legend-item ${key}`} key={key}>
                          <span><i />{label}</span>
                          <strong>{displayValue(value)}</strong>
                          <small>{`${percent}%`}</small>
                        </div>
                      })}
                    </div>
                  </div>
                  <p className="coding-chart-caption">
                    {leetcodeUnclassifiedTotal > 0
                      ? `LeetCode difficulty counts; ${leetcodeUnclassifiedTotal} reported problems are not included in the breakdown.`
                      : 'LeetCode difficulty breakdown.'}
                  </p>
                </>
              ) : <EmptyState>Difficulty statistics are unavailable until a connected profile reports Easy, Medium, and Hard counts.</EmptyState>}
            </article>

            <article className="coding-panel">
              <div className="coding-panel-heading">
                <div><span className="coding-eyebrow">Verified difficulty counts</span><h2>Platform Comparison</h2></div>
                <span className="coding-panel-icon"><Icon name="chart" size={18} /></span>
              </div>
              <div className="coding-bar-legend" aria-label="Chart legend">
                {difficultyRows.map(({ key, label }) => <span className={key} key={key}><i />{label}</span>)}
              </div>
              {hasDifficultyStats ? (
                <>
                  <div className="coding-comparison-chart">
                    <svg viewBox="0 0 460 230" role="img" aria-label="Grouped bar chart comparing available Easy, Medium, and Hard counts by platform">
                      <text className="coding-chart-axis-title" x="11" y="15">Solved</text>
                      {comparisonTicks.map((tick, index) => {
                        const y = 25 + index * 37
                        return <g key={`tick-${tick}`}>
                          <line className="coding-chart-gridline" x1="42" y1={y} x2="451" y2={y} />
                          <text className="coding-chart-tick" x="35" y={y + 3} textAnchor="end">{Math.round(tick)}</text>
                        </g>
                      })}
                      {platformDifficultyStats.map((platform, platformIndex) => {
                        const center = 112 + platformIndex * 137
                        return <g key={platform.key}>
                          {platform.hasDifficultyStats ? platform.counts.map((value, seriesIndex) => {
                            const barHeight = value / comparisonAxisMax * 148
                            const x = center + (seriesIndex - 1) * 22 - 9
                            const y = 173 - barHeight
                            return <rect
                              className={`coding-chart-bar ${difficultyRows[seriesIndex].key}`}
                              key={`${platform.key}-${difficultyRows[seriesIndex].key}`}
                              x={x}
                              y={y}
                              width="18"
                              height={Math.max(0, barHeight)}
                              rx="3"
                            />
                          }) : <text className="coding-chart-missing" x={center} y="105" textAnchor="middle">No difficulty data</text>}
                          <text className="coding-chart-platform" x={center} y="198" textAnchor="middle">{platform.name}</text>
                        </g>
                      })}
                      <line className="coding-chart-baseline" x1="42" y1="173" x2="451" y2="173" />
                    </svg>
                  </div>
                  {platformDifficultyStats.some(({ hasDifficultyStats: hasCounts }) => !hasCounts) && (
                    <p className="coding-chart-caption">Difficulty counts are unavailable for {platformDifficultyStats.filter(({ hasDifficultyStats: hasCounts }) => !hasCounts).map(({ name }) => name).join(' and ')}; no bars are estimated.</p>
                  )}
                </>
              ) : <EmptyState>Comparable Easy, Medium, and Hard counts are not available from the connected platforms.</EmptyState>}
            </article>

            <article className="coding-panel coding-activity-panel">
              <div className="coding-panel-heading"><div><span className="coding-eyebrow">From your connected profiles</span><h2>Recent Activity</h2></div><span className="coding-panel-icon"><Icon name="clock" size={18} /></span></div>
              {activityItems.length ? (
                <ul className="coding-activity-list">
                  {activityItems.slice(0, 5).map((item, index) => {
                    const timestamp = item.timestamp || item.createdAt || item.date
                    const platform = platforms.find(({ key, name }) => key === item.platform?.toLowerCase() || name.toLowerCase() === item.platform?.toLowerCase())
                    const difficulty = ['easy', 'medium', 'hard'].includes(item.difficulty?.toLowerCase()) ? item.difficulty : null
                    const isContest = /contest/i.test(`${item.type || ''} ${item.title || ''}`)
                    return <li key={item._id || item.id || `${item.title}-${timestamp || index}`}>
                      <span className={`coding-activity-dot${platform ? ` ${platform.key}` : ''}`}>
                        {platform ? <PlatformLogo platform={platform} className="is-activity-logo" /> : <Icon name="check" size={15} />}
                      </span>
                      <div><strong>{item.title || item.description || 'Profile activity'}</strong><small>{[platform?.name || item.platform, formatDate(timestamp)].filter(Boolean).join(' · ') || item.detail || item.description}</small></div>
                      {difficulty && <span className={`coding-activity-badge ${difficulty.toLowerCase()}`}>{difficulty}</span>}
                      {isContest && <span className="coding-activity-badge contest">Contest</span>}
                    </li>
                  })}
                </ul>
              ) : <EmptyState>No recent profile updates are available yet. Refresh a connected profile to record its latest synchronization time.</EmptyState>}
            </article>
          </section>

          <section className="coding-next-steps">
            <div className="coding-next-heading"><div><span className="coding-eyebrow">Keep building momentum</span><h2>Recommended Next Steps</h2><p>Explore useful ways to keep progressing your coding skills.</p></div></div>
            <div className="coding-recommendation-grid">
              <a className="coding-recommendation medium" href="https://leetcode.com/problemset/?difficulty=MEDIUM" target="_blank" rel="noopener noreferrer">
                <span className="coding-recommendation-icon"><Icon name="chart" size={18} /></span>
                <span><strong>Focus on Medium Problems</strong><small>Strengthen core problem-solving skills with consistent practice.</small><b>Explore problems <Icon name="arrow" size={14} /></b></span>
              </a>
              <Link className="coding-recommendation topics" to="/student/roadmap">
                <span className="coding-recommendation-icon"><Icon name="book" size={18} /></span>
                <span><strong>Practice by Topics</strong><small>Build skills in Arrays, Strings, Trees, Dynamic Programming, and Graphs.</small><b>View learning roadmap <Icon name="arrow" size={14} /></b></span>
              </Link>
              <a className="coding-recommendation contest" href="https://www.codechef.com/contests" target="_blank" rel="noopener noreferrer">
                <span className="coding-recommendation-icon"><Icon name="trophy" size={18} /></span>
                <span><strong>Participate in Contests</strong><small>Practice under time limits and grow your contest experience.</small><b>Explore contests <Icon name="arrow" size={14} /></b></span>
              </a>
              {platformStats.github?.profileVerified && normalizeProfileUrl(platformStats.github.profileUrl, 'github.com')
                ? <a className="coding-recommendation projects" href={normalizeProfileUrl(platformStats.github.profileUrl, 'github.com')} target="_blank" rel="noopener noreferrer">
                  <PlatformLogo platform={platforms.find(({ key }) => key === 'github')} className="is-recommendation-logo" />
                  <span><strong>Build More Projects</strong><small>Showcase your skills and keep your GitHub portfolio active.</small><b>Open GitHub profile <Icon name="arrow" size={14} /></b></span>
                </a>
                : <button className="coding-recommendation projects" onClick={() => startEditing('github')}>
                  <PlatformLogo platform={platforms.find(({ key }) => key === 'github')} className="is-recommendation-logo" />
                  <span><strong>Build More Projects</strong><small>Showcase your skills and keep your GitHub portfolio active.</small><b>Connect GitHub <Icon name="arrow" size={14} /></b></span>
                </button>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
