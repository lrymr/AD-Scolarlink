import React from 'react'

export default function StudentAnnouncements({ announcements }) {
  return (
    <section aria-label="Campus announcements">
      <h2>Campus announcements</h2>
      {announcements.length === 0 ? (
        <p>There are no announcements yet.</p>
      ) : (
        <div>
          {announcements.map((announcement) => (
            <article className="card" key={announcement.id}>
              {announcement.pinned && <p><strong>Pinned announcement</strong></p>}
              <h3>{announcement.title}</h3>
              <p>{announcement.message}</p>
              <small>{new Date(announcement.created_at).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
