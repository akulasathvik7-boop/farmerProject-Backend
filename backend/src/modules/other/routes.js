const express = require('express');
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middlewares/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(authenticate);

// Faculty routes
const facultyRouter = express.Router();
facultyRouter.use(authenticate);

facultyRouter.get('/', authorize('super_admin', 'dept_admin', 'grc_member'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT f.*, d.name as dept_name, u.email FROM faculty f LEFT JOIN departments d ON f.department_id = d.id LEFT JOIN users u ON f.user_id = u.id WHERE f.is_active = 1 ORDER BY f.full_name`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

facultyRouter.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT f.*, d.name as dept_name, u.email FROM faculty f LEFT JOIN departments d ON f.department_id = d.id LEFT JOIN users u ON f.user_id = u.id WHERE f.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Faculty not found' });
    const [courses] = await pool.execute('SELECT c.*, p.name as program_name FROM courses c LEFT JOIN programs p ON c.program_id = p.id WHERE c.faculty_id = ? AND c.is_active = 1', [req.params.id]);
    res.json({ success: true, data: { ...rows[0], courses } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Course routes
const courseRouter = express.Router();
courseRouter.use(authenticate);

courseRouter.get('/', async (req, res) => {
  try {
    const { program_id, semester, faculty_id } = req.query;
    let q = `SELECT c.*, p.name as program_name, f.full_name as faculty_name FROM courses c LEFT JOIN programs p ON c.program_id = p.id LEFT JOIN faculty f ON c.faculty_id = f.id WHERE c.is_active = 1`;
    const params = [];
    if (program_id) { q += ' AND c.program_id = ?'; params.push(program_id); }
    if (semester) { q += ' AND c.semester = ?'; params.push(semester); }
    if (faculty_id) { q += ' AND c.faculty_id = ?'; params.push(faculty_id); }
    q += ' ORDER BY c.semester, c.name';
    const [rows] = await pool.execute(q, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

courseRouter.get('/:id/sessions', authenticate, async (req, res) => {
  try {
    const [sessions] = await pool.execute('SELECT * FROM class_sessions WHERE course_id = ? ORDER BY session_date DESC LIMIT 30', [req.params.id]);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Programs & Departments
const programRouter = express.Router();
programRouter.use(authenticate);
programRouter.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT p.*, d.name as dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.is_active = 1 ORDER BY p.name`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const deptRouter = express.Router();
deptRouter.use(authenticate);
deptRouter.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM departments WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Payments
const paymentRouter = express.Router();
paymentRouter.use(authenticate);
paymentRouter.post('/initiate', async (req, res) => {
  try {
    const { student_id, amount, fee_structure_id, payment_method } = req.body;
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payId = uuidv4();
    await pool.execute('INSERT INTO payments (id, student_id, fee_structure_id, amount, payment_method, status, transaction_id, academic_year, semester) VALUES (?, ?, ?, ?, ?, "pending", ?, "2024-2025", 3)',
      [payId, student_id, fee_structure_id || null, amount, payment_method || 'upi', orderId]);
    res.json({ success: true, data: { paymentId: payId, orderId, amount, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentRouter.post('/verify', async (req, res) => {
  try {
    const { payment_id } = req.body;
    const receiptNo = `REC-${Date.now()}`;
    await pool.execute("UPDATE payments SET status = 'success', payment_date = NOW(), receipt_number = ? WHERE id = ?", [receiptNo, payment_id]);
    res.json({ success: true, data: { status: 'success', receiptNumber: receiptNo }, message: 'Payment verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Timetable
const timetableRouter = express.Router();
timetableRouter.use(authenticate);
timetableRouter.get('/', async (req, res) => {
  try {
    const { program_id, semester, academic_year = '2024-2025' } = req.query;
    let q = `SELECT t.*, c.name as course_name, c.code as course_code, f.full_name as faculty_name FROM timetable t LEFT JOIN courses c ON t.course_id = c.id LEFT JOIN faculty f ON t.faculty_id = f.id WHERE t.academic_year = ?`;
    const params = [academic_year];
    if (program_id) { q += ' AND t.program_id = ?'; params.push(program_id); }
    if (semester) { q += ' AND t.semester = ?'; params.push(semester); }
    q += ' ORDER BY FIELD(t.day_of_week,"monday","tuesday","wednesday","thursday","friday","saturday"), t.start_time';
    const [rows] = await pool.execute(q, params);
    // Group by day
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.day_of_week]) grouped[row.day_of_week] = [];
      grouped[row.day_of_week].push(row);
    }
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Announcements
const announcementRouter = express.Router();
announcementRouter.use(authenticate);
announcementRouter.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT a.*, u.email as created_by_email FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.is_active = 1 ORDER BY a.created_at DESC LIMIT 20`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
announcementRouter.post('/', authorize('super_admin', 'dept_admin', 'faculty'), async (req, res) => {
  try {
    const { title, content, target_role = 'all', priority = 'general' } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required' });
    const id = uuidv4();
    await pool.execute('INSERT INTO announcements (id, title, content, target_role, priority, created_by) VALUES (?, ?, ?, ?, ?, ?)', [id, title, content, target_role, priority, req.user.id]);
    res.status(201).json({ success: true, data: { id }, message: 'Announcement created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { facultyRouter, courseRouter, programRouter, deptRouter, paymentRouter, timetableRouter, announcementRouter };
