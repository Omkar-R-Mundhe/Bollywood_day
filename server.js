const express = require('express');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin.html');
});

// ── Config ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'bollywood-secret-key-2026';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'BollywoodAdmin@2025', 10);
const EXCEL_FILE = path.join(__dirname, 'data', 'registrations.xlsx');

// Ensure data directory and Excel file exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

function getWorkbook() {
  if (fs.existsSync(EXCEL_FILE)) {
    return xlsx.readFile(EXCEL_FILE);
  }
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([
    ['Registration ID', 'Full Name', 'Email', 'Phone', 'Act', 'Registered At']
  ]);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 24 }, { wch: 30 },
    { wch: 18 }, { wch: 12 }, { wch: 24 }
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Registrations');
  xlsx.writeFile(wb, EXCEL_FILE);
  return wb;
}

function getNextId(ws) {
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  return `BLD-${String(data.length).padStart(4, '0')}`;
}

// ── Auth middleware ──────────────────────────────────────
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

// ── Routes ───────────────────────────────────────────────

// Register a performer
app.post('/api/register', (req, res) => {
  const { name, email, phone, act } = req.body;
  if (!name || !email || !phone || !act) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const validActs = ['Dance', 'Singing', 'Acting'];
  if (!validActs.includes(act)) {
    return res.status(400).json({ error: 'Invalid act' });
  }

  try {
    const wb = getWorkbook();
    const ws = wb.Sheets['Registrations'];
    const regId = getNextId(ws);
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    xlsx.utils.sheet_add_aoa(ws, [[regId, name, email, phone, act, timestamp]], { origin: -1 });
    xlsx.writeFile(wb, EXCEL_FILE);

    res.json({ success: true, registrationId: regId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Get all registrations (admin only)
app.get('/api/admin/registrations', authRequired, (req, res) => {
  const wb = getWorkbook();
  const ws = wb.Sheets['Registrations'];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const [headers, ...data] = rows;
  const registrations = data.map(row => ({
    id: row[0], name: row[1], email: row[2],
    phone: row[3], act: row[4], timestamp: row[5]
  }));
  res.json({ registrations, total: registrations.length });
});

// Download Excel (admin only)
app.get('/api/admin/download', authRequired, (req, res) => {
  if (!fs.existsSync(EXCEL_FILE)) {
    return res.status(404).json({ error: 'No data yet' });
  }
  res.download(EXCEL_FILE, 'bollywood-day-registrations.xlsx');
});

// ── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎬 Bollywood Day Registration Server running at http://localhost:${PORT}`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`📊 Excel file: ${EXCEL_FILE}\n`);
});