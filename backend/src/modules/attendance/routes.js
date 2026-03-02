const express = require('express');
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middlewares/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticate);

// POST create session
router.post('/session', authorize('faculty', 'super_admin', 'dept_admin'), async (req, res) => {
  try {
    const { course_id, session_date, start_time, end_time, topic } = req.body;
    const sessId = uuidv4();
    const qrCode = `ATT-${sessId}-${Date.now()}`;
    const qrExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await pool.execute(`INSERT INTO class_sessions (id, course_id, session_date, start_time, end_time, topic, qr_code, qr_expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessId, course_id, session_date, start_time || null, end_time || null, topic || null, qrCode, qrExpiry, req.user.id]);

    res.status(201).json({ success: true, data: { sessionId: sessId, qrCode, qrExpiry } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST mark attendance
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { session_id, student_ids, status = 'present' } = req.body;
    if (!session_id || !student_ids?.length) return res.status(400).json({ success: false, message: 'session_id and student_ids required' });

    let marked = 0;
    for (const sid of student_ids) {
      try {
        await pool.execute(`INSERT INTO attendance (id, student_id, session_id, status, marked_at, marked_by) VALUES (?, ?, ?, ?, NOW(), ?) ON DUPLICATE KEY UPDATE status = ?, marked_at = NOW()`,
          [uuidv4(), sid, session_id, status, req.user.id, status]);
        marked++;
      } catch (e) {}
    }
    res.json({ success: true, message: `Marked ${marked} students`, data: { marked } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET session attendance
router.get('/session/:id', authenticate, async (req, res) => {
  try {
    const [session] = await pool.execute('SELECT cs.*, c.name as course_name FROM class_sessions cs JOIN courses c ON cs.course_id = c.id WHERE cs.id = ?', [req.params.id]);
    if (!session.length) return res.status(404).json({ success: false, message: 'Session not found' });

    const [attendance] = await pool.execute(`SELECT a.*, s.full_name, s.student_id FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.session_id = ?`, [req.params.id]);
    // Get all enrolled students
    const [allStudents] = await pool.execute('SELECT id, full_name, student_id FROM students WHERE program_id = (SELECT program_id FROM courses WHERE id = ?) AND status = "active"', [session[0].course_id]);

    res.json({ success: true, data: { session: session[0], attendance, totalStudents: allStudents.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET course attendance report
router.get('/course/:courseId/report', authenticate, async (req, res) => {
  try {
    const [sessions] = await pool.execute('SELECT * FROM class_sessions WHERE course_id = ? ORDER BY session_date DESC', [req.params.courseId]);
    const [report] = await pool.execute(`
      SELECT s.id, s.full_name, s.student_id,
        COUNT(cs.id) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(cs.id), 0), 1) as percentage
      FROM students s
      JOIN programs p ON s.program_id = p.id
      JOIN courses c ON c.program_id = p.id
      JOIN class_sessions cs ON cs.course_id = c.id
      LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = s.id
      WHERE c.id = ? AND s.status = 'active'
      GROUP BY s.id, s.full_name, s.student_id
      ORDER BY percentage ASC
    `, [req.params.courseId]);

    res.json({ success: true, data: { sessions: sessions.length, students: report } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
