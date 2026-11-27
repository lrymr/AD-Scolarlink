import React from 'react'

export default function StudentNotifications({ notifications }) {
  return (
    <section aria-label="Notifications">
      <h2>Reminders and notifications</h2>
      {notifications.length === 0 ? (
        <p>You have no reminders.</p>
      ) : (
        <div>
          {notifications.map((notification) => (
            <article className="card" key={notification.id}>
              <h3>{notification.title}</h3>
              <p>{notification.message}</p>
              <small>{new Date(notification.created_at).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
