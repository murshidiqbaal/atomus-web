-- ============================================================
-- ATOMUS.edu — Cloudflare R2 migration schema updates
-- Renames all old Google Drive columns to R2 standard columns
-- ============================================================

-- 1. Students table migration
ALTER TABLE public.students 
  RENAME COLUMN profile_photo_url TO image_url;
ALTER TABLE public.students 
  RENAME COLUMN profile_photo_drive_id TO storage_key;
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Parents table migration
ALTER TABLE public.parents 
  RENAME COLUMN profile_photo_url TO image_url;
ALTER TABLE public.parents 
  RENAME COLUMN profile_photo_drive_id TO storage_key;
ALTER TABLE public.parents 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Teachers table migration
ALTER TABLE public.teachers 
  RENAME COLUMN profile_photo_url TO image_url;
ALTER TABLE public.teachers 
  RENAME COLUMN profile_photo_drive_id TO storage_key;
ALTER TABLE public.teachers 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. Announcements table migration
ALTER TABLE public.announcements 
  RENAME COLUMN image_drive_id TO storage_key;
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. Posters table migration
ALTER TABLE public.posters 
  RENAME COLUMN drive_file_id TO storage_key;
ALTER TABLE public.posters 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. Certificates table migration
ALTER TABLE public.certificates 
  RENAME COLUMN file_url TO image_url;
ALTER TABLE public.certificates 
  RENAME COLUMN drive_file_id TO storage_key;
ALTER TABLE public.certificates 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. App Downloads table migration
ALTER TABLE public.app_downloads 
  RENAME COLUMN drive_file_id TO storage_key;
ALTER TABLE public.app_downloads 
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2';
