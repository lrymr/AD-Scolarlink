import React from 'react'
import '../styles/Dashboard.css'

export default function Dashboard({ profile, scholarships, savedScholarships, grades, checklist, onNavigate }) {
  const averageGrade =
    grades.length === 0
      ? 0
      : (grades.reduce((acc, g) => acc + Number(g.grade), 0) / grades.length).toFixed(2)

  const today = new Date()
  const upcomingDeadlines = scholarships.filter((sch) => {
    if (!sch.deadline) return false
    const deadlineDate = new Date(sch.deadline)
    const diffDays = (deadlineDate - today) / (1000 * 3600 * 24)
    return diffDays >= 0 && diffDays <= 30
  }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))

  const completedCount = checklist.filter((item) => item.completed).length
  const checklistProgress = (completedCount / checklist.length) * 100 || 0
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Student'

  const progressRadius = 38
  const progressCircumference = 2 * Math.PI * progressRadius
  const progressOffset = progressCircumference - (checklistProgress / 100) * progressCircumference

  return (
    <section className="student-dashboard" aria-label="Student dashboard">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">STUDENT OVERVIEW</p>
          <h1>Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}</h1>
          <p>Here is what needs your attention today.</p>
        </div>
        <button type="button" className="dashboard-primary-action" onClick={() => onNavigate('directory')}>
          Explore scholarships
        </button>
      </div>

      <div className="dashboard-kpi-grid">
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">S</span>
          <div>
            <p>Available scholarships</p>
            <strong>{scholarships.length}</strong>
            <small>Opportunities to explore</small>
          </div>
        </article>
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">★</span>
          <div>
            <p>Saved scholarships</p>
            <strong>{savedScholarships.length}</strong>
            <small>Your shortlisted options</small>
          </div>
        </article>
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">A</span>
          <div>
            <p>Academic average</p>
            <strong>{grades.length > 0 ? `${averageGrade}%` : '—'}</strong>
            <small>{grades.length > 0 ? 'Based on your grade tracker' : 'No grades entered yet'}</small>
          </div>
        </article>
        <article className="dashboard-kpi-card">
          <span className="dashboard-kpi-icon" aria-hidden="true">✓</span>
          <div>
            <p>Checklist progress</p>
            <strong>{Math.round(checklistProgress)}%</strong>
            <small>{completedCount} of {checklist.length} completed</small>
          </div>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <article className="dashboard-panel dashboard-deadlines">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-eyebrow">NEXT 30 DAYS</p>
              <h2>Upcoming deadlines</h2>
            </div>
            <button type="button" onClick={() => onNavigate('notifier')}>View all</button>
          </div>
          <div className="dashboard-deadline-list">
            {upcomingDeadlines.length === 0 ? (
              <div className="dashboard-empty">
                <span aria-hidden="true">○</span>
                <p>No deadlines are coming up soon.</p>
              </div>
            ) : (
              upcomingDeadlines.slice(0, 4).map((sch) => {
                const deadlineDate = new Date(sch.deadline)
                const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 3600 * 24))
                return (
                  <button type="button" className="dashboard-deadline-row" key={sch.id} onClick={() => onNavigate('directory')}>
                    <span className="dashboard-date">
                      <strong>{deadlineDate.getDate()}</strong>
                      <small>{deadlineDate.toLocaleDateString(undefined, { month: 'short' })}</small>
                    </span>
                    <span className="dashboard-deadline-copy">
                      <strong>{sch.name}</strong>
                      <small>{daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}</small>
                    </span>
                    <span className="dashboard-row-arrow" aria-hidden="true">›</span>
                  </button>
                )
              })
            )}
          </div>
        </article>

        <article className="dashboard-panel dashboard-progress">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-eyebrow">APPLICATION</p>
              <h2>Checklist</h2>
            </div>
          </div>
          <div className="dashboard-progress-body">
            <div className="dashboard-progress-ring" style={{ '--progress': `${checklistProgress * 3.6}deg` }}>
              <svg viewBox="0 0 96 96" aria-hidden="true">
                <circle className="dashboard-progress-track" cx="48" cy="48" r={progressRadius} />
                <circle
                  className="dashboard-progress-value"
                  cx="48"
                  cy="48"
                  r={progressRadius}
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                />
              </svg>
              <strong>{Math.round(checklistProgress)}%</strong>
            </div>
            <div className="dashboard-progress-copy">
              <strong>{completedCount} completed</strong>
              <p>{checklist.length - completedCount} task{checklist.length - completedCount === 1 ? '' : 's'} remaining</p>
              <button type="button" onClick={() => onNavigate('checklist')}>Open checklist</button>
            </div>
          </div>
        </article>
      </div>

      <div className="dashboard-bottom-grid">
        <article className="dashboard-panel dashboard-saved">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-eyebrow">SHORTLIST</p>
              <h2>Saved scholarships</h2>
            </div>
            <button type="button" onClick={() => onNavigate('saved')}>View all</button>
          </div>
          {savedScholarships.length === 0 ? (
            <div className="dashboard-empty dashboard-empty-inline">
              <span aria-hidden="true">☆</span>
              <p>Save scholarships to keep them organized here.</p>
            </div>
          ) : (
            <div className="dashboard-saved-list">
              {savedScholarships.slice(0, 3).map((scholarship) => (
                <button type="button" key={scholarship.id} onClick={() => onNavigate('saved')}>
                  <span className="dashboard-saved-mark" aria-hidden="true">S</span>
                  <span>
                    <strong>{scholarship.name}</strong>
                    <small>{scholarship.applicationStatus || 'Interested'}</small>
                  </span>
                  <span className="dashboard-row-arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-quick">
          <div className="dashboard-panel-heading">
            <div>
              <p className="dashboard-eyebrow">SHORTCUTS</p>
              <h2>Quick actions</h2>
            </div>
          </div>
          <div className="dashboard-action-grid">
            <button type="button" onClick={() => onNavigate('grades')}><span aria-hidden="true">A+</span><strong>Grade tracker</strong></button>
            <button type="button" onClick={() => onNavigate('pathfinder')}><span aria-hidden="true">⌁</span><strong>Find a path</strong></button>
            <button type="button" onClick={() => onNavigate('profile')}><span aria-hidden="true">●</span><strong>Update profile</strong></button>
          </div>
        </article>
      </div>
    </section>
  )
}
