-- ============================================================
-- ATOMUS.edu — Attendance: hour/period-wise (additive)
--
-- Adds period_number + period_label and swaps the unique index to
-- include period_number so one (student, subject, date) can have
-- many per-period rows. Existing rows backfill to period 1.
--
-- Idempotent — safe to re-run.
-- ============================================================

BEGIN;

-- 1. Columns -------------------------------------------------------
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS period_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS period_label  TEXT;

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_period_number_chk;
ALTER TABLE attendance
  ADD  CONSTRAINT attendance_period_number_chk
       CHECK (period_number BETWEEN 1 AND 20);

-- 2. Swap the unique index to include period_number ---------------
DROP INDEX IF EXISTS attendance_student_subject_date_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_subject_date_period_uidx
  ON attendance (
    student_id,
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    attendance_date,
    period_number
  );

-- 3. Period filter helper index -----------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_period
  ON attendance (period_number);

COMMIT;
