
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'scholarlink_secret_key_2026';
const DB_PATH = path.join(__dirname, 'database.db');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the ScholarLink database.');
        initTables(() => {
            app.listen(PORT, () => {
                console.log(`ScholarLink server running on http://localhost:${PORT}`);
            });
        });
    }
});

db.run('PRAGMA foreign_keys = ON');

function ensureColumn(tableName, columnName, definition, callback) {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
            console.error(`Error checking ${tableName}:`, err.message);
            return callback(err);
        }

        const exists = columns.some(column => column.name === columnName);

        if (exists) {
            return callback(null);
        }

        db.run(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
            (alterErr) => {
                if (alterErr) {
                    console.error(`Error adding ${columnName}:`, alterErr.message);
                    return callback(alterErr);
                }

                callback(null);
            }
        );
    });
}

function migrateSavedScholarshipsTable(callback) {
    db.get(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'saved_scholarships'",
        [],
        (err, row) => {
            if (err) {
                console.error('Error checking saved scholarships:', err.message);
                return callback(err);
            }

            const schema = (row?.sql || '').toLowerCase().replace(/\s/g, '');

            if (!schema || schema.includes('primarykey(user_id,id)')) {
                return callback(null);
            }

            const legacyTable = 'saved_scholarships_legacy';

            db.run(`ALTER TABLE saved_scholarships RENAME TO ${legacyTable}`, (renameErr) => {
                if (renameErr) {
                    console.error('Error migrating saved scholarships:', renameErr.message);
                    return callback(renameErr);
                }

                db.run(`
                    CREATE TABLE saved_scholarships (
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
                    )
                `, (createErr) => {
                    if (createErr) {
                        console.error('Error creating migrated table:', createErr.message);
                        return callback(createErr);
                    }

                    db.run(`
                        INSERT INTO saved_scholarships (
                            id, user_id, name, description, eligibility,
                            benefits, deadline, type, educationLevel,
                            needsVerification, officialLink, applicationStatus
                        )
                        SELECT
                            id, user_id, name, description, eligibility,
                            benefits, deadline, type, educationLevel,
                            needsVerification, officialLink, applicationStatus
                        FROM ${legacyTable}
                        WHERE user_id IS NOT NULL
                    `, (copyErr) => {
                        if (copyErr) {
                            console.error('Error copying old scholarship data:', copyErr.message);
                            return callback(copyErr);
                        }

                        db.run(`DROP TABLE ${legacyTable}`, (dropErr) => {
                            if (dropErr) {
                                console.error('Error removing old table:', dropErr.message);
                                return callback(dropErr);
                            }

                            console.log('Saved scholarships table migrated successfully.');
                            callback(null);
                        });
                    });
                });
            });
        }
    );
}

