-- ============================================================
-- ATOMUS.edu — Complete Database Schema
-- Run this in Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. COURSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. BATCHES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timing TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. PARENTS (linked to Supabase Auth)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY,  -- Must match auth.users.id
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  username TEXT,        -- Phone number (digits-only) used as Flutter login ID
  password_hash TEXT,   -- Stored for admin reference (NOT used for Supabase Auth)
  account_status TEXT DEFAULT 'Active' CHECK (account_status IN ('Active', 'Pending', 'Disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 4. STUDENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  admission_number TEXT UNIQUE,
  roll_number TEXT,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  attendance_percentage NUMERIC(5,2) DEFAULT 0,
  progress_status TEXT DEFAULT 'Average' CHECK (progress_status IN ('Excellent', 'Good', 'Average', 'Needs Improvement', 'At Risk')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 5. TEACHERS (linked to Supabase Auth)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  subject_specialization TEXT,
  assigned_courses UUID[] DEFAULT '{}',
  assigned_batches UUID[] DEFAULT '{}',
  account_status TEXT DEFAULT 'Active' CHECK (account_status IN ('Active', 'Pending', 'Disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 6. ATTENDANCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT DEFAULT 'Unmarked' CHECK (status IN ('Present', 'Absent', 'Late', 'Unmarked')),
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, batch_id, attendance_date)
);

-- ─────────────────────────────────────────────────────────────
-- 7. EXAMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  total_marks INTEGER DEFAULT 100,
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 8. MARKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2) DEFAULT 0,
  total_marks INTEGER DEFAULT 100,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ─────────────────────────────────────────────────────────────
-- 9. FEE STRUCTURES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  admission_fee NUMERIC(10,2) DEFAULT 0,
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 10. STUDENT FEES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  total_fee NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  balance_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_fee - paid_amount) STORED,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Partial', 'Pending', 'Overdue')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 11. PAYMENT TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI / GPay', 'Bank Transfer', 'Card', 'Other')),
  payment_date DATE DEFAULT CURRENT_DATE,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 12. ANNOUNCEMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Normal', 'Important', 'Urgent')),
  audience TEXT DEFAULT 'All' CHECK (audience IN ('All', 'Parents', 'Teachers', 'Students')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_course ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance(batch_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, audience);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'parent')
  FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ADMIN = full access to everything (service role bypasses RLS naturally)
-- For brevity, we create permissive policies for authenticated users accessing their scope:

-- Courses & Batches — readable by all authenticated users
CREATE POLICY "Auth users read courses" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users read batches" ON batches FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin write on courses/batches
CREATE POLICY "Admin write courses" ON courses FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin write batches" ON batches FOR ALL USING (get_user_role() = 'admin');

-- Students — admin & teacher read all; parents read own children
CREATE POLICY "Admin/teacher read students" ON students FOR SELECT USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "Parent read own students" ON students FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Admin write students" ON students FOR ALL USING (get_user_role() = 'admin');

-- Parents — admin full; parent reads own
CREATE POLICY "Admin full on parents" ON parents FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Parent reads own" ON parents FOR SELECT USING (id = auth.uid());

-- Teachers — admin full; teacher reads own
CREATE POLICY "Admin full on teachers" ON teachers FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teacher reads own" ON teachers FOR SELECT USING (auth_id = auth.uid());

-- Attendance — admin full; teacher marks attendance; parent views
CREATE POLICY "Admin full on attendance" ON attendance FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teacher marks attendance" ON attendance FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "Parent views attendance" ON attendance FOR SELECT USING (
  get_user_role() = 'parent' AND
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);

-- Exams & Marks
CREATE POLICY "Admin full on exams" ON exams FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teacher write exams" ON exams FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "All read exams" ON exams FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin full on marks" ON marks FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Teacher write marks" ON marks FOR ALL USING (get_user_role() = 'teacher');
CREATE POLICY "Parent view marks" ON marks FOR SELECT USING (
  get_user_role() = 'parent' AND
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);

-- Fees
CREATE POLICY "Admin full on fee_structures" ON fee_structures FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin full on student_fees" ON student_fees FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Parent view own fees" ON student_fees FOR SELECT USING (
  get_user_role() = 'parent' AND
  student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
);
CREATE POLICY "Admin full on payment_transactions" ON payment_transactions FOR ALL USING (get_user_role() = 'admin');

-- Announcements
CREATE POLICY "Admin full on announcements" ON announcements FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Auth users read published" ON announcements FOR SELECT USING (
  is_published = TRUE AND (
    audience = 'All' OR
    (audience = 'Parents' AND get_user_role() = 'parent') OR
    (audience = 'Teachers' AND get_user_role() = 'teacher') OR
    (audience = 'Students' AND get_user_role() IN ('student', 'parent'))
  )
);
