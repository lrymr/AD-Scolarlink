import React from 'react'
import '../styles/ApplicationChecklist.css'

export default function ApplicationChecklist({ checklist, onAddItem, onToggleItem }) {
  const [newItem, setNewItem] = React.useState('')

  function toggleItem(id, completed) {
    if (onToggleItem) onToggleItem(id, completed)
  }

  function handleAddItem(e) {
    e.preventDefault()
    if (!newItem.trim()) return
    if (onAddItem) onAddItem(newItem.trim())
    setNewItem('')
  }

  const completedCount = checklist.filter((item) => item.completed).length

  return (
    <section aria-label="Application Checklist">
      <h2>Application Checklist</h2>

      <form onSubmit={handleAddItem} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item"
          aria-label="Add checklist item"
          style={{ marginRight: '0.5rem', padding: '0.45rem' }}
        />
        <button type="submit">Add</button>
      </form>

      <ul className="checklist-list">
        {checklist.map((item) => (
          <li key={item.id} className={item.completed ? 'completed' : ''}>
            <label>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleItem(item.id, !item.completed)}
              />
              {item.name}
            </label>
          </li>
        ))}
      </ul>
      <p>
        Progress: {completedCount} / {checklist.length} items completed
      </p>
    </section>
  )
}