async function seedAdministrator(callback) {
    const configuredEmail = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!configuredEmail || !password) {
        return callback();
    }

    const email = configuredEmail.trim().toLowerCase();
    const name = process.env.ADMIN_NAME || 'ScholarLink Administrator';

    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
        if (err) {
            console.error('Could not check administrator account:', err.message);
            return callback();
        }

        if (existingUser) {
            db.run(
                'UPDATE users SET role = ? WHERE id = ?',
                ['admin', existingUser.id],
                (updateErr) => {
                    if (updateErr) {
                        console.error('Could not update administrator role:', updateErr.message);
                    }
                    callback();
                }
            );
            return;
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, 'admin'],
                function (insertErr) {
                    if (insertErr) {
                        console.error('Could not create administrator account:', insertErr.message);
                        return callback();
                    }

                    db.run(
                        `INSERT INTO profile
                        (user_id, name, school, gradeLevel, strand, targetCourse)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [this.lastID, name, 'ScholarLink', 'Administrator', 'Admin', 'Administration'],
                        (profileErr) => {
                            if (profileErr) {
                                console.error('Could not create administrator profile:', profileErr.message);
                            }
                            callback();
                        }
                    );
                }
            );
        } catch (hashErr) {
            console.error('Could not hash administrator password:', hashErr.message);
            callback();
        }
    });
}

function initTables(callback) {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                name TEXT,
                school TEXT,
                gradeLevel TEXT,
                strand TEXT,
                targetCourse TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS saved_scholarships (
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
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                subject TEXT,
                grade REAL,
                period TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS checklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT,
                completed BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS scholarships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                slots INTEGER NOT NULL,
                deadline TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                description TEXT NOT NULL,
                eligibility TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'University',
                educationLevel TEXT NOT NULL DEFAULT 'College',
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                pinned BOOLEAN NOT NULL DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS admin_profiles (
                user_id INTEGER PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                campus TEXT NOT NULL DEFAULT '',
                department TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    });

    ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'student'", (err) => {
        if (err) return callback();

        ensureColumn('saved_scholarships', 'user_id', 'INTEGER', (err) => {
            if (err) return callback();

            ensureColumn('saved_scholarships', 'applicationStatus', "TEXT DEFAULT 'Interested'", (err) => {
                if (err) return callback();

                ensureColumn('grades', 'user_id', 'INTEGER', (err) => {
                    if (err) return callback();

                    ensureColumn('grades', 'period', 'TEXT', (err) => {
                        if (err) return callback();

                        ensureColumn('checklist', 'user_id', 'INTEGER', (err) => {
                            if (err) return callback();

                            migrateSavedScholarshipsTable((migrationErr) => {
                                if (migrationErr) {
                                    console.error('Database migration encountered an error.');
                                }

                                ensureColumn('scholarships', 'type', "TEXT NOT NULL DEFAULT 'University'", (scholarshipTypeErr) => {
                                    if (scholarshipTypeErr) return callback();

                                    ensureColumn('scholarships', 'educationLevel', "TEXT NOT NULL DEFAULT 'College'", (educationLevelErr) => {
                                        if (educationLevelErr) return callback();

                                        seedAdministrator(() => {
                                            console.log('Database tables initialized.');
                                            callback();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            error: 'Authentication token is required.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token.'
        });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Administrator access is required.'
        });
    }

    db.get(
        'SELECT role FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to verify administrator access.'
                });
            }

            if (!user || user.role !== 'admin') {
                return res.status(403).json({
                    error: 'Administrator access is required.'
                });
            }

            next();
        }
    );
}

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'ScholarLink API is running.'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        ok: true,
        message: 'ScholarLink API is running.'
    });
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !name.trim() ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: 'Name, email, and password are required.'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: 'Password must be at least 6 characters long.'
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.get(
            'SELECT id FROM users WHERE email = ?',
            [normalizedEmail],
            (err, existingUser) => {
                if (err) {
                    return res.status(500).json({
                        error: 'Database error during registration.'
                    });
                }

                if (existingUser) {
                    return res.status(400).json({
                        error: 'Email already registered.'
                    });
                }

                db.run(
                    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                    [trimmedName, normalizedEmail, hashedPassword],
                    function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({
                                error: 'Registration failed.'
                            });
                        }

                        const userId = this.lastID;

                        db.run(
                            `INSERT INTO profile
                            (user_id, name, school, gradeLevel, strand, targetCourse)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [userId, trimmedName, 'Not set', 'Grade 12', 'Academic', 'Not set'],
                            (profileErr) => {
                                if (profileErr) {
                                    console.error('Profile creation error:', profileErr.message);
                                }

                                return res.status(201).json({
                                    message: 'User registered successfully.',
                                    userId
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Server error during registration.'
        });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: 'Email and password are required.'
        });
    }

    db.get(
        'SELECT * FROM users WHERE email = ?',
        [email.trim().toLowerCase()],
        async (err, user) => {
            if (err) {
                return res.status(500).json({
                    error: 'Server error during login.'
                });
            }

            if (!user) {
                return res.status(401).json({
                    error: 'Invalid email or password.'
                });
            }

            try {
                const isPasswordValid = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!isPasswordValid) {
                    return res.status(401).json({
                        error: 'Invalid email or password.'
                    });
                }

                if ((user.role || 'student') === 'admin') {
                    return res.status(403).json({
                        error: 'Administrator accounts must use the Administrator login.'
                    });
                }

                if ((user.role || 'student') !== 'student') {
                    return res.status(403).json({
                        error: 'This account is not permitted to log in.'
                    });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role || 'student' },
                    JWT_SECRET,
                    { expiresIn: '1d' }
                );

                res.status(200).json({
                    message: 'Login successful!',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role || 'student'
                    }
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Login failed.'
                });
            }
        }
    );
});

