
import React, { useMemo, useState } from 'react'
import './PathFinder.css'

const interestOptions = [
  'Science and experiments',
  'Mathematics and problem-solving',
  'Computers and technology',
  'Business and entrepreneurship',
  'Communication and writing',
  'Arts and creative design',
  'Healthcare and helping people',
  'Teaching and education',
  'Engineering and construction',
  'Sports and physical activities'
]

const pathways = {
  shs: [
    {
      name: 'STEM',
      fullName: 'Science, Technology, Engineering, and Mathematics',
      subjects: ['math', 'mathematics', 'science', 'physics', 'chemistry', 'biology'],
      interests: [
        'Science and experiments',
        'Mathematics and problem-solving',
        'Engineering and construction',
        'Healthcare and helping people',
        'Computers and technology'
      ],
      description: 'A possible path for students interested in science, mathematics, research, and technology.'
    },
    {
      name: 'ABM',
      fullName: 'Accountancy, Business, and Management',
      subjects: ['accounting', 'business', 'economics', 'math', 'mathematics'],
      interests: [
        'Business and entrepreneurship',
        'Mathematics and problem-solving',
        'Communication and writing'
      ],
      description: 'For students interested in business, finance, management, and entrepreneurship.'
    },
    {
      name: 'HUMSS',
      fullName: 'Humanities and Social Sciences',
      subjects: ['english', 'filipino', 'history', 'social studies', 'communication', 'literature'],
      interests: [
        'Communication and writing',
        'Teaching and education',
        'Healthcare and helping people'
      ],
      description: 'For students interested in communication, society, education, and helping people.'
    },
    {
      name: 'GAS',
      fullName: 'General Academic Strand',
      subjects: ['english', 'math', 'mathematics', 'science', 'filipino', 'social studies'],
      interests: [
        'Communication and writing',
        'Teaching and education',
        'Business and entrepreneurship',
        'Science and experiments'
      ],
      description: 'A flexible option for students who want to explore different academic fields.'
    },
    {
      name: 'TVL',
      fullName: 'Technical-Vocational-Livelihood',
      subjects: ['tvl', 'technology', 'computer', 'ict', 'tle'],
      interests: [
        'Computers and technology',
        'Business and entrepreneurship',
        'Engineering and construction'
      ],
      description: 'For students interested in practical skills and technical learning.'
    },
    {
      name: 'Arts and Design',
      fullName: 'Arts and Design Track',
      subjects: ['arts', 'music', 'design', 'creative'],
      interests: [
        'Arts and creative design',
        'Communication and writing'
      ],
      description: 'For students interested in visual arts and creative work.'
    },
    {
      name: 'Sports',
      fullName: 'Sports Track',
      subjects: ['physical education', 'pe', 'sports'],
      interests: ['Sports and physical activities'],
      description: 'For students interested in sports and physical activities.'
    }
  ],

  college: [
    {
      name: 'BS Information Technology',
      fullName: 'Bachelor of Science in Information Technology',
      subjects: ['computer', 'ict', 'technology', 'math', 'mathematics'],
      interests: [
        'Computers and technology',
        'Mathematics and problem-solving'
      ],
      description: 'Explore computing, software, networks, and information systems.'
    },
    {
      name: 'BS Computer Science',
      fullName: 'Bachelor of Science in Computer Science',
      subjects: ['computer', 'ict', 'math', 'mathematics', 'science'],
      interests: [
        'Computers and technology',
        'Mathematics and problem-solving'
      ],
      description: 'Explore programming, algorithms, and software development.'
    },
    {
      name: 'Engineering',
      fullName: 'Engineering Degree Programs',
      subjects: ['math', 'mathematics', 'physics', 'science'],
      interests: [
        'Engineering and construction',
        'Mathematics and problem-solving',
        'Science and experiments'
      ],
      description: 'Explore designing, building, and solving technical problems.'
    },
    {
      name: 'BS Accountancy',
      fullName: 'Bachelor of Science in Accountancy',
      subjects: ['accounting', 'math', 'mathematics', 'business', 'economics'],
      interests: [
        'Business and entrepreneurship',
        'Mathematics and problem-solving'
      ],
      description: 'Explore accounting, auditing, and financial management.'
    },
    {
      name: 'BS Business Administration',
      fullName: 'Bachelor of Science in Business Administration',
      subjects: ['business', 'economics', 'math', 'mathematics', 'english'],
      interests: [
        'Business and entrepreneurship',
        'Communication and writing'
      ],
      description: 'Explore management, marketing, and entrepreneurship.'
    },
    {
      name: 'BS Nursing',
      fullName: 'Bachelor of Science in Nursing',
      subjects: ['science', 'biology', 'chemistry'],
      interests: [
        'Healthcare and helping people',
        'Science and experiments'
      ],
      description: 'Explore healthcare and patient support.'
    },
    {
      name: 'Education',
      fullName: 'Education Degree Programs',
      subjects: ['english', 'filipino', 'math', 'mathematics', 'science'],
      interests: [
        'Teaching and education',
        'Communication and writing'
      ],
      description: 'Explore teaching and helping students learn.'
    },
    {
      name: 'Communication',
      fullName: 'Communication Degree Programs',
      subjects: ['english', 'filipino', 'communication', 'literature'],
      interests: [
        'Communication and writing',
        'Arts and creative design'
      ],
      description: 'Explore media, writing, and public relations.'
    },
    {
      name: 'Multimedia Arts',
      fullName: 'Multimedia Arts Degree Programs',
      subjects: ['arts', 'design', 'computer', 'ict'],
      interests: [
        'Arts and creative design',
        'Computers and technology'
      ],
      description: 'Explore digital design, animation, and creative production.'
    }
  ]
}

