const express = require('express');
const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve static files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin', (req, res) => res.redirect('/admin.html'));

// ── Config ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'bollywood-secret-key-2026';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'BollywoodAdmin@2025', 10);

// ── Database Setup ───────────────────────────────────────────────────────────
// SQLite file stored in /data folder so it persists on Railway/Render volumes
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'registrations.db'));

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_id      TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    act         TEXT NOT NULL,
    registered_at TEXT NOT NULL
  )
`);

// Helper: generate next BLD-XXXX id
function generateRegId() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM registrations').get();
  return `BLD-${String(row.cnt + 1).padStart(4, '0')}`;
}

// ── Auth Middleware ──────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Public Routes ────────────────────────────────────────────────────────────

// Register a performer
app.post('/api/register', (req, res) => {
  const { name, phone, act } = req.body;
  if (!name || !phone || !act) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const validActs = ['Dance', 'Singing', 'Acting'];
  if (!validActs.includes(act)) {
    return res.status(400).json({ error: 'Invalid act' });
  }

  try {
    const regId = generateRegId();
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    db.prepare(
      'INSERT INTO registrations (reg_id, name, phone, act, registered_at) VALUES (?, ?, ?, ?, ?)'
    ).run(regId, name.trim(), phone.trim(), act, timestamp);

    res.json({ success: true, registrationId: regId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Admin Routes ─────────────────────────────────────────────────────────────

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Get all registrations
app.get('/api/admin/registrations', authRequired, (req, res) => {
  const registrations = db.prepare(
    'SELECT * FROM registrations ORDER BY id DESC'
  ).all();
  res.json({ registrations, total: registrations.length });
});

// Delete a registration
app.delete('/api/admin/registrations/:regId', authRequired, (req, res) => {
  const { regId } = req.params;
  const result = db.prepare('DELETE FROM registrations WHERE reg_id = ?').run(regId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  res.json({ success: true });
});

// Download Excel
app.get('/api/admin/download', authRequired, (req, res) => {
  const registrations = db.prepare('SELECT * FROM registrations ORDER BY id ASC').all();

  const wb = xlsx.utils.book_new();
  const wsData = [
    ['Registration ID', 'Full Name', 'Phone', 'Act'],
    ...registrations.map(r => [r.reg_id, r.name, r.phone, r.act])
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
  xlsx.utils.book_append_sheet(wb, ws, 'Registrations');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="bollywood-day-registrations.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎬 Bollywood Day Server → http://localhost:${PORT}`);
  console.log(`🔐 Admin panel       → http://localhost:${PORT}/admin.html`);
  console.log(`🗄️  Database          → ${path.join(DATA_DIR, 'registrations.db')}\n`);
});