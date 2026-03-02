const { pool } = require('../src/config/database');

const migrations = [
  `CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    head_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id VARCHAR(36),
    duration_years INT DEFAULT 4,
    total_semesters INT DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin','dept_admin','faculty','student','parent','grc_member') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(15),
    address TEXT,
    program_id VARCHAR(36),
    current_semester INT DEFAULT 1,
    admission_year INT NOT NULL,
    status ENUM('active','inactive','graduated','dropped') DEFAULT 'active',
    photo_url VARCHAR(500),
    guardian_name VARCHAR(200),
    guardian_phone VARCHAR(15),
    guardian_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`,

  `CREATE TABLE IF NOT EXISTS faculty (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    department_id VARCHAR(36),
    designation VARCHAR(100),
    qualification VARCHAR(200),
    phone VARCHAR(15),
    joining_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`,

  `CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    program_id VARCHAR(36),
    semester INT NOT NULL,
    credits INT DEFAULT 3,
    faculty_id VARCHAR(36),
    academic_year VARCHAR(9),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(id)
  )`,

  `CREATE TABLE IF NOT EXISTS class_sessions (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(300),
    qr_code VARCHAR(100),
    qr_expires_at TIMESTAMP NULL,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    status ENUM('present','absent','late','excused') DEFAULT 'absent',
    marked_at TIMESTAMP NULL,
    marked_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (student_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (session_id) REFERENCES class_sessions(id)
  )`,

  `CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    course_id VARCHAR(36),
    exam_type ENUM('internal','midterm','final','quiz') DEFAULT 'internal',
    max_marks INT DEFAULT 100,
    exam_date DATE,
    academic_year VARCHAR(9),
    semester INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  )`,

  `CREATE TABLE IF NOT EXISTS results (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    exam_id VARCHAR(36) NOT NULL,
    marks_obtained DECIMAL(5,2),
    grade VARCHAR(5),
    grade_points DECIMAL(3,1),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_result (student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id)
  )`,

  `CREATE TABLE IF NOT EXISTS fee_structures (
    id VARCHAR(36) PRIMARY KEY,
    program_id VARCHAR(36),
    semester INT,
    academic_year VARCHAR(9),
    tuition_fee DECIMAL(10,2) DEFAULT 0,
    hostel_fee DECIMAL(10,2) DEFAULT 0,
    library_fee DECIMAL(10,2) DEFAULT 0,
    lab_fee DECIMAL(10,2) DEFAULT 0,
    other_fee DECIMAL(10,2) DEFAULT 0,
    total_fee DECIMAL(10,2) GENERATED ALWAYS AS (tuition_fee + hostel_fee + library_fee + lab_fee + other_fee) STORED,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    fee_structure_id VARCHAR(36),
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'full',
    payment_method ENUM('cash','card','upi','netbanking','cheque') DEFAULT 'cash',
    transaction_id VARCHAR(100),
    status ENUM('pending','success','failed','refunded') DEFAULT 'pending',
    payment_date TIMESTAMP NULL,
    academic_year VARCHAR(9),
    semester INT,
    receipt_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id)
  )`,

  `CREATE TABLE IF NOT EXISTS grievances (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(30) UNIQUE NOT NULL,
    complainant_id VARCHAR(36),
    is_anonymous BOOLEAN DEFAULT FALSE,
    anon_token VARCHAR(64),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('academic','hostel','faculty','ragging','financial','mental_health','administrative','general') NOT NULL,
    ai_category VARCHAR(50),
    ai_confidence DECIMAL(3,2) DEFAULT 0,
    severity INT DEFAULT 5,
    sentiment ENUM('positive','neutral','negative') DEFAULT 'neutral',
    sentiment_score DECIMAL(4,3) DEFAULT 0,
    status ENUM('submitted','under_review','escalated','pending_info','resolved','closed','rejected') DEFAULT 'submitted',
    current_level INT DEFAULT 1,
    assigned_to VARCHAR(36),
    department_id VARCHAR(36),
    priority ENUM('low','medium','high','critical') DEFAULT 'medium',
    sla_deadline TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`,

  `CREATE TABLE IF NOT EXISTS grievance_attachments (
    id VARCHAR(36) PRIMARY KEY,
    grievance_id VARCHAR(36) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(200),
    file_type VARCHAR(50),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS grievance_timeline (
    id VARCHAR(36) PRIMARY KEY,
    grievance_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by VARCHAR(36),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS grievance_feedback (
    id VARCHAR(36) PRIMARY KEY,
    grievance_id VARCHAR(36) UNIQUE NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    target_role ENUM('all','student','faculty','parent') DEFAULT 'all',
    priority ENUM('general','important','urgent') DEFAULT 'general',
    created_by VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS timetable (
    id VARCHAR(36) PRIMARY KEY,
    program_id VARCHAR(36),
    semester INT,
    day_of_week ENUM('monday','tuesday','wednesday','thursday','friday','saturday'),
    start_time TIME,
    end_time TIME,
    course_id VARCHAR(36),
    faculty_id VARCHAR(36),
    room VARCHAR(50),
    academic_year VARCHAR(9),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(id)
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_students_program ON students(program_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id, academic_year)`,
  `CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id)`,
];

async function runMigrations() {
  console.log('🔄 Running migrations...');
  for (const sql of migrations) {
    try {
      await pool.execute(sql);
    } catch (err) {
      if (!err.message.includes('Duplicate')) {
        console.error('Migration error:', err.message);
      }
    }
  }
  console.log('✅ Migrations complete');
}

module.exports = { runMigrations };
