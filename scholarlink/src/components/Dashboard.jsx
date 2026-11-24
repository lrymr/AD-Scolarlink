import React from 'react'
import '../styles/Dashboard.css'

export default function Dashboard({ profile, scholarships, savedScholarships, grades, checklist }) {
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
  })

  const completedCount = checklist.filter((item) => item.completed).length
  const checklistProgress = (completedCount / checklist.length) * 100 || 0

  return (
    <section aria-label="Dashboard">
      <div className="card">
        <h2>Welcome, {profile.name}!</h2>
        <p>Your academic journey is important. Let's keep track together.</p>
      </div>

      <div className="card dashboard-grid">
        <div>
          <h3>Available Scholarships</h3>
          <p>{scholarships.length} scholarships found</p>
        </div>
        <div>
          <h3>Saved Scholarships</h3>
          <p>{savedScholarships.length}</p>
        </div>
        <div>

          <h3>Upcoming Deadlines (next 30d)</h3>
          <ul>
            {upcomingDeadlines.length === 0 ? (
              <li>No deadlines soon</li>
            ) : (
              upcomingDeadlines.map((sch) => (
                <li key={sch.id}>
                  {sch.name} — {new Date(sch.deadline).toLocaleDateString()}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3>Current Academic Average</h3>
          <p>
            {grades.length > 0 ? `${averageGrade}%` : 'No grades entered yet'}
          </p>
        </div>
        <div>
          <h3>Application Checklist Progress</h3>
          <progress value={completedCount} max={checklist.length} />
          <p>{completedCount} / {checklist.length} completed</p>
        </div>
      </div>
    </section>
  )
}