app.get('/api/profile', authenticate, (req, res) => {
    db.get(
        'SELECT * FROM profile WHERE user_id = ?',
        [req.user.id],
        (err, profile) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load profile.'
                });
            }

            if (profile) {
                return res.json(profile);
            }

            db.get(
                'SELECT name FROM users WHERE id = ?',
                [req.user.id],
                (userErr, user) => {
                    if (userErr || !user) {
                        return res.status(404).json({
                            error: 'User not found.'
                        });
                    }

                    db.run(
                        `INSERT INTO profile
                        (user_id, name, school, gradeLevel, strand, targetCourse)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [req.user.id, user.name, 'Not set', 'Grade 12', 'Academic', 'Not set'],
                        function (insertErr) {
                            if (insertErr) {
                                return res.status(500).json({
                                    error: 'Unable to create profile.'
                                });
                            }

                            db.get(
                                'SELECT * FROM profile WHERE id = ?',
                                [this.lastID],
                                (fetchErr, newProfile) => {
                                    if (fetchErr) {
                                        return res.status(500).json({
                                            error: 'Unable to load profile.'
                                        });
                                    }

                                    res.json(newProfile || {});
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

app.put('/api/profile', authenticate, (req, res) => {
    const { name, school, gradeLevel, strand, targetCourse } = req.body;

    db.run(
        `INSERT INTO profile
        (user_id, name, school, gradeLevel, strand, targetCourse)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            name = excluded.name,
            school = excluded.school,
            gradeLevel = excluded.gradeLevel,
            strand = excluded.strand,
            targetCourse = excluded.targetCourse`,
        [
            req.user.id,
            name || '',
            school || '',
            gradeLevel || '',
            strand || '',
            targetCourse || ''
        ],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to update profile.'
                });
            }

            db.get(
                'SELECT * FROM profile WHERE user_id = ?',
                [req.user.id],
                (fetchErr, profile) => {
                    if (fetchErr) {
                        return res.status(500).json({
                            error: 'Unable to retrieve updated profile.'
                        });
                    }

                    res.json({
                        message: 'Profile updated successfully.',
                        profile
                    });
                }
            );
        }
    );
});

app.get('/api/saved-scholarships', authenticate, (req, res) => {
    db.all(
        'SELECT * FROM saved_scholarships WHERE user_id = ? ORDER BY name ASC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load saved scholarships.'
                });
            }

            res.json(rows);
        }
    );
});

app.post('/api/saved-scholarships', authenticate, (req, res) => {
    const scholarship = req.body || {};
    const id = scholarship.id || `scholarship-${Date.now()}`;

    db.run(
        `INSERT INTO saved_scholarships
        (id, user_id, name, description, eligibility, benefits, deadline,
        type, educationLevel, needsVerification, officialLink, applicationStatus)
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
        [
            id,
            req.user.id,
            scholarship.name || '',
            scholarship.description || '',
            scholarship.eligibility || '',
            scholarship.benefits || '',
            scholarship.deadline || '',
            scholarship.type || '',
            scholarship.educationLevel || '',
            Boolean(scholarship.needsVerification),
            scholarship.officialLink || '',
            scholarship.applicationStatus || 'Interested'
        ],
        function (err) {
            if (err) {
                console.error('Save scholarship error:', err.message);
                return res.status(500).json({
                    error: 'Unable to save scholarship.'
                });
            }

            res.status(201).json({
                message: 'Saved scholarship updated.'
            });
        }
    );
});

app.patch('/api/saved-scholarships/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { applicationStatus } = req.body;

    db.run(
        'UPDATE saved_scholarships SET applicationStatus = ? WHERE id = ? AND user_id = ?',
        [applicationStatus || 'Interested', id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to update scholarship status.'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Saved scholarship not found.'
                });
            }

            res.json({
                message: 'Scholarship status updated.'
            });
        }
    );
});

app.delete('/api/saved-scholarships/:id', authenticate, (req, res) => {
    const { id } = req.params;

    db.run(
        'DELETE FROM saved_scholarships WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to remove scholarship.'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Saved scholarship not found.'
                });
            }

            res.json({
                message: 'Saved scholarship removed.'
            });
        }
    );
});

app.get('/api/grades', authenticate, (req, res) => {
    db.all(
        'SELECT * FROM grades WHERE user_id = ? ORDER BY id DESC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load grades.'
                });
            }

            res.json(rows.map(row => ({
                ...row,
                grade: Number(row.grade)
            })));
        }
    );
});

