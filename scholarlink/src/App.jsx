
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

const API_URL = 'http://localhost:5000/api'

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

  useEffect(() => {
    if (!user) return

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

  const sampleScholarships = [
    {
      id: 'ched-scholars',
      name: 'CHED Scholarship Program',
      description: 'Financial support for college students by CHED.',
      eligibility: 'Senior High students with good grades.',
      benefits: 'Monthly stipend, tuition discounts.',
      deadline: '2026-11-30',
      type: 'Government',
      educationLevel: 'College',
      needsVerification: false,
      officialLink: 'https://ched.gov.ph/scholarships',
    },
    {
      id: 'dost-sei',
      name: 'DOST-SEI Undergraduate Scholarship',
      description: 'For students pursuing Science and Tech courses.',
      eligibility: 'Must have completed SHS, STEM fields.',
      benefits: 'Full tuition, stipend, book allowance.',
      deadline: '2026-10-15',
      type: 'Government',
      educationLevel: 'College',
      needsVerification: false,
      officialLink: 'https://dost.gov.ph/sei-scholarships',
    },
    {
      id: 'university-merit',
      name: 'University Merit Scholarship',
      description: 'Awarded to top-performing students in the university.',
      eligibility: 'Must have a high GPA and be in good standing.',
      benefits: 'Full tuition, stipend, book allowance.',
      deadline: '2026-12-31',
      type: 'University',
      educationLevel: 'College',
      needsVerification: false,
      officialLink: 'https://university.edu/scholarships',
    },
    {
      id: 'Government-College-Scholarship',
      name: 'Provincial Goverments College Scolarship Program (PGCSP)',
      description: 'For students who are lacking financial support but have good grades.',
      eligibility: 'Must be enrolled in a technology-related course.',
      benefits: 'Full tuition, stipend, book allowance.',
      deadline: '2026-11-30',
      type: 'Private',
      educationLevel: 'College',
      needsVerification: false,
      officialLink: 'https://privatetech.edu/scholarships',
    },
  ]

  if (!user) {
    return (
      <AuthContainer
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    )
  }

  return (
    <div className="app-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          background: '#f0eaf8',
        }}
      >
        <span>
          Welcome, <strong>{user.name}</strong>!
        </span>

        <button
          onClick={handleLogout}
          style={{
            background: '#d9534f',
            padding: '0.3rem 0.8rem',
            fontSize: '0.85rem',
          }}
        >
          Logout
        </button>
      </div>

      <Navigation
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
      />

      <main>
        {currentSection === 'dashboard' && (
          <Dashboard
            profile={profile}
            scholarships={sampleScholarships}
            savedScholarships={savedScholarships}
            grades={grades}
            checklist={checklist}
          />
        )}

        {currentSection === 'directory' && (
          <ScholarshipDirectory
            scholarships={sampleScholarships}
            savedScholarships={savedScholarships}
            toggleSave={handleToggleSavedScholarship}
          />
        )}

        {currentSection === 'notifier' && (
          <ScholarshipNotifier
            scholarships={sampleScholarships}
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
      </main>

      <footer className="footer">
        ScholarLink © 2026 | Powered by Philippine Student Support
      </footer>
    </div>
  )
}
