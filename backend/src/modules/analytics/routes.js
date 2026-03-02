const express = require('express');
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();
router.use(authenticate);

// GET admin overview dashboard
router.get('/overview', authorize('super_admin', 'dept_admin', 'grc_member'), async (req, res) => {
  try {
    const [[{ total_students }]] = await pool.execute("SELECT COUNT(*) as total_students FROM students WHERE status = 'active'");
    const [[{ total_faculty }]] = await pool.execute("SELECT COUNT(*) as total_faculty FROM faculty WHERE is_active = 1");
    const [[{ total_courses }]] = await pool.execute("SELECT COUNT(*) as total_courses FROM courses WHERE is_active = 1");
    const [[{ open_grievances }]] = await pool.execute("SELECT COUNT(*) as open_grievances FROM grievances WHERE status NOT IN ('closed', 'rejected')");
    const [[{ resolved_grievances }]] = await pool.execute("SELECT COUNT(*) as resolved_grievances FROM grievances WHERE status = 'resolved' OR status = 'closed'");
    const [[{ total_grievances }]] = await pool.execute("SELECT COUNT(*) as total_grievances FROM grievances");
    const [[{ fee_collected }]] = await pool.execute("SELECT COALESCE(SUM(amount), 0) as fee_collected FROM payments WHERE status = 'success'");
    const [[{ pending_fees }]] = await pool.execute("SELECT COUNT(*) as pending_fees FROM payments WHERE status = 'pending'");
    const [[{ avg_attendance }]] = await pool.execute(`
      SELECT ROUND(AVG(pct), 1) as avg_attendance FROM (
        SELECT s.id, ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(cs.id), 0), 1) as pct
        FROM students s JOIN programs p ON s.program_id = p.id JOIN courses c ON c.program_id = p.id
        JOIN class_sessions cs ON cs.course_id = c.id LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = s.id
        WHERE s.status = 'active' GROUP BY s.id
      ) x`);

    res.json({
      success: true, data: {
        total_students, total_faculty, total_courses, open_grievances,
        resolved_grievances, total_grievances,
        resolution_rate: total_grievances > 0 ? Math.round(resolved_grievances / total_grievances * 100) : 0,
        fee_collected: parseFloat(fee_collected), pending_fees, avg_attendance: avg_attendance || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET grievance analytics
router.get('/grievances', authorize('super_admin', 'dept_admin', 'grc_member'), async (req, res) => {
  try {
    const [byCategory] = await pool.execute(`SELECT category, COUNT(*) as count, AVG(severity) as avg_severity FROM grievances GROUP BY category ORDER BY count DESC`);
    const [byStatus] = await pool.execute(`SELECT status, COUNT(*) as count FROM grievances GROUP BY status`);
    const [byPriority] = await pool.execute(`SELECT priority, COUNT(*) as count FROM grievances GROUP BY priority`);
    const [bySentiment] = await pool.execute(`SELECT sentiment, COUNT(*) as count FROM grievances GROUP BY sentiment`);
    const [monthly] = await pool.execute(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM grievances WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month ASC`);
    const [recent] = await pool.execute(`SELECT ticket_id, title, category, priority, status, created_at, severity FROM grievances ORDER BY created_at DESC LIMIT 10`);
    const [[{ avg_resolution }]] = await pool.execute(`SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_resolution FROM grievances WHERE resolved_at IS NOT NULL`);

    res.json({ success: true, data: { byCategory, byStatus, byPriority, bySentiment, monthly, recent, avg_resolution_hours: avg_resolution || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET attendance analytics
router.get('/attendance', authorize('super_admin', 'dept_admin', 'faculty'), async (req, res) => {
  try {
    const [courseStats] = await pool.execute(`
      SELECT c.name as course, c.code,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT s.id) as enrolled_students,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(cs.id) * COUNT(DISTINCT s.id), 0), 1) as avg_attendance
      FROM courses c JOIN class_sessions cs ON cs.course_id = c.id
      JOIN programs p ON c.program_id = p.id JOIN students s ON s.program_id = p.id AND s.status = 'active'
      LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = s.id
      GROUP BY c.id, c.name, c.code
    `);

    const [below75] = await pool.execute(`
      SELECT s.full_name, s.student_id, COUNT(cs.id) as total, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
        ROUND(SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(cs.id),0),1) as pct
      FROM students s JOIN programs p ON s.program_id = p.id JOIN courses c ON c.program_id = p.id
      JOIN class_sessions cs ON cs.course_id = c.id LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = s.id
      WHERE s.status='active' GROUP BY s.id, s.full_name, s.student_id
      HAVING pct < 75 ORDER BY pct ASC LIMIT 10
    `);

    res.json({ success: true, data: { courseStats, below75 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET fee analytics
router.get('/fees', authorize('super_admin', 'dept_admin'), async (req, res) => {
  try {
    const [monthly] = await pool.execute(`SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(amount) as amount, COUNT(*) as count FROM payments WHERE status='success' AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month ASC`);
    const [[{ total_collected }]] = await pool.execute("SELECT COALESCE(SUM(amount),0) as total_collected FROM payments WHERE status='success'");
    const [[{ total_pending }]] = await pool.execute("SELECT COUNT(*) as total_pending FROM payments WHERE status='pending'");
    const [byMethod] = await pool.execute("SELECT payment_method, COUNT(*) as count, SUM(amount) as total FROM payments WHERE status='success' GROUP BY payment_method");

    res.json({ success: true, data: { monthly, total_collected: parseFloat(total_collected), total_pending, byMethod } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all announcements
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const [rows] = await pool.execute(`SELECT a.*, u.email as created_by_email FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE (a.target_role = 'all' OR a.target_role = ?) AND a.is_active = 1 ORDER BY a.created_at DESC LIMIT 20`,
      [role === 'super_admin' || role === 'dept_admin' ? 'all' : role]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
