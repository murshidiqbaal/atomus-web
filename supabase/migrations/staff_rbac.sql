-- ============================================================
-- ATOMUS.edu — Staff Access & Role-Based Access Control (RBAC)
-- Run this in your Supabase SQL Editor to set up the DB tables.
-- ============================================================

-- 1. Create staff_accounts table
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  designation TEXT,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auth_id UUID, -- For linking with Supabase Auth (auth.users.id)
  CONSTRAINT staff_accounts_pkey PRIMARY KEY (id)
);

-- Index for username searches
CREATE INDEX IF NOT EXISTS idx_staff_accounts_username ON public.staff_accounts(username);

-- 2. Create staff_permissions table
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  can_mark BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT staff_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT staff_permissions_staff_module_unique UNIQUE (staff_id, module)
);

-- Index for fast permission lookups per staff member
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff ON public.staff_permissions(staff_id);

-- 3. Create staff_activity_logs table
CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff_accounts(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT staff_activity_logs_pkey PRIMARY KEY (id)
);

-- Indices for filtering logs by date and staff
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_staff ON public.staff_activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_date ON public.staff_activity_logs(created_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Allow authenticated admins and staff to read; restrict writes to admin)
DROP POLICY IF EXISTS "Admins and staff can select staff_accounts" ON public.staff_accounts;
CREATE POLICY "Admins and staff can select staff_accounts" ON public.staff_accounts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admins can modify staff_accounts" ON public.staff_accounts;
CREATE POLICY "Only admins can modify staff_accounts" ON public.staff_accounts
  FOR ALL TO authenticated
  USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'staff'
    ) = 'admin'
  );

DROP POLICY IF EXISTS "Admins and staff can select staff_permissions" ON public.staff_permissions;
CREATE POLICY "Admins and staff can select staff_permissions" ON public.staff_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admins can modify staff_permissions" ON public.staff_permissions;
CREATE POLICY "Only admins can modify staff_permissions" ON public.staff_permissions
  FOR ALL TO authenticated
  USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'staff'
    ) = 'admin'
  );

DROP POLICY IF EXISTS "Admins and staff can select staff_activity_logs" ON public.staff_activity_logs;
CREATE POLICY "Admins and staff can select staff_activity_logs" ON public.staff_activity_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow inserts to staff_activity_logs for authenticated" ON public.staff_activity_logs;
CREATE POLICY "Allow inserts to staff_activity_logs for authenticated" ON public.staff_activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);
