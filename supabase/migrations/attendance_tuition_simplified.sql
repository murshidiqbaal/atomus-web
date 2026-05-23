-- ============================================================
-- ATOMUS.edu — Tuition-Center Attendance Simplification
--
-- Drops the old period-wise index and replaces it with a simple
-- subject-scoped index (student_id, subject_id, attendance_date).
-- Enforces one attendance record per student + subject + date.
-- ============================================================

BEGIN;

-- 1. Drop the old period-based unique index
DROP INDEX IF EXISTS attendance_student_subject_date_period_uidx;

-- 2. Create the simplified subject-based unique index
CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_subject_date_uidx
  ON attendance (
    student_id,
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    attendance_date
  );

-- 3. Add an optimized lookup index for fast queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_subject_date
  ON attendance (student_id, subject_id, attendance_date);

COMMIT;
