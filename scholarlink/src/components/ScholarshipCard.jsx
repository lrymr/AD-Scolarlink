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
  } = scholarship

  return (
    <article className="card scholarship-card" aria-label={`Scholarship: ${name}`}>
      <h3>{name}</h3>
      <p><strong>Description:</strong> {description}</p>
      <p><strong>Eligibility:</strong> {eligibility}</p>
      <p><strong>Benefits:</strong> {benefits}</p>
      <p>
        <strong>Deadline:</strong>{' '}
        {deadline ? new Date(deadline).toLocaleDateString() : 'Not specified'}
      </p>
      {needsVerification && (
        <p className="needs-verification" aria-label="Verification needed">
          ⚠️ Scholarship information needs verification. Please check official site.
        </p>
      )}
      <p>
        <a href={officialLink} target="_blank" rel="noopener noreferrer" className="official-link">
          Official Application Page
        </a>
      </p>
      <button onClick={() => toggleSave(scholarship)}>
        {isSaved ? 'Remove from Saved' : 'Save Scholarship'}
      </button>
    </article>
  )
}
