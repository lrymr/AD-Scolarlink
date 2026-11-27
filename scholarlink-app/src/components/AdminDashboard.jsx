import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { requestJson } from '../services/api.js'
import '../styles/AdminDashboard.css'

const sections = [
  { id: 'overview', label: 'Campus Overview', icon: 'overview' },
  { id: 'scholarships', label: 'Scholarships', icon: 'scholarships' },
  { id: 'applications', label: 'Applications', icon: 'applications' },
  { id: 'checklists', label: 'User Checklists', icon: 'checklists' },
  { id: 'notifications', label: 'Reminders', icon: 'notifications' },
  { id: 'announcements', label: 'Announcements', icon: 'announcements' },
  { id: 'profile', label: 'Admin Profile', icon: 'profile' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const navIcons = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  scholarships: (
    <>
      <path d="m3 8 9-4 9 4-9 4-9-4Z" />
      <path d="M6 10v5c3.5 2.7 8.5 2.7 12 0v-5" />
      <path d="M21 8v6" />
    </>
  ),
  applications: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  checklists: (
    <>
      <path d="m4 7 1.5 1.5L8 6" />
      <path d="M11 7h9M4 13l1.5 1.5L8 12M11 13h9M4 19l1.5 1.5L8 18M11 19h9" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  announcements: (
    <>
      <path d="m3 11 17-5v12L3 13v-2Z" />
      <path d="M7 14.2 9 20h4l-2.2-4.9M20 10l2-1M20 14l2 1" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.6.9L16 20h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-.9l-1.6.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.6-.9L13.2 7H16l.3 1.8a7.8 7.8 0 0 1 1.7.9l1.6-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.2 2.5Z" />
    </>
  ),
}

function AdminNavIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {navIcons[name]}
    </svg>
  )
}

const initialScholarship = {
  id: '',
  name: '',
  amount: '',
  slots: '',
  deadline: '',
  status: 'Open',
  description: '',
  eligibility: '',
  type: '',
  educationLevel: 'College', 
}

