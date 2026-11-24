const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'scholarlink_secret_key_2026';
const DB_PATH = path.join(__dirname, 'database.db');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initTables();
  }
});

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function addMissingColumn(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) {
      console.error(`Could not inspect ${tableName}:`, err.message);
      return;
    }

    const exists = columns.some((column) => column.name === columnName);
    if (!exists) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,(alterErr) => {
        if (alterErr) {
          console.error(`Could not add column ${columnName} to ${tableName}:`, alterErr.message);
        }
      });
    }
  });
}

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
        PRIMARY KEY (user_id, id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT,
      school TEXT,
      gradeLevel TEXT,
      strand TEXT,
      targetCourse TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

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
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      subject TEXT,
      grade REAL,
      period TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    addMissingColumn('saved_scholarships', 'user_id', 'INTEGER');
    addMissingColumn('saved_scholarships', 'applicationStatus', 'TEXT DEFAULT "Interested"');
    addMissingColumn('grades', 'user_id', 'INTEGER');
    addMissingColumn('grades', 'period', 'TEXT');
    addMissingColumn('checklist', 'user_id', 'INTEGER');

    migrateSavedScholarshipsTable();
  });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'ScholarLink API is running.' });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await getRow('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const result = await runSql(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [trimmedName, normalizedEmail, hashedPassword]
    );

    const userId = result.lastID;
    await runSql(
      `INSERT INTO profile (user_id, name, school, gradeLevel, strand, targetCourse)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = excluded.name,
         school = excluded.school,
         gradeLevel = excluded.gradeLevel,
         strand = excluded.strand,
         targetCourse = excluded.targetCourse`,
      [userId, trimmedName, 'Not set', 'Grade 12', 'Academic', 'Not set']
    );

    return res.status(201).json({
      message: 'User registered successfully.',
      userId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await getRow('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

app.get('/api/profile', authenticate, async (req, res) => {
  try {
    let profile = await getRow('SELECT * FROM profile WHERE user_id = ?', [req.user.id]);

    if (!profile) {
      const user = await getRow('SELECT name FROM users WHERE id = ?', [req.user.id]);
      const result = await runSql(
        `INSERT INTO profile (user_id, name, school, gradeLevel, strand, targetCourse)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, user ? user.name : 'Student', 'Not set', 'Grade 12', 'Academic', 'Not set']
      );
      profile = await getRow('SELECT * FROM profile WHERE id = ?', [result.lastID]);
    }

    return res.json(profile || {});
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
});

app.put('/api/profile', authenticate, async (req, res) => {
  const { name, school, gradeLevel, strand, targetCourse } = req.body;

  try {
    await runSql(
      `INSERT INTO profile (user_id, name, school, gradeLevel, strand, targetCourse)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = excluded.name,
         school = excluded.school,
         gradeLevel = excluded.gradeLevel,
         strand = excluded.strand,
         targetCourse = excluded.targetCourse`,
      [req.user.id, name || '', school || '', gradeLevel || '', strand || '', targetCourse || '']
    );

    const profile = await getRow('SELECT * FROM profile WHERE user_id = ?', [req.user.id]);
    return res.json({ message: 'Profile updated successfully.', profile });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Unable to update profile.' });
  }
});

app.get('/api/saved-scholarships', authenticate, async (req, res) => {
  try {
    const rows = await getRows('SELECT * FROM saved_scholarships WHERE user_id = ? ORDER BY name ASC', [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error('Fetch saved scholarships error:', error);
    return res.status(500).json({ error: 'Unable to load saved scholarships.' });
  }
});

app.post('/api/saved-scholarships', authenticate, async (req, res) => {
  const scholarship = req.body || {};
  const id = scholarship.id || `scholarship-${Date.now()}`;

  try {
    await runSql(
      `INSERT INTO saved_scholarships (id, user_id, name, description, eligibility, benefits, deadline, type, educationLevel, needsVerification, officialLink, applicationStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         eligibility = excluded.eligibility,
         benefits = excluded.benefits,
         deadline = excluded.deadline,
         type = excluded.type,
         educationLevel = excluded.educationLevel,
         needsVerification = excluded.needsVerification,
         officialLink = excluded.officialLink,
         applicationStatus = excluded.applicationStatus`,
      [id, req.user.id, scholarship.name || '', scholarship.description || '', scholarship.eligibility || '', scholarship.benefits || '', scholarship.deadline || '', scholarship.type || '', scholarship.educationLevel || '', Boolean(scholarship.needsVerification), scholarship.officialLink || '', scholarship.applicationStatus || 'Interested']
    );

    return res.status(201).json({ message: 'Saved scholarship updated.' });
  } catch (error) {
    console.error('Save scholarship error:', error);
    return res.status(500).json({ error: 'Unable to save scholarship.' });
  }
});

app.patch('/api/saved-scholarships/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { applicationStatus } = req.body;

  try {
    await runSql(
      'UPDATE saved_scholarships SET applicationStatus = ? WHERE id = ? AND user_id = ?',
      [applicationStatus || 'Interested', id, req.user.id]
    );
    return res.json({ message: 'Scholarship status updated.' });
  } catch (error) {
    console.error('Update saved scholarship status error:', error);
    return res.status(500).json({ error: 'Unable to update scholarship status.' });
  }
});

app.delete('/api/saved-scholarships/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    await runSql('DELETE FROM saved_scholarships WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ message: 'Saved scholarship removed.' });
  } catch (error) {
    console.error('Delete saved scholarship error:', error);
    return res.status(500).json({ error: 'Unable to remove scholarship.' });
  }
});

app.get('/api/grades', authenticate, async (req, res) => {
  try {
    const rows = await getRows('SELECT * FROM grades WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    return res.json(rows.map((row) => ({ ...row, grade: Number(row.grade) })));
  } catch (error) {
    console.error('Fetch grades error:', error);
    return res.status(500).json({ error: 'Unable to load grades.' });
  }
});

app.post('/api/grades', authenticate, async (req, res) => {
  const { subject, grade, period } = req.body;

  if (!subject || grade === undefined || !period) {
    return res.status(400).json({ error: 'Subject, grade, and period are required.' });
  }

  try {
    const result = await runSql(
      'INSERT INTO grades (user_id, subject, grade, period) VALUES (?, ?, ?, ?)',
      [req.user.id, String(subject).trim(), Number(grade), String(period).trim()]
    );

    const row = await getRow('SELECT * FROM grades WHERE id = ?', [result.lastID]);
    return res.status(201).json(row);
  } catch (error) {
    console.error('Add grade error:', error);
    return res.status(500).json({ error: 'Unable to add grade.' });
  }
});

app.delete('/api/grades/:id', authenticate, async (req, res) => {
  try {
    await runSql('DELETE FROM grades WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ message: 'Grade removed.' });
  } catch (error) {
    console.error('Delete grade error:', error);
    return res.status(500).json({ error: 'Unable to remove grade.' });
  }
});

app.get('/api/checklist', authenticate, async (req, res) => {
  try {
    const rows = await getRows('SELECT * FROM checklist WHERE user_id = ? ORDER BY id ASC', [req.user.id]);
    return res.json(rows.map((row) => ({ ...row, completed: Boolean(row.completed) })));
  } catch (error) {
    console.error('Fetch checklist error:', error);
    return res.status(500).json({ error: 'Unable to load checklist.' });
  }
});

app.post('/api/checklist', authenticate, async (req, res) => {
  const { name, completed = false } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Checklist item name is required.' });
  }

  try {
    const result = await runSql(
      'INSERT INTO checklist (user_id, name, completed) VALUES (?, ?, ?)',
      [req.user.id, String(name).trim(), completed ? 1 : 0]
    );

    const row = await getRow('SELECT * FROM checklist WHERE id = ?', [result.lastID]);
    return res.status(201).json({ ...row, completed: Boolean(row.completed) });
  } catch (error) {
    console.error('Add checklist item error:', error);
    return res.status(500).json({ error: 'Unable to add checklist item.' });
  }
});

app.patch('/api/checklist/:id', authenticate, async (req, res) => {
  const { completed } = req.body;

  try {
    await runSql(
      'UPDATE checklist SET completed = ? WHERE id = ? AND user_id = ?',
      [completed ? 1 : 0, req.params.id, req.user.id]
    );
    return res.json({ message: 'Checklist item updated.' });
  } catch (error) {
    console.error('Update checklist error:', error);
    return res.status(500).json({ error: 'Unable to update checklist item.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});