app.post('/api/grades', authenticate, (req, res) => {
    const { subject, grade, period } = req.body;

    if (
        typeof subject !== 'string' ||
        !subject.trim() ||
        grade === undefined ||
        grade === null ||
        !Number.isFinite(Number(grade)) ||
        typeof period !== 'string' ||
        !period.trim()
    ) {
        return res.status(400).json({
            error: 'Subject, valid grade, and period are required.'
        });
    }

    db.run(
        'INSERT INTO grades (user_id, subject, grade, period) VALUES (?, ?, ?, ?)',
        [req.user.id, subject.trim(), Number(grade), period.trim()],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to add grade.'
                });
            }

            db.get(
                'SELECT * FROM grades WHERE id = ?',
                [this.lastID],
                (fetchErr, row) => {
                    if (fetchErr) {
                        return res.status(500).json({
                            error: 'Unable to retrieve added grade.'
                        });
                    }

                    res.status(201).json({
                        ...row,
                        grade: Number(row.grade)
                    });
                }
            );
        }
    );
});

app.delete('/api/grades/:id', authenticate, (req, res) => {
    db.run(
        'DELETE FROM grades WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to remove grade.'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Grade not found.'
                });
            }

            res.json({
                message: 'Grade removed.'
            });
        }
    );
});

app.get('/api/checklist', authenticate, (req, res) => {
    db.all(
        'SELECT * FROM checklist WHERE user_id = ? ORDER BY id ASC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load checklist.'
                });
            }

            res.json(rows.map(row => ({
                ...row,
                completed: Boolean(row.completed)
            })));
        }
    );
});

app.post('/api/checklist', authenticate, (req, res) => {
    const { name, completed = false } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
            error: 'Checklist item name is required.'
        });
    }

    db.run(
        'INSERT INTO checklist (user_id, name, completed) VALUES (?, ?, ?)',
        [req.user.id, name.trim(), completed ? 1 : 0],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to add checklist item.'
                });
            }

            db.get(
                'SELECT * FROM checklist WHERE id = ?',
                [this.lastID],
                (fetchErr, row) => {
                    if (fetchErr) {
                        return res.status(500).json({
                            error: 'Unable to retrieve checklist item.'
                        });
                    }

                    res.status(201).json({
                        ...row,
                        completed: Boolean(row.completed)
                    });
                }
            );
        }
    );
});

app.patch('/api/checklist/:id', authenticate, (req, res) => {
    const { completed } = req.body;

    if (typeof completed !== 'boolean') {
        return res.status(400).json({
            error: 'A valid completed value is required.'
        });
    }

    db.run(
        'UPDATE checklist SET completed = ? WHERE id = ? AND user_id = ?',
        [completed ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to update checklist item.'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Checklist item not found.'
                });
            }

            res.json({
                message: 'Checklist item updated.'
            });
        }
    );
});

app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: 'Email and password are required.'
        });
    }

    db.get(
        'SELECT * FROM users WHERE email = ?',
        [email.trim().toLowerCase()],
        async (err, user) => {
            if (err) {
                return res.status(500).json({
                    error: 'Server error during administrator login.'
                });
            }

            if (!user || user.role !== 'admin') {
                return res.status(401).json({
                    error: 'Invalid administrator credentials.'
                });
            }

            try {
                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(401).json({
                        error: 'Invalid administrator credentials.'
                    });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email, role: 'admin' },
                    JWT_SECRET,
                    { expiresIn: '1d' }
                );

                res.json({
                    message: 'Administrator login successful.',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: 'admin'
                    }
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Administrator login failed.'
                });
            }
        }
    );
});