const applicationFilters = ['All', 'New', 'Awarded', 'Not Selected']

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function StatCard({ label, value, className = '' }) {
  return (
    <article className={`admin-stat-card ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </article>
  )
}

export default function AdminDashboard({ admin, onLogout, theme, onToggleTheme }) {
  const [section, setSection] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [highlightedSection, setHighlightedSection] = useState('overview')
  const navigationLinksRef = useRef(null)
  const navigationButtonRefs = useRef({})
  const [dashboard, setDashboard] = useState({ stats: {}, users: [] })
  const [scholarships, setScholarships] = useState([])
  const [applications, setApplications] = useState([])
  const [applicationFilter, setApplicationFilter] = useState('All')
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [profile, setProfile] = useState({
    name: admin.name || '',
    email: admin.email || '',
    title: 'Administrator',
    campus: '',
    department: '',
  })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [checklist, setChecklist] = useState([])
  const [checklistItemName, setChecklistItemName] = useState('')
  const [scholarshipForm, setScholarshipForm] = useState(initialScholarship)
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' })
  const [notificationForm, setNotificationForm] = useState({
    userId: '',
    title: '',
    message: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const students = useMemo(
    () => dashboard.users.filter((user) => user.role === 'student'),
    [dashboard.users]
  )

  const moveNavigationIndicator = useCallback((sectionId) => {
    const navigationLinks = navigationLinksRef.current
    const button = navigationButtonRefs.current[sectionId]
    if (!navigationLinks || !button) return

    const listBounds = navigationLinks.getBoundingClientRect()
    const buttonBounds = button.getBoundingClientRect()
    navigationLinks.style.setProperty(
      '--nav-indicator-x',
      `${buttonBounds.left - listBounds.left + navigationLinks.scrollLeft}px`
    )
    navigationLinks.style.setProperty(
      '--nav-indicator-y',
      `${buttonBounds.top - listBounds.top + navigationLinks.scrollTop}px`
    )
    navigationLinks.style.setProperty('--nav-indicator-width', `${buttonBounds.width}px`)
    navigationLinks.style.setProperty('--nav-indicator-height', `${buttonBounds.height}px`)
    navigationLinks.dataset.indicatorReady = 'true'
    setHighlightedSection(sectionId)
  }, [])

  useLayoutEffect(() => {
    const updateIndicator = () => moveNavigationIndicator(section)
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [moveNavigationIndicator, section, sidebarCollapsed])

  async function refreshDashboard() {
    const data = await requestJson('/admin/dashboard')
    setDashboard({
      stats: data.stats || {},
      users: Array.isArray(data.users) ? data.users : [],
    })
  }

  useEffect(() => {
    let active = true

    Promise.all([
      requestJson('/admin/dashboard'),
      requestJson('/admin/scholarships'),
      requestJson('/admin/announcements'),
      requestJson('/admin/profile'),
    ])
      .then(([dashboardData, scholarshipData, announcementData, profileData]) => {
        if (!active) return
        setDashboard({
          stats: dashboardData.stats || {},
          users: Array.isArray(dashboardData.users) ? dashboardData.users : [],
        })
        setScholarships(Array.isArray(scholarshipData) ? scholarshipData : [])
        setAnnouncements(Array.isArray(announcementData) ? announcementData : [])
        setProfile(profileData)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (section !== 'applications') return

    requestJson(`/admin/applications?status=${encodeURIComponent(applicationFilter)}`)
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message))
  }, [section, applicationFilter])

  useEffect(() => {
    if (section !== 'checklists' || !selectedUserId) {
      setChecklist([])
      return
    }

    requestJson(`/admin/users/${selectedUserId}/checklist`)
      .then((data) => setChecklist(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message))
  }, [section, selectedUserId])

  useEffect(() => {
    if (section !== 'notifications') return

    requestJson('/admin/notifications')
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch((requestError) => setError(requestError.message))
  }, [section])

  async function handleCreateScholarship(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const created = await requestJson('/admin/scholarships', {
        method: 'POST',
        body: JSON.stringify({
          ...scholarshipForm,
          amount: Number(scholarshipForm.amount),
          slots: Number(scholarshipForm.slots),
        }),
      })
      setScholarships((current) => [created, ...current])
      setScholarshipForm(initialScholarship)
      setSuccess('Scholarship added.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDeleteScholarship(id) {
    if (!window.confirm('Delete this scholarship? Existing saved application records will remain.')) return
    setError('')
    setSuccess('')
    try {
      await requestJson(`/admin/scholarships/${id}`, { method: 'DELETE' })
      setScholarships((current) => current.filter((scholarship) => scholarship.id !== id))
      setSuccess('Scholarship deleted.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleApplicationStatus(application, status) {
    setError('')
    try {
      await requestJson(
        `/admin/applications/${application.userId}/${encodeURIComponent(application.scholarshipId)}`,
        { method: 'PATCH', body: JSON.stringify({ status }) }
      )
      setApplications((current) => current.map((item) => (
        item.userId === application.userId && item.scholarshipId === application.scholarshipId
          ? { ...item, status }
          : item
      )))
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleAddChecklistItem(event) {
    event.preventDefault()
    setError('')
    try {
      const created = await requestJson(`/admin/users/${selectedUserId}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ name: checklistItemName }),
      })
      setChecklist((current) => [...current, created])
      setChecklistItemName('')
      setSuccess('Checklist item added.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDeleteChecklistItem(itemId) {
    setError('')
    try {
      await requestJson(`/admin/users/${selectedUserId}/checklist/${itemId}`, {
        method: 'DELETE',
      })
      setChecklist((current) => current.filter((item) => item.id !== itemId))
      setSuccess('Checklist item deleted.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDeleteStudent(student) {
    const confirmed = window.confirm(
      `Permanently delete ${student.name}'s account and all associated applications, profile, grades, checklist items, and notifications? This cannot be undone.`
    )
    if (!confirmed) return

    setError('')
    setSuccess('')
    try {
      await requestJson(`/admin/users/${student.id}`, { method: 'DELETE' })
      setDashboard((current) => ({
        ...current,
        users: current.users.filter((user) => user.id !== student.id),
      }))
      setSuccess(`${student.name}'s account and associated records were deleted.`)

      try {
        await refreshDashboard()
      } catch (requestError) {
        setError(`Account deleted, but dashboard statistics could not be refreshed: ${requestError.message}`)
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleSendNotification(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const created = await requestJson('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          ...notificationForm,
          userId: Number(notificationForm.userId),
        }),
      })
      setNotificationForm((current) => ({
        ...current,
        title: '',
        message: '',
      }))
      setSuccess('Reminder sent to the student’s notification inbox.')
      setNotifications((current) => [{
        ...created,
        studentName: students.find((student) => student.id === created.userId)?.name,
        created_at: new Date().toISOString(),
      }, ...current])
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleCreateAnnouncement(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const created = await requestJson('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementForm),
      })
      setAnnouncements((current) => [created, ...current])
      setAnnouncementForm({ title: '', message: '' })
      setSuccess('Announcement published.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handlePinAnnouncement(announcement) {
    setError('')
    try {
      const pinned = !announcement.pinned
      await requestJson(`/admin/announcements/${announcement.id}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned }),
      })
      setAnnouncements((current) => current
        .map((item) => item.id === announcement.id ? { ...item, pinned } : item)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.id - a.id))
      setSuccess(pinned ? 'Announcement pinned.' : 'Announcement unpinned.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDeleteAnnouncement(id) {
    setError('')
    try {
      await requestJson(`/admin/announcements/${id}`, { method: 'DELETE' })
      setAnnouncements((current) => current.filter((item) => item.id !== id))
      setSuccess('Announcement deleted.')
      await refreshDashboard()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const updated = await requestJson('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      })
      setProfile(updated)
      localStorage.setItem('scholarlink_user', JSON.stringify({ ...admin, ...updated }))
      setSuccess('Administrator profile updated.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    try {
      await requestJson('/admin/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Administrator password changed.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function updateScholarshipForm(event) {
    const { name, value } = event.target
    setScholarshipForm((current) => ({ ...current, [name]: value }))
  }

  function updateProfile(event) {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
  }

  function updatePasswordForm(event) {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="admin-shell" data-theme={theme} data-sidebar-collapsed={sidebarCollapsed}>
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">SL</span>
          <div className="admin-brand-copy">
            <strong>ScholarLink</strong>
            <span>Administration workspace</span>
          </div>
        </div>
        <div className="admin-header-actions">
          <div className="admin-header-profile">
            <span className="admin-avatar" aria-hidden="true">
              {(profile.name || admin.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="admin-header-profile-copy">
              <strong>{profile.name || admin.name}</strong>
              <small>{profile.title || 'Administrator'}</small>
            </span>
          </div>
          <button
            type="button"
            className={`theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
            onClick={onToggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'NIGHT' : 'DAY'}</span>
          </button>
          <button type="button" className="admin-logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-sidebar-heading">
            <p className="admin-sidebar-label">WORKSPACE</p>
            <button
              type="button"
              className="admin-sidebar-toggle"
              aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="admin-sidebar-links"
              title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>
          <div
            className="admin-sidebar-links"
            id="admin-sidebar-links"
            ref={navigationLinksRef}
            onMouseLeave={() => moveNavigationIndicator(section)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                moveNavigationIndicator(section)
              }
            }}
          >
            {sections.map((item) => (
              <button
                key={item.id}
                ref={(element) => { navigationButtonRefs.current[item.id] = element }}
                type="button"
                className={[
                  section === item.id ? 'active' : '',
                  highlightedSection === item.id ? 'is-highlighted' : '',
                ].filter(Boolean).join(' ')}
                aria-current={section === item.id ? 'page' : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                onMouseEnter={() => moveNavigationIndicator(item.id)}
                onFocus={() => moveNavigationIndicator(item.id)}
                onClick={() => {
                  setSection(item.id)
                  setError('')
                  setSuccess('')
                }}
              >
                <span className="admin-nav-icon"><AdminNavIcon name={item.icon} /></span>
                <span className="admin-nav-label">{item.label}</span>
                {highlightedSection === item.id && <span className="admin-nav-active-mark" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="admin-sidebar-footer">
            <span className="admin-sidebar-status" aria-hidden="true" />
            <div>
              <strong>ScholarLink</strong>
              <span>Campus management</span>
            </div>
          </div>
        </nav>

        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">ScholarLink · Administration</p>
              <h1>{sections.find((item) => item.id === section)?.label}</h1>
            </div>
          </div>

          {error && <div className="admin-error" role="alert">{error}</div>}
          {success && <div className="admin-success" role="status">{success}</div>}
          {loading ? (
            <p>Loading admin data...</p>
          ) : (
            <>
              {section === 'overview' && (
                <div className="admin-overview-grid">
                  <div className="admin-overview-primary">
                    <StatCard
                      className="admin-stat-card-featured admin-stat-card-applicants"
                      label="Student applicants"
                      value={dashboard.stats.applicants}
                    />

                    <section className="admin-panel admin-applicants-panel">
                      <h2>Campus Applicants</h2>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Email</th>
                              <th>School</th>
                              <th>Grade level</th>
                              <th>Applications</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student) => (
                              <tr key={student.id}>
                                <td>{student.name}</td>
                                <td>{student.email}</td>
                                <td>{student.school || '—'}</td>
                                <td>{student.gradeLevel || '—'}</td>
                                <td>{student.applicationCount || 0}</td>
                                <td>
                                  <button
                                    className="admin-danger-button"
                                    type="button"
                                    onClick={() => handleDeleteStudent(student)}
                                    aria-label={`Delete ${student.name}'s account`}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {students.length === 0 && (
                              <tr><td colSpan="6">No student accounts found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  <div className="admin-overview-secondary">
                    <StatCard
                      className="admin-stat-card-applications"
                      label="Applications"
                      value={dashboard.stats.applications}
                    />
                    <StatCard
                      className="admin-stat-card-awarded"
                      label="Awarded"
                      value={dashboard.stats.awardedApplications}
                    />
                    <StatCard
                      className="admin-stat-card-pending"
                      label="Awaiting decision"
                      value={dashboard.stats.pendingApplications}
                    />
                    <StatCard
                      className="admin-stat-card-scholarships"
                      label="Scholarship programs"
                      value={dashboard.stats.scholarships}
                    />
                    <StatCard
                      className="admin-stat-card-students"
                      label="Students"
                      value={dashboard.stats.students}
                    />
                  </div>
                </div>
              )}

              {section === 'scholarships' && (
                <>
                  <section className="admin-panel">
                    <h2>Add scholarship program</h2>
                    <form className="admin-form admin-form-grid" onSubmit={handleCreateScholarship}>
                      <label>
                        Scholarship name
                        <input name="name" value={scholarshipForm.name} onChange={updateScholarshipForm} required />
                      </label>
                      <label>
                        Amount per award (₱)
                        <input name="amount" type="number" min="1" step="0.01" value={scholarshipForm.amount} onChange={updateScholarshipForm} required />
                      </label>
                      <label>
                        Slots available
                        <input name="slots" type="number" min="1" step="1" value={scholarshipForm.slots} onChange={updateScholarshipForm} required />
                      </label>
                      <label>
                        Deadline
                        <input name="deadline" type="date" value={scholarshipForm.deadline} onChange={updateScholarshipForm} required />
                      </label>
                      <label>
                        Status
                        <select name="status" value={scholarshipForm.status} onChange={updateScholarshipForm}>
                          <option>Open</option>
                          <option>Closed</option>
                        </select>
                      </label>
                      <label>
                        Type
                        <select name="type" value={scholarshipForm.type} onChange={updateScholarshipForm}>
                          <option>Government</option>
                          <option>University</option>
                          <option>Private</option>
                        </select>
                      </label>
                      <label>
                        Education level
                        <select name="educationLevel" value={scholarshipForm.educationLevel} onChange={updateScholarshipForm}>
                          <option>College</option>
                          <option>SCHS</option>
                        </select>
                      </label>
                      <label className="admin-form-wide">
                        Details / description
                        <textarea name="description" rows="3" value={scholarshipForm.description} onChange={updateScholarshipForm} required />
                      </label>
                      <label className="admin-form-wide">
                        Eligibility / who can apply
                        <textarea name="eligibility" rows="3" value={scholarshipForm.eligibility} onChange={updateScholarshipForm} required />
                      </label>
                      <button type="submit">Add scholarship</button>
                    </form>
                  </section>

                  <section className="admin-panel">
                    <h2>Scholarship programs</h2>
                    <div className="admin-record-list">
                      {scholarships.map((scholarship) => (
                        <article className="admin-record" key={scholarship.id}>
                          <div>
                            <h3>{scholarship.name}</h3>
                            <p>₱{Number(scholarship.amount).toLocaleString()} per award · {scholarship.slots} slots</p>
                            <p>Deadline: {formatDate(scholarship.deadline)} · {scholarship.status}</p>
                            <p>Type: {scholarship.type} · Education level: {scholarship.educationLevel}</p>
                            <p>{scholarship.description}</p>
                            <p><strong>Eligibility:</strong> {scholarship.eligibility}</p>
                          </div>
                          <button className="admin-danger-button" type="button" onClick={() => handleDeleteScholarship(scholarship.id)}>
                            Delete
                          </button>
                        </article>
                      ))}
                      {scholarships.length === 0 && <p>No scholarships have been added.</p>}
                    </div>
                  </section>
                </>
              )}

              {section === 'applications' && (
                <section className="admin-panel">
                  <div className="admin-section-heading">
                    <h2>Applications</h2>
                    <div className="admin-filter-tabs" role="tablist" aria-label="Filter applications">
                      {applicationFilters.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          className={applicationFilter === filter ? 'active' : ''}
                          onClick={() => setApplicationFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Email</th>
                          <th>Scholarship</th>
                          <th>Deadline</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((application) => (
                          <tr key={`${application.userId}-${application.scholarshipId}`}>
                            <td>{application.applicantName}</td>
                            <td>{application.applicantEmail}</td>
                            <td>{application.scholarshipName}</td>
                            <td>{formatDate(application.deadline)}</td>
                            <td>
                              <select
                                aria-label={`Application status for ${application.applicantName}`}
                                value={['New', 'Awarded', 'Not Selected'].includes(application.status) ? application.status : 'New'}
                                onChange={(event) => handleApplicationStatus(application, event.target.value)}
                              >
                                <option>New</option>
                                <option>Awarded</option>
                                <option>Not Selected</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {applications.length === 0 && (
                          <tr><td colSpan="5">No applications in this view.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {section === 'checklists' && (
                <section className="admin-panel">
                  <h2>Manage a student checklist</h2>
                  <label className="admin-student-select">
                    Select student
                    <select
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                    >
                      <option value="">Choose a student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} · {student.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedUserId && (
                    <>
                      <form className="admin-inline-form" onSubmit={handleAddChecklistItem}>
                        <input
                          value={checklistItemName}
                          onChange={(event) => setChecklistItemName(event.target.value)}
                          placeholder="New requirement"
                          aria-label="New checklist requirement"
                          required
                        />
                        <button type="submit">Add item</button>
                      </form>
                      <ul className="admin-checklist">
                        {checklist.map((item) => (
                          <li key={item.id}>
                            <span>{item.completed ? '✓' : '○'} {item.name}</span>
                            <button className="admin-danger-button" type="button" onClick={() => handleDeleteChecklistItem(item.id)}>
                              Delete
                            </button>
                          </li>
                        ))}
                        {checklist.length === 0 && <li>No checklist requirements for this student.</li>}
                      </ul>
                    </>
                  )}
                </section>
              )}

              {section === 'notifications' && (
                <>
                  <section className="admin-panel">
                    <h2>Send a student reminder</h2>
                    <form className="admin-form" onSubmit={handleSendNotification}>
                      <label>
                        Student
                        <select
                          value={notificationForm.userId}
                          onChange={(event) => setNotificationForm((current) => ({ ...current, userId: event.target.value }))}
                          required
                        >
                          <option value="">Choose a student</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name} · {student.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Reminder title
                        <input
                          value={notificationForm.title}
                          onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Message
                        <textarea
                          rows="3"
                          value={notificationForm.message}
                          onChange={(event) => setNotificationForm((current) => ({ ...current, message: event.target.value }))}
                          placeholder="Pending requirements, deadlines, or application updates"
                          required
                        />
                      </label>
                      <button type="submit">Send reminder</button>
                    </form>
                  </section>
                  <section className="admin-panel">
                    <h2>Recent reminders</h2>
                    <div className="admin-record-list">
                      {notifications.map((notification) => (
                        <article className="admin-record" key={notification.id}>
                          <div>
                            <h3>{notification.title}</h3>
                            <p>To: {notification.studentName} · {notification.studentEmail}</p>
                            <p>{notification.message}</p>
                            <small>{formatDate(notification.created_at)}</small>
                          </div>
                        </article>
                      ))}
                      {notifications.length === 0 && <p>No reminders sent yet.</p>}
                    </div>
                  </section>
                </>
              )}

              {section === 'announcements' && (
                <>
                  <section className="admin-panel">
                    <h2>Publish an announcement</h2>
                    <form className="admin-form" onSubmit={handleCreateAnnouncement}>
                      <label>
                        Title
                        <input
                          value={announcementForm.title}
                          onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Message
                        <textarea
                          rows="4"
                          value={announcementForm.message}
                          onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))}
                          required
                        />
                      </label>
                      <button type="submit">Publish announcement</button>
                    </form>
                  </section>
                  <section className="admin-panel">
                    <h2>Manage announcements</h2>
                    <div className="admin-record-list">
                      {announcements.map((announcement) => (
                        <article className={`admin-record ${announcement.pinned ? 'pinned' : ''}`} key={announcement.id}>
                          <div>
                            <h3>{announcement.pinned && <span aria-label="Pinned">📌 </span>}{announcement.title}</h3>
                            <p>{announcement.message}</p>
                            <small>{formatDate(announcement.created_at)}</small>
                          </div>
                          <div className="admin-record-actions">
                            <button type="button" onClick={() => handlePinAnnouncement(announcement)}>
                              {announcement.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button className="admin-danger-button" type="button" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                      {announcements.length === 0 && <p>No announcements published.</p>}
                    </div>
                  </section>
                </>
              )}

              {section === 'profile' && (
                <section className="admin-panel">
                  <h2>Administrator profile</h2>
                  <form className="admin-form admin-form-grid" onSubmit={handleSaveProfile}>
                    <label>
                      Name
                      <input name="name" value={profile.name} onChange={updateProfile} required />
                    </label>
                    <label>
                      Contact email
                      <input name="email" type="email" value={profile.email} onChange={updateProfile} required />
                    </label>
                    <label>
                      Role / title
                      <input name="title" value={profile.title} onChange={updateProfile} required />
                    </label>
                    <label>
                      Campus
                      <input name="campus" value={profile.campus} onChange={updateProfile} />
                    </label>
                    <label className="admin-form-wide">
                      Department
                      <input name="department" value={profile.department} onChange={updateProfile} />
                    </label>
                    <button type="submit">Save profile</button>
                  </form>
                </section>
              )}

              {section === 'settings' && (
                <section className="admin-panel admin-password-panel">
                  <h2>Change password</h2>
                  <p className="admin-panel-description">
                    Update your administrator password. Use at least 12 characters.
                  </p>
                  <form className="admin-form" onSubmit={handleChangePassword}>
                    <label>
                      Current password
                      <input name="currentPassword" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={updatePasswordForm} required />
                    </label>
                    <label>
                      New password
                      <input name="newPassword" type="password" autoComplete="new-password" minLength="12" value={passwordForm.newPassword} onChange={updatePasswordForm} required />
                    </label>
                    <label>
                      Confirm new password
                      <input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" value={passwordForm.confirmPassword} onChange={updatePasswordForm} required />
                    </label>
                    <button type="submit">Change password</button>
                  </form>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
