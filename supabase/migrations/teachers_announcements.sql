-- ============================================================
-- ATOMUS.edu — Teachers & Announcements Migration
-- ============================================================

-- TEACHERS TABLE
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

-- Enable RLS on teachers
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access on teachers"
  ON teachers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Teachers can read their own record
CREATE POLICY "Teachers read own record"
  ON teachers FOR SELECT
  USING (auth_id = auth.uid());

-- ANNOUNCEMENTS TABLE
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

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Admin can manage all announcements
CREATE POLICY "Admin full access on announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Parents can read published announcements for 'All' or 'Parents'
CREATE POLICY "Parents read published announcements"
  ON announcements FOR SELECT
  USING (
    is_published = TRUE
    AND (audience = 'All' OR audience = 'Parents')
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'role') = 'parent'
    )
  );

-- Teachers can read published announcements for 'All' or 'Teachers'
CREATE POLICY "Teachers read published announcements"
  ON announcements FOR SELECT
  USING (
    is_published = TRUE
    AND (audience = 'All' OR audience = 'Teachers')
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'role') = 'teacher'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(account_status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, audience);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
