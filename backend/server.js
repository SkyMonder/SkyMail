require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// JWT middleware
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const email = username + '@skymail.com';
  const existing = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  if (existing.rowCount > 0) return res.status(400).json({ error: 'Username taken' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3)', [username, email, hash]);
  res.json({ ok: true, email });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const r = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  if (r.rowCount === 0) return res.status(400).json({ error: 'User not found' });
  const user = r.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET);
  res.json({ token, email: user.email });
});

// Send message
app.post('/api/send', auth, async (req, res) => {
  const { to, subject, body } = req.body;
  const r = await pool.query('SELECT id FROM users WHERE username=$1', [to]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Recipient not found' });
  const recipient_id = r.rows[0].id;
  await pool.query('INSERT INTO messages (sender_id, recipient_id, subject, body) VALUES ($1,$2,$3,$4)',
    [req.user.id, recipient_id, subject, body]);
  res.json({ ok: true });
});

// Inbox
app.get('/api/inbox', auth, async (req, res) => {
  const r = await pool.query('SELECT m.id, u.email as from, m.subject, m.body, m.created_at FROM messages m JOIN users u ON m.sender_id=u.id WHERE recipient_id=$1 ORDER BY m.created_at DESC', [req.user.id]);
  res.json(r.rows);
});

// WebRTC signaling
io.on('connection', (socket) => {
  socket.on('register_socket', (username) => {
    socket.username = username;
    socket.join(username);
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.username, signal: data.signal });
  });

  socket.on('end_call', (data) => {
    io.to(data.to).emit('call_ended', { from: socket.username });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));
