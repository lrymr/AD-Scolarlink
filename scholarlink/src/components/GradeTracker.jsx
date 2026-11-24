import React, { useState } from 'react'
import '../styles/GradeTracker.css'

export default function GradeTracker({ grades, onAddGrade, onRemoveGrade }) {
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [period, setPeriod] = useState('1st Grading')

  const gradingPeriods = [
    '1st Grading',
    '2nd Grading',
    '3rd Grading',
    '4th Grading',
  ]

  const average =
    grades.length === 0
      ? 0
      : (grades.reduce((acc, g) => acc + Number(g.grade), 0) / grades.length).toFixed(2)

  async function addGrade(e) {
    e.preventDefault()
    if (!subject.trim() || !grade) return
    const numericGrade = Number(grade)
    if (numericGrade < 0 || numericGrade > 100) return alert('Grade should be between 0 and 100')
    const newGrade = { subject: subject.trim(), grade: numericGrade, period }
    if (onAddGrade) await onAddGrade(newGrade)
    setSubject('')
    setGrade('')
    setPeriod('1st Grading')
  }

  function removeGrade(id) {
    if (onRemoveGrade) onRemoveGrade(id)
  }

  return (
    <section aria-label="Grade Tracker">
      <h2>Grade Tracker</h2>

      <form onSubmit={addGrade} className="grade-form">
        <label htmlFor="subject">Subject Name</label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject"
          required
        />

        <label htmlFor="grade">Grade (%)</label>
        <input
          id="grade"
          type="number"
          min="0"
          max="100"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Enter grade"
          required
        />

        <label htmlFor="period">Grading Period</label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          required
        >
          {gradingPeriods.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <button type="submit">Add Grade</button>
      </form>

      <div className="grades-list">
        {grades.length === 0 ? (
          <p>No grades entered yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Grade</th>
                <th>Period</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id ?? `${g.subject}-${g.period}-${g.grade}`}>
                  <td>{g.subject}</td>
                  <td>{g.grade}%</td>
                  <td>{g.period}</td>
                  <td>
                    <button
                      aria-label={`Remove grade for ${g.subject}`}
                      onClick={() => removeGrade(g.id)}
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p>
        <strong>Average Grade: </strong> {grades.length > 0 ? `${average}%` : 'N/A'}
      </p>

      <p>
        <em>
          Note: This grade tracker helps you monitor academic progress. Scholarship eligibility depends on other criteria, too.
        </em>
      </p>
    </section>
  )
}
