import React from 'react'
import '../styles/ScholarshipCard.css'

export default function ScholarshipCard({ scholarship, isSaved, toggleSave }) {
  const {
    name,
    description,
    eligibility,
    benefits,
    deadline,
    officialLink,
    needsVerification,
    type,
    educationLevel,
  } = scholarship
  const isClosed = scholarship.status === 'Closed'

  return (
    <article className="card scholarship-card" aria-label={`Scholarship: ${name}`}>
      <h3>{name}</h3>
      {(type || educationLevel) && (
        <p>
          {type && <><strong>Type:</strong> {type}</>}
          {type && educationLevel && ' · '}
          {educationLevel && <><strong>Education level:</strong> {educationLevel}</>}
        </p>
      )}
      <p><strong>Description:</strong> {description}</p>
      <p><strong>Eligibility:</strong> {eligibility}</p>
      <p><strong>Benefits:</strong> {benefits}</p>
      {scholarship.amount !== undefined && (
        <>
          <p>
            <strong>Award:</strong> ₱{Number(scholarship.amount).toLocaleString()}
            {' · '}
            <strong>Slots:</strong> {scholarship.slots}
          </p>
          <p><strong>Status:</strong> {scholarship.status}</p>
        </>
      )}
      <p>
        <strong>Deadline:</strong>{' '}
        {deadline ? new Date(deadline).toLocaleDateString() : 'Not specified'}
      </p>
      {needsVerification && (
        <p className="needs-verification" aria-label="Verification needed">
          ⚠️ Scholarship information needs verification. Please check official site.
        </p>
      )}
      {officialLink && (
        <p>
          <a href={officialLink} target="_blank" rel="noopener noreferrer" className="official-link">
            Official Application Page
          </a>
        </p>
      )}
      <button
        onClick={() => toggleSave(scholarship)}
        disabled={isClosed && !isSaved}
        title={isClosed && !isSaved ? 'This scholarship is closed.' : undefined}
      >
        {isSaved ? 'Remove from Saved' : isClosed ? 'Closed' : 'Save Scholarship'}
      </button>
    </article>
  )
}
