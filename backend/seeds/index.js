const { pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Seeding database...');

  const deptId = uuidv4();
  const deptId2 = uuidv4();
  const progId = uuidv4();
  const progId2 = uuidv4();

  // Departments
  await pool.execute(`INSERT IGNORE INTO departments (id, name, code) VALUES (?, ?, ?)`, [deptId, 'Computer Science & Engineering', 'CSE']);
  await pool.execute(`INSERT IGNORE INTO departments (id, name, code) VALUES (?, ?, ?)`, [deptId2, 'Electronics & Communication', 'ECE']);

  // Programs
  await pool.execute(`INSERT IGNORE INTO programs (id, name, code, department_id, duration_years, total_semesters) VALUES (?, ?, ?, ?, ?, ?)`,
    [progId, 'B.Tech Computer Science', 'BTCS', deptId, 4, 8]);
  await pool.execute(`INSERT IGNORE INTO programs (id, name, code, department_id, duration_years, total_semesters) VALUES (?, ?, ?, ?, ?, ?)`,
    [progId2, 'B.Tech Electronics', 'BTEC', deptId2, 4, 8]);

  // Users & Faculty
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', 10);
  await pool.execute(`INSERT IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [adminId, 'admin@college.edu', adminHash, 'super_admin']);

  const grcId = uuidv4();
  const grcHash = await bcrypt.hash('grc123', 10);
  await pool.execute(`INSERT IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
    [grcId, 'grc@college.edu', grcHash, 'grc_member']);

  // Faculty users
  const facultyData = [
    { name: 'Dr. Rajesh Kumar', email: 'rajesh@college.edu', fid: 'FAC2024001', dept: deptId },
    { name: 'Dr. Priya Sharma', email: 'priya@college.edu', fid: 'FAC2024002', dept: deptId },
    { name: 'Prof. Sunil Mehta', email: 'sunil@college.edu', fid: 'FAC2024003', dept: deptId2 },
  ];

  const facultyIds = [];
  for (const f of facultyData) {
    const uid = uuidv4(); const fid = uuidv4();
    const hash = await bcrypt.hash('faculty123', 10);
    await pool.execute(`INSERT IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'faculty')`, [uid, f.email, hash]);
    await pool.execute(`INSERT IGNORE INTO faculty (id, user_id, faculty_id, full_name, department_id, designation, joining_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fid, uid, f.fid, f.name, f.dept, 'Assistant Professor', '2020-07-01']);
    facultyIds.push(fid);
  }

  // Courses
  const courseData = [
    { name: 'Data Structures & Algorithms', code: 'CS301', prog: progId, sem: 3, cred: 4, fac: facultyIds[0] },
    { name: 'Database Management Systems', code: 'CS302', prog: progId, sem: 3, cred: 3, fac: facultyIds[1] },
    { name: 'Operating Systems', code: 'CS401', prog: progId, sem: 4, cred: 4, fac: facultyIds[0] },
    { name: 'Computer Networks', code: 'CS402', prog: progId, sem: 4, cred: 3, fac: facultyIds[1] },
    { name: 'Digital Electronics', code: 'EC301', prog: progId2, sem: 3, cred: 4, fac: facultyIds[2] },
  ];

  const courseIds = [];
  for (const c of courseData) {
    const cid = uuidv4();
    await pool.execute(`INSERT IGNORE INTO courses (id, name, code, program_id, semester, credits, faculty_id, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cid, c.name, c.code, c.prog, c.sem, c.cred, c.fac, '2024-2025']);
    courseIds.push(cid);
  }

  // Students
  const studentNames = [
    'Arjun Singh', 'Priya Patel', 'Rahul Verma', 'Sneha Gupta', 'Amit Kumar',
    'Divya Reddy', 'Rohit Sharma', 'Ananya Joshi', 'Vikas Yadav', 'Pooja Mishra',
    'Karan Mehta', 'Riya Nair', 'Akash Tiwari', 'Meera Iyer', 'Suresh Bhat',
  ];

  const studentIds = [];
  for (let i = 0; i < studentNames.length; i++) {
    const uid = uuidv4(); const sid = uuidv4();
    const email = studentNames[i].toLowerCase().replace(' ', '.') + '@student.college.edu';
    const hash = await bcrypt.hash('student123', 10);
    await pool.execute(`INSERT IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'student')`, [uid, email, hash]);
    const studentCode = `2024CS${String(i + 1).padStart(4, '0')}`;
    await pool.execute(`INSERT IGNORE INTO students (id, user_id, student_id, full_name, program_id, current_semester, admission_year, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [sid, uid, studentCode, studentNames[i], progId, 3, 2024]);
    studentIds.push(sid);
  }

  // Class Sessions & Attendance
  const today = new Date();
  const sessionIds = [];
  for (let d = 0; d < 10; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    for (let c = 0; c < 2; c++) {
      const sessId = uuidv4();
      await pool.execute(`INSERT IGNORE INTO class_sessions (id, course_id, session_date, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [sessId, courseIds[c], dateStr, '09:00:00', '10:00:00', adminId]);
      sessionIds.push({ id: sessId, course: c });

      for (const stdId of studentIds) {
        const present = Math.random() > 0.2;
        await pool.execute(`INSERT IGNORE INTO attendance (id, student_id, session_id, status, marked_at) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), stdId, sessId, present ? 'present' : 'absent', present ? new Date() : null]);
      }
    }
  }

  // Fee Structure
  const feeId = uuidv4();
  await pool.execute(`INSERT IGNORE INTO fee_structures (id, program_id, semester, academic_year, tuition_fee, hostel_fee, library_fee, lab_fee, other_fee, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [feeId, progId, 3, '2024-2025', 75000, 25000, 2000, 5000, 3000, '2024-07-31']);

  // Payments
  for (let i = 0; i < 10; i++) {
    await pool.execute(`INSERT IGNORE INTO payments (id, student_id, fee_structure_id, amount, payment_method, status, payment_date, academic_year, semester, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), studentIds[i], feeId, 110000, 'upi', 'success', new Date(), '2024-2025', 3, `REC${Date.now()}${i}`]);
  }

  // Exams & Results
  const examId = uuidv4();
  await pool.execute(`INSERT IGNORE INTO exams (id, name, course_id, exam_type, max_marks, exam_date, academic_year, semester) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [examId, 'Mid-Term Examination', courseIds[0], 'midterm', 50, '2024-09-15', '2024-2025', 3]);

  const grades = ['O', 'A+', 'A', 'B+', 'B', 'C'];
  const gradePoints = [10, 9, 8, 7, 6, 5];
  for (let i = 0; i < studentIds.length; i++) {
    const marks = 30 + Math.floor(Math.random() * 20);
    const gi = Math.floor(Math.random() * grades.length);
    await pool.execute(`INSERT IGNORE INTO results (id, student_id, exam_id, marks_obtained, grade, grade_points, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), studentIds[i], examId, marks, grades[gi], gradePoints[gi], true]);
  }

  // Grievances
  const grievanceData = [
    { title: 'Hostel water supply issue', desc: 'The hostel block B has been facing water supply issues for the past week. We are unable to use the bathrooms properly.', cat: 'hostel', sev: 7, sent: 'negative' },
    { title: 'Library books not available', desc: 'The reference books for Data Structures subject are not available in the library. Many students are affected.', cat: 'academic', sev: 5, sent: 'neutral' },
    { title: 'Canteen food quality poor', desc: 'The canteen food quality has deteriorated significantly. Several students have reported stomach issues after eating there.', cat: 'administrative', sev: 6, sent: 'negative' },
    { title: 'Lab equipment maintenance needed', desc: 'Computer lab systems are outdated and frequently crash during practical sessions, wasting valuable lab time.', cat: 'academic', sev: 6, sent: 'negative' },
    { title: 'Fee receipt not received', desc: 'I paid my semester fees online but have not received the official receipt despite multiple requests to the finance office.', cat: 'financial', sev: 4, sent: 'neutral' },
    { title: 'Attendance system malfunction', desc: 'The QR code attendance system was not working for 3 consecutive days last week. Our attendance shows absent.', cat: 'academic', sev: 5, sent: 'negative' },
    { title: 'Feeling stressed about exams', desc: 'I am feeling very overwhelmed with the exam schedule. Four exams in two days is causing extreme stress and anxiety.', cat: 'mental_health', sev: 8, sent: 'negative' },
    { title: 'Incorrect marks in portal', desc: 'My mid-term marks shown in the portal are incorrect. I scored 42/50 but it shows 32/50.', cat: 'academic', sev: 6, sent: 'neutral' },
  ];

  const statuses = ['submitted', 'under_review', 'resolved', 'escalated', 'closed'];
  for (let i = 0; i < grievanceData.length; i++) {
    const g = grievanceData[i];
    const gid = uuidv4();
    const ticketId = `GRV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${g.cat.toUpperCase().slice(0, 2)}-${String(i + 1).padStart(5, '0')}`;
    const status = statuses[i % statuses.length];
    const isAnon = i % 3 === 0;
    const complainant = isAnon ? null : (await pool.execute(`SELECT id FROM users WHERE role = 'student' LIMIT 1 OFFSET ${i % 5}`))[0][0]?.id;

    await pool.execute(`INSERT IGNORE INTO grievances (id, ticket_id, complainant_id, is_anonymous, title, description, category, ai_category, ai_confidence, severity, sentiment, sentiment_score, status, priority, assigned_to, department_id, sla_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
      [gid, ticketId, isAnon ? null : complainant, isAnon, g.title, g.desc, g.cat, g.cat, 0.87 + (Math.random() * 0.1), g.sev, g.sent, 0.5 + Math.random() * 0.4,
       status, g.sev >= 7 ? 'high' : g.sev >= 5 ? 'medium' : 'low', status !== 'submitted' ? grcId : null, deptId]);

    // Timeline
    await pool.execute(`INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), gid, null, 'submitted', complainant || adminId, 'Complaint submitted by student']);

    if (status === 'resolved' || status === 'closed') {
      await pool.execute(`INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), gid, 'submitted', 'under_review', grcId, 'Complaint assigned and under review']);
      await pool.execute(`INSERT INTO grievance_timeline (id, grievance_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), gid, 'under_review', 'resolved', grcId, 'Issue resolved. Action taken by administration.']);
      await pool.execute(`UPDATE grievances SET resolved_at = NOW(), resolution_note = 'Issue has been resolved by the concerned department.' WHERE id = ?`, [gid]);
    }

    if (status === 'closed') {
      await pool.execute(`INSERT IGNORE INTO grievance_feedback (id, grievance_id, rating, comment) VALUES (?, ?, ?, ?)`,
        [uuidv4(), gid, 3 + Math.floor(Math.random() * 3), 'The issue was resolved but took longer than expected.']);
    }
  }

  // Announcements
  const announcements = [
    { title: 'Semester Examination Schedule Released', content: 'The semester examination schedule for Nov 2024 has been released. Please check your student portal for detailed timetable.', role: 'student', priority: 'important' },
    { title: 'Fee Payment Deadline Extended', content: 'The deadline for semester fee payment has been extended to August 15, 2024. Students are requested to pay at the earliest.', role: 'all', priority: 'important' },
    { title: 'Cultural Fest Registration Open', content: 'Registrations for the Annual Cultural Fest are now open. Students can register through the student portal.', role: 'student', priority: 'general' },
    { title: 'Faculty Development Program', content: 'A 3-day Faculty Development Program on AI & ML will be conducted from August 20-22. All faculty are requested to attend.', role: 'faculty', priority: 'important' },
  ];

  for (const ann of announcements) {
    await pool.execute(`INSERT IGNORE INTO announcements (id, title, content, target_role, priority, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), ann.title, ann.content, ann.role, ann.priority, adminId]);
  }

  // Timetable
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const times = [['08:00:00', '09:00:00'], ['09:00:00', '10:00:00'], ['10:00:00', '11:00:00'], ['14:00:00', '15:00:00']];
  for (let d = 0; d < days.length; d++) {
    for (let t = 0; t < 2; t++) {
      await pool.execute(`INSERT IGNORE INTO timetable (id, program_id, semester, day_of_week, start_time, end_time, course_id, faculty_id, room, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), progId, 3, days[d], times[t][0], times[t][1], courseIds[t % 2], facultyIds[t % 2], `Room ${101 + t}`, '2024-2025']);
    }
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:     admin@college.edu  / admin123');
  console.log('  Faculty:   rajesh@college.edu / faculty123');
  console.log('  Student:   arjun.singh@student.college.edu / student123');
  console.log('  GRC:       grc@college.edu    / grc123');
  console.log('\n');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
