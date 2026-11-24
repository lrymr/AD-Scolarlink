import React, { useState, useEffect } from 'react'
import ScholarshipCard from './ScholarshipCard.jsx'
import '../styles/ScholarshipDirectory.css'

export default function ScholarshipDirectory({ scholarships, savedScholarships, toggleSave }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterEducation, setFilterEducation] = useState('All')
  const [filterEligibility, setFilterEligibility] = useState('All')

  const filteredScholarships = scholarships.filter((sch) => {
    const matchesSearch =
      sch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sch.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'All' || sch.type === filterType
    const matchesEducation = filterEducation === 'All' || sch.educationLevel === filterEducation
    const matchesEligibility =
      filterEligibility === 'All' ||
      (filterEligibility === 'Needs Verification' && sch.needsVerification === true)

    return matchesSearch && matchesType && matchesEducation && matchesEligibility
  })

  function handleToggleSave(scholarship) {
    if (toggleSave) toggleSave(scholarship)
  }

  return (
    <section aria-label="Scholarship Directory">
      <h2>Scholarship Directory</h2>
      <div className="filters-card card">
        <input
          type="text"
          placeholder="Search scholarships..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search scholarships"
        />

        <div className="filters">
          <label>
            Type:
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option>All</option>
              <option>Government</option>
              <option>University</option>
              <option>Private</option>
            </select>
          </label>

          <label>
            Education Level:
            <select value={filterEducation} onChange={(e) => setFilterEducation(e.target.value)}>
              <option>All</option>
              <option>College</option>
              <option>SCHS</option>
            </select>
          </label>

          <label>
            Eligibility:
            <select value={filterEligibility} onChange={(e) => setFilterEligibility(e.target.value)}>
              <option>All</option>
              <option>Needs Verification</option>
            </select>
          </label>
        </div>
      </div>

      <div className="scholarship-list">
        {filteredScholarships.length === 0 ? (
          <p>No scholarships match your criteria.</p>
        ) : (
          filteredScholarships.map((sch) => (
            <ScholarshipCard
              key={sch.id}
              scholarship={sch}
              isSaved={!!savedScholarships.find((s) => s.id === sch.id)}
              toggleSave={handleToggleSave}
            />
          ))
        )}
      </div>
    </section>
  )
}
