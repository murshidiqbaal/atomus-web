-- ============================================================
-- ATOMUS.edu — Exam Authorship
-- Adds creator fields to the exams table so admins can see and
-- filter exams by who created them (admin vs teacher), plus
-- denormalized name/role for cheap display without joining
-- auth.users.
-- Run AFTER marks_management.sql.
-- ============================================================

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_role TEXT
    CHECK (creator_role IN ('admin', 'teacher'));

CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_creator_role ON exams(creator_role);
