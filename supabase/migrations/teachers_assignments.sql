-- ============================================================
-- ATOMUS.edu — Teachers Management Extension
-- Adds qualification/gender/profile_image/address/experience to teachers
-- Adds relation tables: teacher_courses, teacher_subjects, teacher_batches
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. Extend teachers ------------------------------------------------------
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS qualification    TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender           TEXT CHECK (gender IN ('Male', 'Female', 'Other'));
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_image    TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS address          TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password_hash    TEXT;  -- Admin reference only; actual auth lives in auth.users

-- 2. Relation tables ------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_courses (
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, course_id)
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS teacher_batches (
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  batch_id   UUID NOT NULL REFERENCES batches(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, batch_id)
);

-- 3. Indexes --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teacher_courses_course   ON teacher_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_batches_batch    ON teacher_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_teachers_qualification   ON teachers(qualification);

-- 4. RLS ------------------------------------------------------------------
ALTER TABLE teacher_courses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_batches  ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "Admin full on teacher_courses"  ON teacher_courses;
DROP POLICY IF EXISTS "Admin full on teacher_subjects" ON teacher_subjects;
DROP POLICY IF EXISTS "Admin full on teacher_batches"  ON teacher_batches;

CREATE POLICY "Admin full on teacher_courses"  ON teacher_courses  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin full on teacher_subjects" ON teacher_subjects FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin full on teacher_batches"  ON teacher_batches  FOR ALL USING (get_user_role() = 'admin');

-- Teachers: read their own assignments
DROP POLICY IF EXISTS "Teacher reads own courses"  ON teacher_courses;
DROP POLICY IF EXISTS "Teacher reads own subjects" ON teacher_subjects;
DROP POLICY IF EXISTS "Teacher reads own batches"  ON teacher_batches;

CREATE POLICY "Teacher reads own courses"  ON teacher_courses  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));
CREATE POLICY "Teacher reads own subjects" ON teacher_subjects FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));
CREATE POLICY "Teacher reads own batches"  ON teacher_batches  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));
