-- ============================================================
-- ATOMUS.edu — Mobile App Downloads management table
-- Stores the Android APK and iOS IPA download configuration
-- so that the admin can update file URLs, versions and
-- availability without touching any HTML files.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_downloads (
  platform      TEXT PRIMARY KEY CHECK (platform IN ('android', 'ios')),
  download_url  TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT '1.0.0',
  min_os        TEXT NOT NULL DEFAULT '7.0+',
  file_size     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  drive_file_id TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current on every row-level change
CREATE OR REPLACE FUNCTION public.touch_app_downloads()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_downloads_updated ON public.app_downloads;
CREATE TRIGGER trg_app_downloads_updated
  BEFORE UPDATE ON public.app_downloads
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_downloads();

ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;

-- Public read — so the frontend website can fetch this without auth
DO $$ BEGIN
  CREATE POLICY "app_downloads_public_read"
    ON public.app_downloads FOR SELECT
    TO public USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only admins can write
DO $$ BEGIN
  CREATE POLICY "app_downloads_admin_write"
    ON public.app_downloads FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed initial records ──────────────────────────────────────────
INSERT INTO public.app_downloads (platform, download_url, version, min_os, file_size, is_active)
VALUES
  ('android', 'https://github.com/murshidiqbaal/atomus-web/releases/download/Atomus-Android/atomus.apk', '1.2.4', 'Android 7.0+', NULL, true),
  ('ios',     '',                                                                                          '1.0.0', 'iOS 14.0+',    NULL, false)
ON CONFLICT (platform) DO NOTHING;
