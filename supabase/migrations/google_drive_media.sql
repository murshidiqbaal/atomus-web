-- ============================================================
-- ATOMUS.edu — Google Drive media columns + posters/certificates
-- Adds public Drive URL + file-id columns to existing tables so
-- the admin can replace Supabase Storage with Drive. Adds two
-- new tables (posters, certificates) for admin-managed media.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Profile photo columns (students, parents, teachers)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS profile_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_drive_id TEXT;

ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS profile_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_drive_id TEXT;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS profile_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_drive_id TEXT;

-- Announcements already have image_url; add the drive id for cleanup.
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS image_drive_id TEXT;

-- ─────────────────────────────────────────────────────────────
-- Posters (admin-managed shareable assets)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posters_created_at ON posters(created_at DESC);

ALTER TABLE posters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY posters_select_authed
    ON posters FOR SELECT
    TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY posters_admin_write
    ON posters FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- Certificates (per-student, image or pdf)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT,
  drive_file_id TEXT NOT NULL,
  issued_on     DATE,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_student   ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_on ON certificates(issued_on DESC);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY certificates_select_authed
    ON certificates FOR SELECT
    TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY certificates_admin_write
    ON certificates FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
