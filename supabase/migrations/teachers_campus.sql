-- ============================================================
-- ATOMUS.edu — Teachers: campus assignment
-- Adds teachers.campus_id so teachers can be scoped to a campus.
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_campus ON teachers (campus_id);
