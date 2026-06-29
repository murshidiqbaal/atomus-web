-- ============================================================
-- ATOMUS.edu — Parent App Activity Tracking System
-- Stores logs of when parents open the app, their device info,
-- and active session durations.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parent_app_activity_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id                 UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  parent_name               TEXT,
  device_platform           TEXT NOT NULL CHECK (device_platform IN ('Android', 'iOS', 'Unknown')),
  app_version               TEXT NOT NULL,
  login_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  opened_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_duration_minutes  NUMERIC(10,2) NOT NULL DEFAULT 0.0, -- In minutes
  ip_address                TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, login_date)
);

-- Indexing for pagination and efficient filtering (supporting 5000+ parents)
CREATE INDEX IF NOT EXISTS idx_parent_activity_logs_date ON public.parent_app_activity_logs(login_date DESC);
CREATE INDEX IF NOT EXISTS idx_parent_activity_logs_parent ON public.parent_app_activity_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_activity_logs_name ON public.parent_app_activity_logs(parent_name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.parent_app_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin and staff have full access
DO $$ BEGIN
  CREATE POLICY "parent_activity_logs_admin_all"
    ON public.parent_app_activity_logs FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin' OR get_user_role() = 'staff')
    WITH CHECK (get_user_role() = 'admin' OR get_user_role() = 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 2: Parents can select their own activity logs
DO $$ BEGIN
  CREATE POLICY "parent_activity_logs_parent_read"
    ON public.parent_app_activity_logs FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 3: Parents can insert their own activity logs
DO $$ BEGIN
  CREATE POLICY "parent_activity_logs_parent_insert"
    ON public.parent_app_activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (parent_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 4: Parents can update their own activity logs
DO $$ BEGIN
  CREATE POLICY "parent_activity_logs_parent_update"
    ON public.parent_app_activity_logs FOR UPDATE
    TO authenticated
    USING (parent_id = auth.uid())
    WITH CHECK (parent_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RPC for dashboard metrics
CREATE OR REPLACE FUNCTION public.get_parent_activity_metrics()
RETURNS JSONB AS $$
DECLARE
  today_count INTEGER;
  weekly_count INTEGER;
  monthly_count INTEGER;
  avg_duration NUMERIC(10,2);
  result JSONB;
BEGIN
  -- Security check: only admin and staff can fetch these metrics
  IF public.get_user_role() NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Access denied. Unauthorized role.';
  END IF;

  -- Today's Active Parents
  SELECT COUNT(DISTINCT parent_id) INTO today_count
  FROM public.parent_app_activity_logs
  WHERE login_date = CURRENT_DATE;

  -- Weekly Active Parents (last 7 days)
  SELECT COUNT(DISTINCT parent_id) INTO weekly_count
  FROM public.parent_app_activity_logs
  WHERE login_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Monthly Active Parents (last 30 days)
  SELECT COUNT(DISTINCT parent_id) INTO monthly_count
  FROM public.parent_app_activity_logs
  WHERE login_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Average Session Duration (all logs, using session_duration_minutes)
  SELECT COALESCE(AVG(session_duration_minutes), 0.0) INTO avg_duration
  FROM public.parent_app_activity_logs;

  result := jsonb_build_object(
    'today_active', today_count,
    'weekly_active', weekly_count,
    'monthly_active', monthly_count,
    'avg_session_duration', ROUND(avg_duration, 2)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
