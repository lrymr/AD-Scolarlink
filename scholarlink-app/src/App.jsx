
import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard.jsx'
import ScholarshipDirectory from './components/ScholarshipDirectory.jsx'
import ScholarshipNotifier from './components/ScholarshipNotifier.jsx'
import GradeTracker from './components/GradeTracker.jsx'
import PathFinder from './components/PathFinder.jsx'
import SavedScholarships from './components/SavedScholarships.jsx'
import ApplicationChecklist from './components/ApplicationChecklist.jsx'
import StudentProfile from './components/StudentProfile.jsx'
import Navigation from './components/Navigation.jsx'
import AuthContainer from './components/AuthContainer.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import StudentNotifications from './components/StudentNotifications.jsx'
import StudentAnnouncements from './components/StudentAnnouncements.jsx'

const API_URL = '/api'

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('scholarlink_token')
  const headers = new Headers(options.headers || {})

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export default function App() {
  const [currentSection, setCurrentSection] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState(() => (
    localStorage.getItem('scholarlink_theme') === 'dark' ? 'dark' : 'light'
  ))

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('scholarlink_user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [profile, setProfile] = useState({
    name: '',
    school: '',
    gradeLevel: '',
    strand: '',
    targetCourse: '',
  })

  const [savedScholarships, setSavedScholarships] = useState([])
  const [grades, setGrades] = useState([])
  const [checklist, setChecklist] = useState([])
  const [adminScholarships, setAdminScholarships] = useState([])
  const [notifications, setNotifications] = useState([])
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    if (!user || user.role === 'admin') return

    Promise.all([
      apiFetch('/profile')
        .then((data) => setProfile(data || {
          name: '',
          school: '',
          gradeLevel: '',
          strand: '',
          targetCourse: '',
        }))
        .catch(() => setProfile({
          name: '',
          school: '',
          gradeLevel: '',
          strand: '',
          targetCourse: '',
        })),

      apiFetch('/saved-scholarships')
        .then((data) => setSavedScholarships(Array.isArray(data) ? data : []))
        .catch(() => setSavedScholarships([])),

      apiFetch('/grades')
        .then((data) => setGrades(Array.isArray(data) ? data : []))
        .catch(() => setGrades([])),

      apiFetch('/checklist')
        .then((data) => setChecklist(Array.isArray(data) ? data : []))
        .catch(() => setChecklist([])),

      apiFetch('/scholarships')
        .then((data) => setAdminScholarships(Array.isArray(data) ? data : []))
        .catch(() => setAdminScholarships([])),

      apiFetch('/notifications')
        .then((data) => setNotifications(Array.isArray(data) ? data : []))
        .catch(() => setNotifications([])),

      apiFetch('/announcements')
        .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
        .catch(() => setAnnouncements([])),
    ])
  }, [user])

  async function handleProfileUpdate(newProfile) {
    const data = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(newProfile),
    })

    const nextProfile = data.profile || newProfile
    setProfile(nextProfile)
    return nextProfile
  }

  async function handleToggleSavedScholarship(scholarship) {
    const exists = savedScholarships.some((item) => item.id === scholarship.id)

    if (exists) {
      const updated = savedScholarships.filter((item) => item.id !== scholarship.id)
      setSavedScholarships(updated)

      await apiFetch(`/saved-scholarships/${scholarship.id}`, {
        method: 'DELETE',
      })

      return
    }

    const next = { ...scholarship, applicationStatus: 'Interested' }

    setSavedScholarships((current) => [...current, next])

    await apiFetch('/saved-scholarships', {
      method: 'POST',
      body: JSON.stringify(next),
    })
  }

  async function handleUpdateSavedScholarshipStatus(id, status) {
    const updated = savedScholarships.map((item) =>
      item.id === id ? { ...item, applicationStatus: status } : item
    )

    setSavedScholarships(updated)

    await apiFetch(`/saved-scholarships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ applicationStatus: status }),
    })
  }

  async function handleRemoveSavedScholarship(id) {
    setSavedScholarships((current) =>
      current.filter((item) => item.id !== id)
    )

    await apiFetch(`/saved-scholarships/${id}`, {
      method: 'DELETE',
    })
  }

  async function handleAddGrade(newGrade) {
    const created = await apiFetch('/grades', {
      method: 'POST',
      body: JSON.stringify(newGrade),
    })

    setGrades((current) => [created, ...current])
  }

  async function handleRemoveGrade(id) {
    setGrades((current) => current.filter((item) => item.id !== id))

    await apiFetch(`/grades/${id}`, {
      method: 'DELETE',
    })
  }

  async function handleAddChecklistItem(name) {
    const created = await apiFetch('/checklist', {
      method: 'POST',
      body: JSON.stringify({ name, completed: false }),
    })

    setChecklist((current) => [...current, created])
  }

  async function handleToggleChecklistItem(id, completed) {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed } : item
    )

    setChecklist(updated)

    await apiFetch(`/checklist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    })
  }

  function handleLogout() {
    localStorage.removeItem('scholarlink_token')
    localStorage.removeItem('scholarlink_user')
    setUser(null)
    setCurrentSection('dashboard')
  }

  function handleToggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('scholarlink_theme', nextTheme)
    setTheme(nextTheme)
  }

  const scholarships = adminScholarships

  if (!user) {
    return (
      <AuthContainer
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    )
  }

  if (user.role === 'admin') {
    return (
      <AdminDashboard
        admin={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    )
  }

  return (
    <div className="app-container" data-theme={theme}>
      <div className="student-app-shell">
        <aside className="student-sidebar" data-sidebar-collapsed={sidebarCollapsed}>
          <div className="student-brand">
            <img
              className="student-brand-logo"
              src={`${process.env.PUBLIC_URL}/scholarlink-logo.png`}
              alt=""
            />
            <span className="student-brand-copy">
              <strong>ScholarLink</strong>
              <small>STUDENT PORTAL</small>
            </span>
          </div>
          <Navigation
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
          <div className="student-sidebar-footer">
            <span className="student-sidebar-footer-mark" aria-hidden="true">✦</span>
            <span>Make your next move</span>
          </div>
        </aside>

        <div className="student-workspace">
          <header className="student-header">
            <span>
              Welcome, <strong>{user.name}</strong>!
            </span>
            <div className="student-header-actions">
              <button
                type="button"
                className={`theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
                onClick={handleToggleTheme}
                aria-pressed={theme === 'dark'}
                aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
              >
                <span className="theme-toggle-track" aria-hidden="true">
                  <span className="theme-toggle-thumb" />
                </span>
                <span className="theme-toggle-label">{theme === 'dark' ? 'NIGHT' : 'DAY'}</span>
              </button>
              <button type="button" className="student-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <main className="student-main">
            {currentSection === 'dashboard' && (
              <Dashboard
                profile={profile}
                scholarships={scholarships}
                savedScholarships={savedScholarships}
                grades={grades}
                checklist={checklist}
                onNavigate={setCurrentSection}
              />
            )}

            {currentSection === 'directory' && (
              <ScholarshipDirectory
                scholarships={scholarships}
                savedScholarships={savedScholarships}
                toggleSave={handleToggleSavedScholarship}
              />
            )}

            {currentSection === 'notifier' && (
              <ScholarshipNotifier
                scholarships={scholarships}
                savedScholarships={savedScholarships}
              />
            )}

            {currentSection === 'grades' && (
              <GradeTracker
                grades={grades}
                onAddGrade={handleAddGrade}
                onRemoveGrade={handleRemoveGrade}
              />
            )}

            {currentSection === 'pathfinder' && (
              <PathFinder grades={grades} />
            )}

            {currentSection === 'saved' && (
              <SavedScholarships
                savedScholarships={savedScholarships}
                onUpdateStatus={handleUpdateSavedScholarshipStatus}
                onRemoveScholarship={handleRemoveSavedScholarship}
              />
            )}

            {currentSection === 'checklist' && (
              <ApplicationChecklist
                checklist={checklist}
                onAddItem={handleAddChecklistItem}
                onToggleItem={handleToggleChecklistItem}
              />
            )}

            {currentSection === 'profile' && (
              <StudentProfile
                profile={profile}
                updateProfile={handleProfileUpdate}
              />
            )}

            {currentSection === 'notifications' && (
              <StudentNotifications notifications={notifications} />
            )}

            {currentSection === 'announcements' && (
              <StudentAnnouncements announcements={announcements} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
