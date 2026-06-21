-- ============================================================
-- ATOMUS.edu — Password Recovery & Security Enhancements
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auth_id UUID, -- For linking with Supabase Auth (auth.users.id)
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

-- 2. Update staff_accounts table
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 3. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'staff')),
  email TEXT NOT NULL,
  reset_token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Admins and staff can select admins" ON public.admins;
CREATE POLICY "Admins and staff can select admins" ON public.admins
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admins can modify admins" ON public.admins;
CREATE POLICY "Only admins can modify admins" ON public.admins
  FOR ALL TO authenticated USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'staff'
    ) = 'admin'
  );

DROP POLICY IF EXISTS "Only admin can view/manage reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Only admin can view/manage reset tokens" ON public.password_reset_tokens
  FOR ALL TO authenticated USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'staff'
    ) = 'admin'
  );
