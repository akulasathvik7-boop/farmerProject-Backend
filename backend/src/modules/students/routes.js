const express = require('express');
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middlewares/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(authenticate);

// GET all students
router.get('/', authorize('super_admin', 'dept_admin', 'faculty', 'grc_member'), async (req, res) => {
  try {
    const { program_id, status, semester, search, page = 1, limit = 20 } = req.query;
    let query = `SELECT s.*, p.name as program_name, p.code as program_code, u.email FROM students s
                 LEFT JOIN programs p ON s.program_id = p.id
                 LEFT JOIN users u ON s.user_id = u.id WHERE 1=1`;
    const params = [];
    if (program_id) { query += ' AND s.program_id = ?'; params.push(program_id); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (semester) { query += ' AND s.current_semester = ?'; params.push(semester); }
    if (search) { query += ' AND (s.full_name LIKE ? OR s.student_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY s.full_name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [students] = await pool.execute(query, params);
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM students WHERE 1=1', []);
    res.json({ success: true, data: students, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single student
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT s.*, p.name as program_name, p.code as program_code, d.name as dept_name, u.email
      FROM students s LEFT JOIN programs p ON s.program_id = p.id LEFT JOIN departments d ON p.department_id = d.id LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ? OR s.student_id = ?`, [req.params.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });

    // If student role, only allow own profile
    if (req.user.role === 'student' && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create student
router.post('/', authorize('super_admin', 'dept_admin'), async (req, res) => {
  try {
    const { full_name, email, program_id, current_semester, admission_year, date_of_birth, phone, address, guardian_name, guardian_phone, guardian_email } = req.body;
    if (!full_name || !email || !program_id || !admission_year) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const uid = uuidv4(); const sid = uuidv4();
    const hash = await bcrypt.hash('student123', 10);
    const [prog] = await pool.execute('SELECT code FROM programs WHERE id = ?', [program_id]);
    const year = String(admission_year).slice(-2);
    const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM students WHERE admission_year = ?', [admission_year]);
    const studentCode = `${admission_year}${prog[0]?.code || 'CS'}${String(cnt + 1).padStart(4, '0')}`;

    await pool.execute('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [uid, email, hash, 'student']);
    await pool.execute(`INSERT INTO students (id, user_id, student_id, full_name, date_of_birth, phone, address, program_id, current_semester, admission_year, guardian_name, guardian_phone, guardian_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sid, uid, studentCode, full_name, date_of_birth || null, phone || null, address || null, program_id, current_semester || 1, admission_year, guardian_name || null, guardian_phone || null, guardian_email || null]);

    res.status(201).json({ success: true, data: { id: sid, student_id: studentCode, full_name, email }, message: 'Student created. Default password: student123' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET student attendance summary
router.get('/:id/attendance', async (req, res) => {
  try {
    const [student] = await pool.execute('SELECT * FROM students WHERE id = ? OR student_id = ?', [req.params.id, req.params.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const [summary] = await pool.execute(`
      SELECT c.name as course_name, c.code as course_code,
        COUNT(cs.id) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(cs.id), 0), 1) as percentage
      FROM courses c
      JOIN class_sessions cs ON cs.course_id = c.id
      LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = ?
      WHERE c.program_id = ?
      GROUP BY c.id, c.name, c.code
      ORDER BY percentage ASC
    `, [student[0].id, student[0].program_id]);

    const overall = summary.length ? (summary.reduce((acc, s) => acc + (s.percentage || 0), 0) / summary.length).toFixed(1) : 0;
    res.json({ success: true, data: { overall: parseFloat(overall), subjects: summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET student results
router.get('/:id/results', async (req, res) => {
  try {
    const [student] = await pool.execute('SELECT * FROM students WHERE id = ? OR student_id = ?', [req.params.id, req.params.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const [results] = await pool.execute(`
      SELECT r.*, e.name as exam_name, e.exam_type, e.max_marks, e.exam_date, c.name as course_name, c.code as course_code
      FROM results r JOIN exams e ON r.exam_id = e.id JOIN courses c ON e.course_id = c.id
      WHERE r.student_id = ? AND r.is_published = 1
      ORDER BY e.exam_date DESC
    `, [student[0].id]);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET student fees
router.get('/:id/fees', async (req, res) => {
  try {
    const [student] = await pool.execute('SELECT * FROM students WHERE id = ? OR student_id = ?', [req.params.id, req.params.id]);
    if (!student.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const [payments] = await pool.execute('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC', [student[0].id]);
    const [structure] = await pool.execute('SELECT * FROM fee_structures WHERE program_id = ? AND semester = ?', [student[0].program_id, student[0].current_semester]);

    const totalPaid = payments.filter(p => p.status === 'success').reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const totalDue = structure[0]?.total_fee || 0;

    res.json({ success: true, data: { payments, feeStructure: structure[0] || null, totalPaid, totalDue, balance: totalDue - totalPaid } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
