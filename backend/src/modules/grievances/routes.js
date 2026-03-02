const express = require('express');
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middlewares/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticate);

// SLA hours per category
const SLA_HOURS = { academic: 48, hostel: 24, faculty: 24, ragging: 4, financial: 48, mental_health: 12, administrative: 48, general: 96 };
const PRIORITY_MAP = { 1: 'low', 2: 'low', 3: 'low', 4: 'medium', 5: 'medium', 6: 'medium', 7: 'high', 8: 'high', 9: 'critical', 10: 'critical' };

// Simple AI classification (rule-based for demo)
function analyzeComplaint(text) {
  const lower = text.toLowerCase();
  const categories = {
    hostel: ['hostel', 'dormitory', 'room', 'warden', 'water', 'electricity', 'mess', 'food'],
    academic: ['exam', 'marks', 'grade', 'attendance', 'course', 'subject', 'teacher', 'faculty', 'library', 'syllabus', 'result'],
    faculty: ['professor', 'lecturer', 'behaviour', 'rude', 'inappropriate', 'bias', 'unfair'],
    ragging: ['ragging', 'bully', 'harass', 'threaten', 'assault', 'abuse', 'violence'],
    financial: ['fee', 'payment', 'refund', 'scholarship', 'receipt', 'money', 'charge'],
    mental_health: ['stress', 'anxiety', 'depressed', 'overwhelmed', 'mental', 'counseling', 'suicide', 'helpless'],
  };
  let bestCat = 'general'; let bestScore = 0;
  for (const [cat, keywords] of Object.entries(categories)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  const negWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disgusting', 'urgent', 'immediately', 'broken', 'failure', 'unacceptable', 'serious', 'critical'];
  const posWords = ['good', 'great', 'thank', 'appreciate', 'resolved', 'better'];
  const negScore = negWords.filter(w => lower.includes(w)).length;
  const posScore = posWords.filter(w => lower.includes(w)).length;
  const sentiment = negScore > posScore ? 'negative' : posScore > negScore ? 'positive' : 'neutral';
  const sentimentScore = Math.min(0.95, 0.5 + negScore * 0.1);
  const urgentWords = ['urgent', 'immediately', 'emergency', 'suicide', 'assault', 'ragging', 'critical'];
  const severity = urgentWords.some(w => lower.includes(w)) ? 9 : Math.min(10, 4 + negScore);

  return { ai_category: bestCat, ai_confidence: bestScore > 0 ? Math.min(0.95, 0.65 + bestScore * 0.1) : 0.60, severity, sentiment, sentiment_score: sentimentScore };
}

// GET all grievances
router.get('/', async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20, search } = req.query;
    let query = `SELECT g.*, u.email as complainant_email, u2.email as assigned_email FROM grievances g
                 LEFT JOIN users u ON g.complainant_id = u.id LEFT JOIN users u2 ON g.assigned_to = u2.id WHERE 1=1`;
    const params = [];

    // Students only see their own
    if (req.user.role === 'student') {
      query += ' AND g.complainant_id = ?'; params.push(req.user.id);
    }
    if (status) { query += ' AND g.status = ?'; params.push(status); }
    if (category) { query += ' AND g.category = ?'; params.push(category); }
    if (priority) { query += ' AND g.priority = ?'; params.push(priority); }
    if (search) { query += ' AND (g.title LIKE ? OR g.ticket_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [grievances] = await pool.execute(query, params);
    // Mask complainant for anonymous
    const masked = grievances.map(g => ({
      ...g,
      complainant_email: g.is_anonymous ? '*** Anonymous ***' : g.complainant_email
    }));
    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST submit grievance
router.post('/', async (req, res) => {
  try {
    const { title, description, category, is_anonymous = false } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description and category are required' });
    }

    const ai = analyzeComplaint(title + ' ' + description);
    const gid = uuidv4();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM grievances');
    const ticketId = `GRV-${new Date().getFullYear()}${month}-${category.toUpperCase().slice(0, 2)}-${String(cnt + 1).padStart(5, '0')}`;
    const slaHours = SLA_HOURS[category] || 48;
    const anonToken = is_anonymous ? require('crypto').randomBytes(32).toString('hex') : null;
    const priority = PRIORITY_MAP[ai.severity] || 'medium';

    await pool.execute(`INSERT INTO grievances (id, ticket_id, complainant_id, is_anonymous, anon_token, title, description, category, ai_category, ai_confidence, severity, sentiment, sentiment_score, status, priority, sla_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [gid, ticketId, is_anonymous ? null : req.user.id, is_anonymous, anonToken, title, description, category, ai.ai_category, ai.ai_confidence, ai.severity, ai.sentiment, ai.sentiment_score, priority, slaHours]);

    await pool.execute('INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), gid, null, 'submitted', is_anonymous ? null : req.user.id, 'Complaint submitted successfully.']);

    res.status(201).json({
      success: true,
      data: { id: gid, ticketId, status: 'submitted', priority, severity: ai.severity, category: ai.ai_category, slaHours },
      message: `Complaint submitted. Ticket ID: ${ticketId}`,
      ...(is_anonymous && { trackingToken: anonToken })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single grievance
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT g.*, u.email as complainant_email, u2.email as assigned_email FROM grievances g LEFT JOIN users u ON g.complainant_id = u.id LEFT JOIN users u2 ON g.assigned_to = u2.id WHERE g.id = ? OR g.ticket_id = ?`,
      [req.params.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Grievance not found' });

    const g = rows[0];
    if (req.user.role === 'student' && !g.is_anonymous && g.complainant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [timeline] = await pool.execute('SELECT gt.*, u.email as changed_by_email FROM grievance_timeline gt LEFT JOIN users u ON gt.changed_by = u.id WHERE gt.grievance_id = ? ORDER BY gt.created_at ASC', [g.id]);
    const [attachments] = await pool.execute('SELECT * FROM grievance_attachments WHERE grievance_id = ?', [g.id]);
    const [feedback] = await pool.execute('SELECT * FROM grievance_feedback WHERE grievance_id = ?', [g.id]);

    res.json({ success: true, data: { ...g, complainant_email: g.is_anonymous ? '*** Anonymous ***' : g.complainant_email, timeline, attachments, feedback: feedback[0] || null } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update grievance status
router.put('/:id/status', authorize('super_admin', 'dept_admin', 'grc_member'), async (req, res) => {
  try {
    const { status, note, assigned_to } = req.body;
    const validStatuses = ['under_review', 'escalated', 'pending_info', 'resolved', 'closed', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [current] = await pool.execute('SELECT * FROM grievances WHERE id = ?', [req.params.id]);
    if (!current.length) return res.status(404).json({ success: false, message: 'Not found' });

    const updates = { status };
    const params = [status];
    let query = 'UPDATE grievances SET status = ?';

    if (assigned_to) { query += ', assigned_to = ?'; params.push(assigned_to); }
    if (status === 'resolved') { query += ', resolved_at = NOW()'; if (req.body.resolution_note) { query += ', resolution_note = ?'; params.push(req.body.resolution_note); } }
    query += ', updated_at = NOW() WHERE id = ?';
    params.push(req.params.id);

    await pool.execute(query, params);
    await pool.execute('INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, current[0].status, status, req.user.id, note || `Status updated to ${status}`]);

    res.json({ success: true, message: 'Status updated', data: { status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST submit feedback
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating 1-5 required' });

    const [g] = await pool.execute('SELECT * FROM grievances WHERE id = ?', [req.params.id]);
    if (!g.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (g[0].status !== 'resolved') return res.status(400).json({ success: false, message: 'Feedback only for resolved grievances' });

    await pool.execute('INSERT INTO grievance_feedback (id, grievance_id, rating, comment) VALUES (?, ?, ?, ?)', [uuidv4(), req.params.id, rating, comment || null]);
    await pool.execute("UPDATE grievances SET status = 'closed', updated_at = NOW() WHERE id = ?", [req.params.id]);
    await pool.execute('INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, 'resolved', 'closed', req.user.id, `Feedback submitted. Rating: ${rating}/5`]);

    res.json({ success: true, message: 'Feedback submitted, case closed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
