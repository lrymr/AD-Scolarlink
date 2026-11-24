import React, { useState } from 'react'
import '../styles/StudentProfile.css'

export default function StudentProfile({ profile, updateProfile }) {
  const [form, setForm] = useState(profile)
  const [editing, setEditing] = useState(false)

  React.useEffect(() => {
    setForm(profile)
  }, [profile])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateProfile(form)
    setEditing(false)
  }

  return (
    <section aria-label="Student Profile">
      <h2>Student Profile</h2>

      {editing ? (
        <form onSubmit={handleSubmit} className="profile-form" aria-label="Edit profile form">
          <label>
            Name
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            School
            <input
              name="school"
              type="text"
              value={form.school}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Grade Level
            <input
              name="gradeLevel"
              type="text"
              value={form.gradeLevel}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Academic Strand
            <input
              name="strand"
              type="text"
              value={form.strand}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Target College Course
            <input
              name="targetCourse"
              type="text"
              value={form.targetCourse}
              onChange={handleChange}
              required
            />
          </label>

          <div className="form-buttons">
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-display">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>School:</strong> {profile.school}</p>
          <p><strong>Grade Level:</strong> {profile.gradeLevel}</p>
          <p><strong>Academic Strand:</strong> {profile.strand}</p>
          <p><strong>Target College Course:</strong> {profile.targetCourse}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </section>
  )
}
