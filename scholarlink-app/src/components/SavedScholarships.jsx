import React from 'react'
import '../styles/SavedScholarships.css'

export default function SavedScholarships({ savedScholarships, onUpdateStatus, onRemoveScholarship }) {
  function updateStatus(id, status) {
    if (onUpdateStatus) onUpdateStatus(id, status)
  }

  function removeScholarship(id) {
    if (onRemoveScholarship) onRemoveScholarship(id)
  }

  return (
    <section aria-label="Saved Scholarships">
      <h2>Saved Scholarships</h2>

      {savedScholarships.length === 0 ? (
        <p>You have not saved any scholarships yet.</p>
      ) : (
        <ul className="saved-list">
          {savedScholarships.map((sch) => (
            <li key={sch.id} className="card saved-item">
              <h3>{sch.name}</h3>
              <p><em>Status:</em></p>
              <select
                value={sch.applicationStatus}
                onChange={(e) => updateStatus(sch.id, e.target.value)}
                aria-label={`Update application status for ${sch.name}`}
              >
                <option>Interested</option>
                <option>Preparing Requirements</option>
                <option>Submitted</option>
                <option>Accepted</option>
                <option>New</option>
                <option>Awarded</option>
                <option>Not Selected</option>
              </select>
              <button
                className="remove-button"
                onClick={() => removeScholarship(sch.id)}
                aria-label={`Remove saved scholarship ${sch.name}`}
              >
                Remove
              </button>
              <p>
                <a
                  href={sch.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="official-link"
                >
                  Official Application Page
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
