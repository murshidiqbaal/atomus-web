-- ============================================================
-- ATOMUS.edu — Course Management Module (Phase 1)
-- Adds: campuses, campus_courses, extends courses + batches,
--       creates the `course-thumbnails` storage bucket + policies.
--
-- Idempotent — safe to run multiple times on a dev database.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- CAMPUSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campuses_name_ci
  ON campuses (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_campuses_active
  ON campuses (is_active);

-- ─────────────────────────────────────────────────────────────
-- COURSES — extend with new attributes
-- (Keeps existing columns: id, name, description, duration_months, created_at)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_type    TEXT NOT NULL DEFAULT 'Regular',
  ADD COLUMN IF NOT EXISTS class_level    TEXT,
  ADD COLUMN IF NOT EXISTS fee_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mode           TEXT NOT NULL DEFAULT 'Offline',
  ADD COLUMN IF NOT EXISTS thumbnail_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE;

-- Enum-style checks (dropped & re-added so the script stays idempotent)
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_course_type_check;
ALTER TABLE courses ADD  CONSTRAINT courses_course_type_check
  CHECK (course_type IN ('Regular','Crash Course','Foundation','Revision Batch','Entrance Coaching'));

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_mode_check;
ALTER TABLE courses ADD  CONSTRAINT courses_mode_check
  CHECK (mode IN ('Offline','Online','Hybrid'));

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_fee_amount_check;
ALTER TABLE courses ADD  CONSTRAINT courses_fee_amount_check
  CHECK (fee_amount >= 0);

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_duration_months_check;
ALTER TABLE courses ADD  CONSTRAINT courses_duration_months_check
  CHECK (duration_months IS NULL OR duration_months > 0);

CREATE INDEX IF NOT EXISTS idx_courses_active      ON courses (is_active);
CREATE INDEX IF NOT EXISTS idx_courses_mode        ON courses (mode);
CREATE INDEX IF NOT EXISTS idx_courses_class_level ON courses (class_level);
CREATE INDEX IF NOT EXISTS idx_courses_type        ON courses (course_type);

-- ─────────────────────────────────────────────────────────────
-- CAMPUS ⇄ COURSE  (M:N)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campus_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id   UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campus_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_courses_campus ON campus_courses (campus_id);
CREATE INDEX IF NOT EXISTS idx_campus_courses_course ON campus_courses (course_id);

-- ─────────────────────────────────────────────────────────────
-- BATCHES — add capacity + direct campus pointer
-- (Keeps existing: id, course_id, name, timing, is_active, created_at)
-- A batch belongs to one campus; the (campus_id, course_id) pair must
-- exist in campus_courses (enforced via trigger below to allow the FK
-- to remain ON DELETE SET NULL).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS campus_id  UUID REFERENCES campuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity   INTEGER;

ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_capacity_check;
ALTER TABLE batches ADD  CONSTRAINT batches_capacity_check
  CHECK (capacity IS NULL OR capacity > 0);

CREATE INDEX IF NOT EXISTS idx_batches_campus ON batches (campus_id);

CREATE OR REPLACE FUNCTION enforce_batch_campus_course_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campus_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM campus_courses
    WHERE campus_id = NEW.campus_id AND course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION
      'Batch campus/course pair (%, %) is not linked in campus_courses',
      NEW.campus_id, NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batches_campus_course_link ON batches;
CREATE TRIGGER trg_batches_campus_course_link
  BEFORE INSERT OR UPDATE OF campus_id, course_id ON batches
  FOR EACH ROW EXECUTE FUNCTION enforce_batch_campus_course_link();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE campuses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_courses  ENABLE ROW LEVEL SECURITY;

-- Policies are idempotent via DROP IF EXISTS + CREATE
DROP POLICY IF EXISTS "Auth users read campuses"        ON campuses;
DROP POLICY IF EXISTS "Admin write campuses"            ON campuses;
DROP POLICY IF EXISTS "Auth users read campus_courses"  ON campus_courses;
DROP POLICY IF EXISTS "Admin write campus_courses"      ON campus_courses;

CREATE POLICY "Auth users read campuses"
  ON campuses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin write campuses"
  ON campuses FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Auth users read campus_courses"
  ON campus_courses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin write campus_courses"
  ON campus_courses FOR ALL USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- STORAGE — course-thumbnails bucket (public-read, admin-write)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read course thumbnails"  ON storage.objects;
DROP POLICY IF EXISTS "Admin write course thumbnails"  ON storage.objects;

CREATE POLICY "Public read course thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Admin write course thumbnails"
  ON storage.objects FOR ALL
  USING (bucket_id = 'course-thumbnails' AND get_user_role() = 'admin')
  WITH CHECK (bucket_id = 'course-thumbnails' AND get_user_role() = 'admin');
