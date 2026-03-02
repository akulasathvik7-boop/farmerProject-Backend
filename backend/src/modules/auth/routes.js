const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Get role-specific profile
    let profile = null;
    if (user.role === 'student') {
      const [rows] = await pool.execute(`SELECT s.*, p.name as program_name, p.code as program_code FROM students s LEFT JOIN programs p ON s.program_id = p.id WHERE s.user_id = ?`, [user.id]);
      profile = rows[0] || null;
    } else if (user.role === 'faculty') {
      const [rows] = await pool.execute(`SELECT f.*, d.name as dept_name FROM faculty f LEFT JOIN departments d ON f.department_id = d.id WHERE f.user_id = ?`, [user.id]);
      profile = rows[0] || null;
    }

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileId: profile?.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: user.role, profile }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, email, role, is_active, last_login, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });

    let profile = null;
    const user = users[0];
    if (user.role === 'student') {
      const [rows] = await pool.execute(`SELECT s.*, p.name as program_name, d.name as dept_name FROM students s LEFT JOIN programs p ON s.program_id = p.id LEFT JOIN departments d ON p.department_id = d.id WHERE s.user_id = ?`, [user.id]);
      profile = rows[0] || null;
    } else if (user.role === 'faculty') {
      const [rows] = await pool.execute(`SELECT f.*, d.name as dept_name FROM faculty f LEFT JOIN departments d ON f.department_id = d.id WHERE f.user_id = ?`, [user.id]);
      profile = rows[0] || null;
    }

    res.json({ success: true, user: { ...user, profile } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