app.post('/api/admin/register', async (req, res) => {
    const { name, email, password, registrationKey } = req.body;
    const configuredKey = process.env.ADMIN_REGISTRATION_KEY;

    if (!configuredKey) {
        return res.status(503).json({
            error: 'Administrator registration is not configured on the server.'
        });
    }

    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof registrationKey !== 'string' ||
        !name.trim() ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: 'Name, email, password, and registration key are required.'
        });
    }

    const submittedKey = Buffer.from(registrationKey);
    const expectedKey = Buffer.from(configuredKey);
    if (
        submittedKey.length !== expectedKey.length ||
        !crypto.timingSafeEqual(submittedKey, expectedKey)
    ) {
        return res.status(403).json({
            error: 'Invalid administrator registration key.'
        });
    }

    if (password.length < 12) {
        return res.status(400).json({
            error: 'Administrator passwords must be at least 12 characters long.'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, 'admin'],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({
                            error: 'An account with this email already exists.'
                        });
                    }

                    console.error('Administrator registration error:', err.message);
                    return res.status(500).json({
                        error: 'Unable to register administrator.'
                    });
                }

                res.status(201).json({
                    message: 'Administrator registered. You can now log in.'
                });
            }
        );
    } catch (error) {
        console.error('Administrator registration error:', error);
        res.status(500).json({
            error: 'Unable to register administrator.'
        });
    }
});

app.get('/api/scholarships', authenticate, (req, res) => {
    db.all(
        'SELECT * FROM scholarships ORDER BY deadline ASC, name ASC',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load scholarships.'
                });
            }

            res.json(rows.map(row => ({
                ...row,
                id: `admin-scholarship-${row.id}`,
                benefits: `₱${Number(row.amount).toLocaleString()} per award · ${row.slots} slots`,
                type: row.type,
                educationLevel: row.educationLevel,
                needsVerification: false,
                officialLink: ''
            })));
        }
    );
});

app.get('/api/admin/scholarships', authenticate, requireAdmin, (req, res) => {
    db.all(
        'SELECT * FROM scholarships ORDER BY id DESC',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load scholarships.'
                });
            }
            res.json(rows);
        }
    );
});

