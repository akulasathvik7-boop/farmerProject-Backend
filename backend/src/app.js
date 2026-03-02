const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { runMigrations } = require('../migrations/schema');

const authRoutes = require('./modules/auth/routes');
const studentRoutes = require('./modules/students/routes');
const grievanceRoutes = require('./modules/grievances/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const analyticsRoutes = require('./modules/analytics/routes');
const { facultyRouter, courseRouter, programRouter, deptRouter, paymentRouter, timetableRouter, announcementRouter } = require('./modules/other/routes');

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 200, message: { error: 'Too many requests' } }));

// Static files
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/grievances', grievanceRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/faculty', facultyRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/programs', programRouter);
app.use('/api/v1/departments', deptRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/timetable', timetableRouter);
app.use('/api/v1/announcements', announcementRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));

// 404 handler
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', ...(process.env.NODE_ENV === 'development' && { error: err.message }) });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`\n🚀 College Management API running on http://localhost:${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}/api/v1`);
    console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
  });
}

start().catch(console.error);

module.exports = app;