function calculateRecommendations(grades, interests, type) {
  return pathways[type]
    .map((path) => {
      const relatedGrades = grades.filter((item) => {
        const subject = String(item.subject || '').toLowerCase()

        return path.subjects.some((keyword) =>
          subject.includes(keyword)
        )
      })

      const validGrades = relatedGrades
        .map((item) => Number(item.grade))
        .filter((grade) => Number.isFinite(grade) && grade > 0)

      const academicScore = validGrades.length
        ? validGrades.reduce((total, grade) => total + grade, 0) / validGrades.length
        : null

      const matchedInterests = interests.filter((interest) =>
        path.interests.includes(interest)
      )

      const interestScore = interests.length
        ? (matchedInterests.length / interests.length) * 100
        : null

      let finalScore = 0

      if (academicScore !== null && interestScore !== null) {
        finalScore = (academicScore * 0.5) + (interestScore * 0.5)
      } else if (academicScore !== null) {
        finalScore = academicScore
      } else if (interestScore !== null) {
        finalScore = interestScore
      }

      return {
        ...path,
        academicScore: academicScore === null ? null : Math.round(academicScore),
        interestScore: interestScore === null ? null : Math.round(interestScore),
        score: Math.round(finalScore),
        relatedSubjects: relatedGrades.map((item) => item.subject),
        matchedInterests
      }
    })
    .sort((a, b) => b.score - a.score)
}

