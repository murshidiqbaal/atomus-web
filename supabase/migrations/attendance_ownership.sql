-- ============================================================
-- ATOMUS.edu — Attendance Ownership & Marker Role System
-- ============================================================
BEGIN;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS attendance_marker_role TEXT DEFAULT 'Teacher',
  ADD COLUMN IF NOT EXISTS attendance_marker_name TEXT;

-- Add validation check constraint
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_marker_role_check;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_marker_role_check
  CHECK (
    attendance_marker_role IN (
      'Teacher',
      'Admin',
      'System'
    )
  );

-- Performance indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_attendance_marker_role
  ON attendance (attendance_marker_role);

CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date
  ON attendance (teacher_id, attendance_date);

COMMIT;
