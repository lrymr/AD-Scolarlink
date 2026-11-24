const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'scholarlink_secret_key_2026'; // Secret key para sa token

app.use(cors());
app.use(express.json());


const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initTables();
  }
});

function migrateSavedScholarshipsTable() {
  db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'saved_scholarships'", (err, row) => {
    if (err) {
      console.error('Could not inspect saved_scholarships schema:', err.message);
      return;
    }

    const schemaSql = (row && row.sql ? row.sql : '').toLowerCase();
    const isUserScopedPrimaryKey =
      schemaSql.includes('primary key (user_id, id)') ||
      schemaSql.includes('primary key(user_id, id)');

    if (!schemaSql || isUserScopedPrimaryKey) {
      return;
    }

    const legacyTableName = 'saved_scholarships_legacy';

    db.run(`ALTER TABLE saved_scholarships RENAME TO ${legacyTableName}`, (renameErr) => {
      if (renameErr) {
        console.error('Could not migrate saved_scholarships table:', renameErr.message);
        return;
      }

      db.run(`CREATE TABLE saved_scholarships (
        id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        name TEXT,
        description TEXT,
        eligibility TEXT,
        benefits TEXT,
        deadline TEXT,
        type TEXT,
        educationLevel TEXT,
        needsVerification BOOLEAN,
        officialLink TEXT,
        applicationStatus TEXT DEFAULT 'Interested',
        PRIMARY KEY (user_id, id)
      )`, (createErr) => {
        if (createErr) {
          console.error('Could not create migrated saved_scholarships table:', createErr.message);
          return;
        }

        db.run(`INSERT INTO saved_scholarships (id, user_id, name, description, eligibility, benefits, deadline, type, educationLevel, needsVerification, officialLink, applicationStatus)
          SELECT id, user_id, name, description, eligibility, benefits, deadline, type, educationLevel, needsVerification, officialLink, applicationStatus
          FROM ${legacyTableName}
          WHERE user_id IS NOT NULL`, (copyErr) => {
            if (copyErr) {
              console.error('Could not copy saved_scholarships rows during migration:', copyErr.message);
            }

            db.run(`DROP TABLE ${legacyTableName}`, (dropErr) => {
              if (dropErr) {
                console.error('Could not drop legacy saved_scholarships table:', dropErr.message);
              }
            });
          });
      });
    });
  });
}

function initTables() {
  db.serialize(() => {
   
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT
    )`);

    // 2. Profile Table
    db.run(`CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT,
      school TEXT,
      gradeLevel TEXT,
      strand TEXT,
      targetCourse TEXT
    )`);

    // 3. Saved Scholarships Table
    db.run(`CREATE TABLE IF NOT EXISTS saved_scholarships (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT,
      description TEXT,
      eligibility TEXT,
      benefits TEXT,
      deadline TEXT,
      type TEXT,
      educationLevel TEXT,
      needsVerification BOOLEAN,
      officialLink TEXT,
      applicationStatus TEXT DEFAULT 'Interested',
      PRIMARY KEY (user_id, id)
    )`);

    // 4. Grades Table
    db.run(`CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      grade REAL,
      semester TEXT
    )`);

    // 5. Checklist Table
    db.run(`CREATE TABLE IF NOT EXISTS checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      completed BOOLEAN
    )`);

    migrateSavedScholarshipsTable();
  });
}


app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already registered.' });
          }
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;

        // Gumawa na rin agad ng default profile para sa bagong user
        db.run(
          `INSERT INTO profile (user_id, name, school, gradeLevel, strand, targetCourse) VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, name, 'Your School', 'Grade 12', 'Academic', 'College Course']
        );

        res.status(201).json({ message: 'User registered successfully!' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password.' });

    // Generate JWT Token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});


app.get('/api/profile', (req, res) => {
  db.get(`SELECT * FROM profile LIMIT 1`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

app.put('/api/profile', (req, res) => {
  const { name, school, gradeLevel, strand, targetCourse } = req.body;
  db.run(
    `UPDATE profile SET name = ?, school = ?, gradeLevel = ?, strand = ?, targetCourse = ? WHERE id = 1`,
    [name, school, gradeLevel, strand, targetCourse],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated successfully', profile: req.body });
    }
  );
});

app.get('/api/saved-scholarships', (req, res) => {
  db.all(`SELECT * FROM saved_scholarships`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/grades', (req, res) => {
  db.all(`SELECT * FROM grades`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/checklist', (req, res) => {
  db.all(`SELECT * FROM checklist`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, completed: r.completed === 1 })));
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});