export default function PathFinder({ grades = [] }) {
  const [type, setType] = useState('shs')
  const [interests, setInterests] = useState([])
  const [showResults, setShowResults] = useState(false)

  const recommendations = useMemo(
    () => calculateRecommendations(grades, interests, type),
    [grades, interests, type]
  )

  function toggleInterest(interest) {
    setInterests((previous) =>
      previous.includes(interest)
        ? previous.filter((item) => item !== interest)
        : [...previous, interest]
    )

    setShowResults(false)
  }

  function resetAssessment() {
    setInterests([])
    setShowResults(false)
  }

  return (
    <div className="pathfinder-page">

      <div className="pathfinder-header">
        <span className="pathfinder-tag">YOUR ACADEMIC JOURNEY</span>
        <h1>Discover Your Path</h1>
        <p>
          Understand your strengths, explore your interests,
          and discover possible paths for your future.
        </p>
      </div>

      <div className="pathfinder-card">
        <h2>What are you planning for?</h2>
        <p className="pathfinder-subtitle">
          Choose the academic level you want help deciding on.
        </p>

        <div className="pathfinder-type-options">
          <button
            className={type === 'shs' ? 'pathfinder-type active' : 'pathfinder-type'}
            onClick={() => {
              setType('shs')
              setShowResults(false)
            }}
          >
            <span>🎓</span>
            <strong>SHS Strand</strong>
            <small>Choose your Senior High School strand</small>
          </button>

          <button
            className={type === 'college' ? 'pathfinder-type active' : 'pathfinder-type'}
            onClick={() => {
              setType('college')
              setShowResults(false)
            }}
          >
            <span>📚</span>
            <strong>College Program</strong>
            <small>Explore possible college degree programs</small>
          </button>
        </div>
      </div>

      <div className="pathfinder-card">
        <div className="pathfinder-section-heading">
          <div>
            <span className="pathfinder-number">01</span>
            <h2>Your Interests</h2>
          </div>

          <span className="pathfinder-count">
            {interests.length} selected
          </span>
        </div>

        <p className="pathfinder-subtitle">
          Select the subjects and fields that interest you.
          You can choose more than one.
        </p>

        <div className="pathfinder-interest-grid">
          {interestOptions.map((interest) => (
            <button
              key={interest}
              className={
                interests.includes(interest)
                  ? 'pathfinder-interest selected'
                  : 'pathfinder-interest'
              }
              onClick={() => toggleInterest(interest)}
            >
              <span>{interests.includes(interest) ? '✓' : '+'}</span>
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div className="pathfinder-card">
        <div className="pathfinder-section-heading">
          <div>
            <span className="pathfinder-number">02</span>
            <h2>Your Academic Strengths</h2>
          </div>
        </div>

        {grades.length > 0 ? (
          <>
            <p className="pathfinder-subtitle">
              These grades are taken from your existing Grade Tracker.
            </p>

            <div className="pathfinder-grade-list">
              {grades.map((item, index) => (
                <div
                  className="pathfinder-grade-item"
                  key={item.id || index}
                >
                  <span>{item.subject}</span>
                  <strong>{item.grade}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="pathfinder-empty">
            <span>📖</span>
            <strong>No grades recorded yet</strong>
            <p>
              Add your subjects and grades in Grade Tracker
              to receive recommendations based on academic performance.
            </p>
          </div>
        )}
      </div>

      <button
        className="pathfinder-submit"
        onClick={() => setShowResults(true)}
        disabled={interests.length === 0 && grades.length === 0}
      >
        Find My Path <span>→</span>
      </button>

      {showResults && (
        <div className="pathfinder-results">
          <div className="pathfinder-results-heading">
            <span className="pathfinder-tag">YOUR RESULTS</span>
            <h2>Explore Your Possible Paths</h2>
            <p>
              Here are the paths that match your recorded grades
              and selected interests.
            </p>
          </div>

          {recommendations.slice(0, 3).map((path, index) => (
            <div className="pathfinder-result-card" key={path.name}>
              <div className="pathfinder-result-top">
                <span className="pathfinder-rank">
                  #{index + 1} MATCH
                </span>

                <strong>{path.score}% Match</strong>
              </div>

              <h3>{path.name}</h3>
              <h4>{path.fullName}</h4>
              <p>{path.description}</p>

              <div className="pathfinder-score-details">
                <span>
                  Academic match: {path.academicScore === null ? 'No data' : `${path.academicScore}%`}
                </span>

                <span>
                  Interest match: {path.interestScore === null ? 'No data' : `${path.interestScore}%`}
                </span>
              </div>

              {path.relatedSubjects.length > 0 && (
                <div className="pathfinder-match-info">
                  <strong>Related subjects from your Grade Tracker:</strong>
                  <p>{path.relatedSubjects.join(', ')}</p>
                </div>
              )}

              {path.matchedInterests.length > 0 && (
                <div className="pathfinder-match-info">
                  <strong>Matching interests:</strong>
                  <p>{path.matchedInterests.join(', ')}</p>
                </div>
              )}
            </div>
          ))}

          <p className="pathfinder-disclaimer">
            These recommendations are suggestions based on your recorded
            grades and selected interests. They do not determine your
            abilities or guarantee admission. Consider your personal
            goals and explore other options too.
          </p>

          <button
            className="pathfinder-reset"
            onClick={resetAssessment}
          >
            Retake Assessment
          </button>
        </div>
      )}

    </div>
  )
}
