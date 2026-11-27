import React from 'react'
import '../styles/ScholarshipNotifier.css'

export default function ScholarshipNotifier({ scholarships, savedScholarships }) {
  const today = new Date()

  // Upcoming deadlines for saved scholarships within 7 days
  const upcomingSavedDeadlines = savedScholarships.filter((sch) => {
    if (!sch.deadline) return false
    const deadlineDate = new Date(sch.deadline)
    const diffDays = (deadlineDate - today) / (1000 * 3600 * 24)
    return diffDays >= 0 && diffDays <= 7
  })

  return (
    <section aria-label="Scholarship Notifier">
      <h2>Deadline Reminders</h2>

      {upcomingSavedDeadlines.length === 0 ? (
        <p>You have no scholarship deadlines within the next 7 days.</p>
      ) : (
        <ul className="notifier-list">
          {upcomingSavedDeadlines.map((sch) => (
            <li key={sch.id}>
              <strong>{sch.name}</strong> deadline on{' '}
              {new Date(sch.deadline).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}

      <p className="note">
        Future updates will include email and push notifications.
      </p>
    </section>
  )
}