app.post('/api/admin/scholarships', authenticate, requireAdmin, (req, res) => {
    const { name, amount, slots, deadline, status, description, eligibility, type, educationLevel } = req.body;
    const numericAmount = Number(amount);
    const numericSlots = Number(slots);

    if (
        typeof name !== 'string' || !name.trim() ||
        !Number.isFinite(numericAmount) || numericAmount <= 0 ||
        !Number.isInteger(numericSlots) || numericSlots < 1 ||
        typeof deadline !== 'string' || !deadline.trim() || Number.isNaN(Date.parse(deadline)) ||
        !['Open', 'Closed'].includes(status) ||
        typeof description !== 'string' || !description.trim() ||
        typeof eligibility !== 'string' || !eligibility.trim() ||
        typeof type !== 'string' || !type.trim() ||
        typeof educationLevel !== 'string' || !educationLevel.trim()
    ) {
        return res.status(400).json({
            error: 'Provide a name, positive award amount, available slots, valid deadline, status, details, eligibility, type, and education level.'
        });
    }

    db.run(
        `INSERT INTO scholarships
         (name, amount, slots, deadline, status, description, eligibility, type, educationLevel, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name.trim(),
            numericAmount,
            numericSlots,
            deadline,
            status,
            description.trim(),
            eligibility.trim(),
            type.trim(),
            educationLevel.trim(),
            req.user.id
        ],
        function (err) {
            if (err) {
                console.error('Scholarship creation failed:', err.message);
                return res.status(500).json({
                    error: 'Unable to create scholarship.'
                });
            }
            res.status(201).json({
                id: this.lastID,
                name: name.trim(),
                amount: numericAmount,
                slots: numericSlots,
                deadline,
                status,
                description: description.trim(),
                eligibility: eligibility.trim(),
                type: type.trim(),
                educationLevel: educationLevel.trim()
            });
        }
    );
});

app.delete('/api/admin/scholarships/:id', authenticate, requireAdmin, (req, res) => {
    const scholarshipId = Number(req.params.id);
    if (!Number.isInteger(scholarshipId) || scholarshipId < 1) {
        return res.status(400).json({
            error: 'A valid scholarship ID is required.'
        });
    }

    db.run(
        'DELETE FROM scholarships WHERE id = ?',
        [scholarshipId],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to delete scholarship.'
                });
            }
            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Scholarship not found.'
                });
            }
            res.json({ message: 'Scholarship deleted.' });
        }
    );
});

app.get('/api/admin/applications', authenticate, requireAdmin, (req, res) => {
    const filter = req.query.status || 'All';
    const filterConditions = {
        All: '',
        New: `AND lower(s.applicationStatus) NOT IN ('awarded', 'accepted', 'not selected')`,
        Awarded: `AND lower(s.applicationStatus) IN ('awarded', 'accepted')`,
        'Not Selected': `AND lower(s.applicationStatus) = 'not selected'`
    };

    if (!Object.hasOwn(filterConditions, filter)) {
        return res.status(400).json({
            error: 'Invalid application filter.'
        });
    }

    db.all(
        `SELECT
            s.user_id AS userId,
            s.id AS scholarshipId,
            s.name AS scholarshipName,
            s.applicationStatus AS status,
            s.deadline,
            u.name AS applicantName,
            u.email AS applicantEmail
         FROM saved_scholarships s
         JOIN users u ON u.id = s.user_id
         WHERE u.role = 'student' ${filterConditions[filter]}
         ORDER BY s.id DESC`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load applications.'
                });
            }
            res.json(rows);
        }
    );
});

app.patch('/api/admin/applications/:userId/:scholarshipId', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.userId);
    const { status } = req.body;
    const allowedStatuses = ['New', 'Awarded', 'Not Selected'];

    if (!Number.isInteger(userId) || userId < 1 || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            error: 'A valid application and status are required.'
        });
    }

    db.run(
        'UPDATE saved_scholarships SET applicationStatus = ? WHERE user_id = ? AND id = ?',
        [status, userId, req.params.scholarshipId],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to update application status.'
                });
            }
            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Application not found.'
                });
            }
            res.json({ message: 'Application status updated.' });
        }
    );
});

app.delete('/api/admin/users/:userId', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'A valid student ID is required.' });
    }

    if (userId === Number(req.user.id)) {
        return res.status(403).json({ error: 'You cannot delete your own account here.' });
    }

    db.get('SELECT role FROM users WHERE id = ?', [userId], (lookupErr, student) => {
        if (lookupErr) {
            console.error('Could not look up student account for deletion:', lookupErr.message);
            return res.status(500).json({ error: 'Unable to delete the student account.' });
        }

        if (!student) {
            return res.status(404).json({ error: 'Student account not found.' });
        }

        if (student.role !== 'student') {
            return res.status(403).json({ error: 'Only student accounts can be deleted here.' });
        }

        db.run('DELETE FROM users WHERE id = ? AND role = ?', [userId, 'student'], function (deleteErr) {
            if (deleteErr) {
                console.error('Could not delete student account:', deleteErr.message);
                return res.status(500).json({ error: 'Unable to delete the student account.' });
            }

            if (this.changes !== 1) {
                return res.status(404).json({ error: 'Student account not found.' });
            }

            res.json({ message: 'Student account and associated records were deleted.' });
        });
    });
});

app.get('/api/admin/users/:userId/checklist', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'A valid user ID is required.' });
    }

    db.all(
        'SELECT id, name, completed FROM checklist WHERE user_id = ? ORDER BY id ASC',
        [userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load user checklist.' });
            }
            res.json(rows.map(row => ({ ...row, completed: Boolean(row.completed) })));
        }
    );
});

app.post('/api/admin/users/:userId/checklist', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.userId);
    const { name } = req.body;
    if (!Number.isInteger(userId) || userId < 1 || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'A valid user and checklist item are required.' });
    }

    db.get('SELECT id FROM users WHERE id = ? AND role = ?', [userId, 'student'], (userErr, user) => {
        if (userErr) {
            return res.status(500).json({ error: 'Unable to verify student account.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        db.run(
            'INSERT INTO checklist (user_id, name, completed) VALUES (?, ?, 0)',
            [userId, name.trim()],
            function (insertErr) {
                if (insertErr) {
                    return res.status(500).json({ error: 'Unable to add checklist item.' });
                }
                res.status(201).json({
                    id: this.lastID,
                    name: name.trim(),
                    completed: false
                });
            }
        );
    });
});

app.delete('/api/admin/users/:userId/checklist/:itemId', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.params.userId);
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(itemId) || itemId < 1) {
        return res.status(400).json({ error: 'A valid user and checklist item are required.' });
    }

    db.run(
        'DELETE FROM checklist WHERE id = ? AND user_id = ?',
        [itemId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Unable to delete checklist item.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Checklist item not found.' });
            }
            res.json({ message: 'Checklist item deleted.' });
        }
    );
});

app.get('/api/admin/announcements', authenticate, requireAdmin, (req, res) => {
    db.all(
        'SELECT id, title, message, pinned, created_at FROM announcements ORDER BY pinned DESC, id DESC',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load announcements.' });
            }
            res.json(rows.map(row => ({ ...row, pinned: Boolean(row.pinned) })));
        }
    );
});

app.get('/api/announcements', authenticate, (req, res) => {
    db.all(
        'SELECT id, title, message, pinned, created_at FROM announcements ORDER BY pinned DESC, id DESC',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load announcements.' });
            }
            res.json(rows.map(row => ({ ...row, pinned: Boolean(row.pinned) })));
        }
    );
});

app.post('/api/admin/announcements', authenticate, requireAdmin, (req, res) => {
    const { title, message } = req.body;
    if (typeof title !== 'string' || !title.trim() || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Announcement title and message are required.' });
    }

    db.run(
        'INSERT INTO announcements (title, message, created_by) VALUES (?, ?, ?)',
        [title.trim(), message.trim(), req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Unable to create announcement.' });
            }
            res.status(201).json({
                id: this.lastID,
                title: title.trim(),
                message: message.trim(),
                pinned: false
            });
        }
    );
});

app.patch('/api/admin/announcements/:id/pin', authenticate, requireAdmin, (req, res) => {
    const announcementId = Number(req.params.id);
    const { pinned } = req.body;
    if (!Number.isInteger(announcementId) || announcementId < 1 || typeof pinned !== 'boolean') {
        return res.status(400).json({ error: 'A valid announcement and pinned value are required.' });
    }

    db.run(
        'UPDATE announcements SET pinned = ? WHERE id = ?',
        [pinned ? 1 : 0, announcementId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Unable to update announcement.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Announcement not found.' });
            }
            res.json({ message: 'Announcement updated.' });
        }
    );
});

app.delete('/api/admin/announcements/:id', authenticate, requireAdmin, (req, res) => {
    const announcementId = Number(req.params.id);
    if (!Number.isInteger(announcementId) || announcementId < 1) {
        return res.status(400).json({ error: 'A valid announcement ID is required.' });
    }

    db.run('DELETE FROM announcements WHERE id = ?', [announcementId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Unable to delete announcement.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }
        res.json({ message: 'Announcement deleted.' });
    });
});

app.post('/api/admin/notifications', authenticate, requireAdmin, (req, res) => {
    const userId = Number(req.body.userId);
    const { title, message } = req.body;
    if (
        !Number.isInteger(userId) || userId < 1 ||
        typeof title !== 'string' || !title.trim() ||
        typeof message !== 'string' || !message.trim()
    ) {
        return res.status(400).json({ error: 'A student, title, and reminder message are required.' });
    }

    db.get('SELECT id FROM users WHERE id = ? AND role = ?', [userId, 'student'], (userErr, user) => {
        if (userErr) {
            return res.status(500).json({ error: 'Unable to verify student account.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        db.run(
            'INSERT INTO notifications (user_id, title, message, created_by) VALUES (?, ?, ?, ?)',
            [userId, title.trim(), message.trim(), req.user.id],
            function (insertErr) {
                if (insertErr) {
                    return res.status(500).json({ error: 'Unable to send reminder.' });
                }
                res.status(201).json({
                    id: this.lastID,
                    userId,
                    title: title.trim(),
                    message: message.trim()
                });
            }
        );
    });
});

app.get('/api/admin/notifications', authenticate, requireAdmin, (req, res) => {
    db.all(
        `SELECT n.id, n.user_id AS userId, n.title, n.message, n.created_at,
                u.name AS studentName, u.email AS studentEmail
         FROM notifications n
         JOIN users u ON u.id = n.user_id
         ORDER BY n.id DESC LIMIT 100`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load reminders.' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/notifications', authenticate, (req, res) => {
    db.all(
        'SELECT id, title, message, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load notifications.' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/admin/profile', authenticate, requireAdmin, (req, res) => {
    db.get(
        `SELECT u.name, u.email, p.title, p.campus, p.department
         FROM users u
         LEFT JOIN admin_profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [req.user.id],
        (err, profile) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to load administrator profile.' });
            }
            if (!profile) {
                return res.status(404).json({ error: 'Administrator account not found.' });
            }
            res.json({
                ...profile,
                title: profile.title || 'Administrator',
                campus: profile.campus || '',
                department: profile.department || ''
            });
        }
    );
});

