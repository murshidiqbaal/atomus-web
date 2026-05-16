-- ============================================================
-- ATOMUS.edu — Marks & Exam Management Enhancements
-- Run this AFTER complete_schema.sql.
-- Adds: exam_scope, subject_id on marks, course-wide exams,
-- and analytic-friendly indexes & generated percentage column.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXAMS
-- ─────────────────────────────────────────────────────────────
-- Allow course-wide exams (batch_id NULL) + add exam_scope
ALTER TABLE exams
  ALTER COLUMN batch_id DROP NOT NULL;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS exam_scope TEXT NOT NULL DEFAULT 'batch'
    CHECK (exam_scope IN ('batch', 'course'));

-- Existing rows with a batch_id stay 'batch'. Course-wide rows
-- created via the new modal will set this to 'course' and leave
-- batch_id NULL.

-- Force consistency: if scope = 'course', batch must be NULL; if
-- scope = 'batch', batch must NOT be NULL.
ALTER TABLE exams
  DROP CONSTRAINT IF EXISTS exams_scope_batch_consistency;
ALTER TABLE exams
  ADD CONSTRAINT exams_scope_batch_consistency CHECK (
    (exam_scope = 'course' AND batch_id IS NULL) OR
    (exam_scope = 'batch'  AND batch_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_batch  ON exams(batch_id);
CREATE INDEX IF NOT EXISTS idx_exams_date   ON exams(exam_date DESC);

-- ─────────────────────────────────────────────────────────────
-- MARKS
-- ─────────────────────────────────────────────────────────────
-- Add subject_id (nullable for the "overall" mark when an exam
-- isn't subject-scoped). New unique constraint includes it so
-- subject-wise marks per student are possible.
ALTER TABLE marks
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

-- Generated percentage column (kept in sync, indexable, cheap to read)
ALTER TABLE marks
  DROP COLUMN IF EXISTS percentage;
ALTER TABLE marks
  ADD COLUMN percentage NUMERIC(5,2)
    GENERATED ALWAYS AS (
      CASE WHEN total_marks > 0
        THEN ROUND((marks_obtained / total_marks) * 100, 2)
        ELSE 0
      END
    ) STORED;

-- Replace old unique constraint with subject-aware one
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_exam_id_student_id_key;

DROP INDEX IF EXISTS marks_exam_student_subject_uidx;
-- Use a unique index that treats NULL subject_id as a single bucket
-- so the "overall" mark per (exam, student) stays unique too.
CREATE UNIQUE INDEX marks_exam_student_subject_uidx
  ON marks (exam_id, student_id, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_marks_subject     ON marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_percentage  ON marks(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_marks_exam_pct    ON marks(exam_id, percentage DESC);

-- ─────────────────────────────────────────────────────────────
-- SUBJECTS  (created by features/subjects, ensure it exists)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_code TEXT,
  class_level TEXT,
  subject_type TEXT DEFAULT 'Core',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_course ON subjects(course_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admin full on subjects" ON subjects FOR ALL USING (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "All read subjects" ON subjects FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- Convenience analytic view (optional — fast aggregates)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW exam_summary AS
SELECT
  e.id              AS exam_id,
  e.name            AS exam_name,
  e.course_id,
  e.batch_id,
  e.exam_scope,
  e.exam_date,
  COUNT(m.id)               AS marks_count,
  COUNT(DISTINCT m.student_id) AS student_count,
  AVG(m.percentage)         AS avg_pct,
  MAX(m.percentage)         AS top_pct,
  MIN(m.percentage)         AS low_pct,
  SUM(CASE WHEN m.percentage >= 50 THEN 1 ELSE 0 END)::float /
    NULLIF(COUNT(m.id), 0) * 100 AS pass_pct
FROM exams e
LEFT JOIN marks m ON m.exam_id = e.id
GROUP BY e.id;
