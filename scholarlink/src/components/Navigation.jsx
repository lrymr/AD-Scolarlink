
import React from 'react'
import '../styles/Navigation.css'

export default function Navigation({ currentSection, setCurrentSection }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'directory', label: 'Scholarship Directory' },
    { id: 'notifier', label: 'Notifier' },
    { id: 'grades', label: 'Grade Tracker' },
    { id: 'pathfinder', label: 'PathFinder' },
    { id: 'saved', label: 'Saved Scholarships' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'profile', label: 'Profile' },
  ]

  return (
    <nav>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={currentSection === item.id ? 'active' : ''}
          onClick={() => setCurrentSection(item.id)}
          aria-label={`Go to ${item.label}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