app.put('/api/admin/profile', authenticate, requireAdmin, (req, res) => {
    const { name, email, title, campus, department } = req.body;
    if (
        typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof title !== 'string' || !title.trim() ||
        typeof campus !== 'string' ||
        typeof department !== 'string'
    ) {
        return res.status(400).json({ error: 'Name, contact email, title, campus, and department are required.' });
    }

    db.run(
        'UPDATE users SET name = ?, email = ? WHERE id = ? AND role = ?',
        [name.trim(), email.trim().toLowerCase(), req.user.id, 'admin'],
        function (userErr) {
            if (userErr) {
                if (userErr.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'That email address is already in use.' });
                }
                return res.status(500).json({ error: 'Unable to update administrator account.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Administrator account not found.' });
            }

            db.run(
                `INSERT INTO admin_profiles (user_id, title, campus, department)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                    title = excluded.title,
                    campus = excluded.campus,
                    department = excluded.department`,
                [req.user.id, title.trim(), campus.trim(), department.trim()],
                (profileErr) => {
                    if (profileErr) {
                        return res.status(500).json({ error: 'Unable to update administrator profile.' });
                    }
                    res.json({
                        name: name.trim(),
                        email: email.trim().toLowerCase(),
                        title: title.trim(),
                        campus: campus.trim(),
                        department: department.trim()
                    });
                }
            );
        }
    );
});

