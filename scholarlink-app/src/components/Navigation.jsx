
import React from 'react'
import '../styles/Navigation.css'

export default function Navigation({ currentSection, setCurrentSection, collapsed, onToggleCollapsed }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦', group: 'Workspace' },
    { id: 'directory', label: 'Scholarship Directory', icon: '◇', group: 'Workspace' },
    { id: 'notifier', label: 'Notifier', icon: '◷', group: 'Workspace' },
    { id: 'grades', label: 'Grade Tracker', icon: '▤', group: 'Workspace' },
    { id: 'pathfinder', label: 'PathFinder', icon: '⌁', group: 'Workspace' },
    { id: 'saved', label: 'Saved Scholarships', icon: '☆', group: 'Workspace' },
    { id: 'checklist', label: 'Checklist', icon: '✓', group: 'Workspace' },
    { id: 'notifications', label: 'Reminders', icon: '◉', group: 'Updates' },
    { id: 'announcements', label: 'Announcements', icon: '▱', group: 'Updates' },
    { id: 'profile', label: 'Profile', icon: '○', group: 'Account' },
  ]

  return (
    <nav className="student-navigation" aria-label="Student navigation">
      <div className="student-sidebar-heading">
        <p className="student-nav-heading">Workspace</p>
        <button
          type="button"
          className="student-sidebar-toggle"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          aria-controls="student-navigation-links"
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={onToggleCollapsed}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div className="student-nav-links" id="student-navigation-links">
        {['Workspace', 'Updates', 'Account'].map((group) => (
          <div className="student-nav-group" key={group}>
            {group !== 'Workspace' && <p className="student-nav-heading">{group}</p>}
            {navItems.filter((item) => item.group === group).map((item) => (
              <button
                key={item.id}
                type="button"
                className={currentSection === item.id ? 'active' : ''}
                onClick={() => setCurrentSection(item.id)}
                aria-label={`Go to ${item.label}`}
                aria-current={currentSection === item.id ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="student-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="student-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}
