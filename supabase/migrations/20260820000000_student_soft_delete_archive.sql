-- ============================================================
-- ATOMUS — Student Soft Delete / Archive Migration
-- ============================================================

-- 1. Add columns to public.students safely
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_students_is_active
ON public.students(is_active);

CREATE INDEX IF NOT EXISTS idx_students_active_campus
ON public.students(is_active, campus_id);

CREATE INDEX IF NOT EXISTS idx_students_active_parent
ON public.students(is_active, parent_id);

-- 3. Update Row Level Security (RLS) policies on public.students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop previous student policies
DROP POLICY IF EXISTS "Admin/teacher read students" ON public.students;
DROP POLICY IF EXISTS "Parent read own students" ON public.students;
DROP POLICY IF EXISTS "Admin write students" ON public.students;
DROP POLICY IF EXISTS "Admin read all students" ON public.students;
DROP POLICY IF EXISTS "Teacher read active students" ON public.students;
DROP POLICY IF EXISTS "Parent read active students" ON public.students;

-- Admin: Read all students (active + archived)
CREATE POLICY "Admin read all students" ON public.students
  FOR SELECT
  USING (get_user_role() = 'admin');

-- Admin: Full write operations
CREATE POLICY "Admin write students" ON public.students
  FOR ALL
  USING (get_user_role() = 'admin');

-- Teachers: Read active students only
CREATE POLICY "Teacher read active students" ON public.students
  FOR SELECT
  USING (
    get_user_role() = 'teacher'
    AND is_active = TRUE
  );

-- Parents: Read active students linked to them only
CREATE POLICY "Parent read active students" ON public.students
  FOR SELECT
  USING (
    parent_id = auth.uid()
    AND is_active = TRUE
  );