app.put('/api/admin/password', authenticate, requireAdmin, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (
        typeof currentPassword !== 'string' || !currentPassword ||
        typeof newPassword !== 'string' || newPassword.length < 12
    ) {
        return res.status(400).json({
            error: 'Current password and a new password of at least 12 characters are required.'
        });
    }

    db.get('SELECT password FROM users WHERE id = ? AND role = ?', [req.user.id, 'admin'], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to verify administrator password.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Administrator account not found.' });
        }

        try {
            if (!(await bcrypt.compare(currentPassword, user.password))) {
                return res.status(401).json({ error: 'Current password is incorrect.' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            db.run(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, req.user.id],
                (updateErr) => {
                    if (updateErr) {
                        return res.status(500).json({ error: 'Unable to update administrator password.' });
                    }
                    res.json({ message: 'Administrator password updated.' });
                }
            );
        } catch (error) {
            console.error('Administrator password change failed:', error.message);
            res.status(500).json({ error: 'Unable to update administrator password.' });
        }
    });
});

app.get('/api/admin/dashboard', authenticate, requireAdmin, (req, res) => {
    db.all(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            p.school,
            p.gradeLevel,
            p.strand,
            p.targetCourse,
            (SELECT COUNT(*) FROM saved_scholarships s WHERE s.user_id = u.id) AS applicationCount
        FROM users u
        LEFT JOIN profile p ON p.user_id = u.id
        ORDER BY u.id DESC`,
        [],
        (usersErr, users) => {
            if (usersErr) {
                return res.status(500).json({
                    error: 'Unable to load administrator dashboard.'
                });
            }

            db.get(
                `SELECT
                    (SELECT COUNT(*) FROM users) AS totalUsers,
                    (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
                    (SELECT COUNT(DISTINCT user_id) FROM saved_scholarships) AS applicants,
                    (SELECT COUNT(*) FROM saved_scholarships) AS applications,
                    (SELECT COUNT(*) FROM scholarships) AS scholarships,
                    (SELECT COUNT(*) FROM saved_scholarships
                        WHERE lower(applicationStatus) IN ('awarded', 'accepted')) AS awardedApplications,
                    (SELECT COUNT(*) FROM saved_scholarships
                        WHERE lower(applicationStatus) NOT IN ('awarded', 'accepted', 'not selected')) AS pendingApplications,
                    (SELECT COUNT(*) FROM announcements) AS announcements,
                    (SELECT COUNT(*) FROM checklist) AS checklistItems`,
                [],
                (statsErr, stats) => {
                    if (statsErr) {
                        return res.status(500).json({
                            error: 'Unable to load dashboard statistics.'
                        });
                    }

                    res.json({
                        stats,
                        users
                    });
                }
            );
        }
    );
});

app.use('/api', (req, res) => {
    res.status(404).json({
        error: `API route not found: ${req.method} ${req.originalUrl}`
    });
});
