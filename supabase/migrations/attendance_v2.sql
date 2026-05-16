-- ============================================================
-- ATOMUS.edu — Attendance v2 (additive)
--
-- Adds: campus_id, course_id, subject_id, teacher_id, remarks,
--       updated_at, "Leave" status, subject-scoped unique index.
-- Keeps existing rows intact. Old (student, batch, date) UNIQUE
-- is dropped so multiple subject-wise rows per (student, date)
-- become possible. Subject-scoped uniqueness is enforced by a
-- partial-NULL-aware unique index (COALESCE sentinel for legacy
-- rows where subject_id IS NULL).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- 1. New columns ----------------------------------------------------
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS campus_id  UUID REFERENCES campuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id  UUID REFERENCES courses(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remarks    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add "Leave" status --------------------------------------------
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD  CONSTRAINT attendance_status_check
  CHECK (status IN ('Present', 'Absent', 'Late', 'Leave', 'Unmarked'));

-- 3. Drop old (student, batch, date) unique so subject-wise rows are
--    possible. The constraint was auto-generated as
--    attendance_student_id_batch_id_attendance_date_key.
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_student_id_batch_id_attendance_date_key;

-- 4. New unique index — one row per (student, subject, date). Legacy
--    rows with NULL subject_id collapse to a single sentinel bucket.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_subject_date_uidx
  ON attendance (
    student_id,
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    attendance_date
  );

-- 5. Performance indexes -------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_campus  ON attendance (campus_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course  ON attendance (course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance (subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance (attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON attendance (teacher_id);

-- 6. updated_at trigger --------------------------------------------
CREATE OR REPLACE FUNCTION attendance_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION attendance_set_updated_at();

COMMIT;
