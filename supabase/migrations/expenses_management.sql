-- ============================================================
-- ATOMUS.edu — Expenses Management
-- Adds expense_categories and expenses tables, seeds default
-- categories, and creates indexes for analytics queries.
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. EXPENSE CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'receipt',
  color      TEXT NOT NULL DEFAULT '#0B3C5D',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_name_ci
  ON expense_categories (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_expense_categories_active
  ON expense_categories (is_active);

-- Seed defaults (idempotent — skip if already present by name)
INSERT INTO expense_categories (name, icon, color, is_default)
VALUES
  ('Electricity',   'zap',       '#F59E0B', TRUE),
  ('WiFi',          'wifi',      '#3B82F6', TRUE),
  ('Rent',          'building',  '#8B5CF6', TRUE),
  ('Salary',        'users',     '#0B3C5D', TRUE),
  ('Maintenance',   'wrench',    '#EF4444', TRUE),
  ('Marketing',     'sparkles',  '#EC4899', TRUE),
  ('Stationery',    'pencil',    '#10B981', TRUE),
  ('Transport',     'bus',       '#06B6D4', TRUE),
  ('Miscellaneous', 'receipt',   '#94A3B8', TRUE)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  category_id    UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount         NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  campus_id      UUID REFERENCES campuses(id) ON DELETE SET NULL,
  notes          TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE expenses ADD  CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Card'));

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;
ALTER TABLE expenses ADD  CONSTRAINT expenses_amount_check
  CHECK (amount >= 0);

-- Analytics-friendly indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category    ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_campus      ON expenses (campus_id);
CREATE INDEX IF NOT EXISTS idx_expenses_method      ON expenses (payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_date_campus ON expenses (expense_date DESC, campus_id);

-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Admin write expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Auth read expenses"            ON expenses;
DROP POLICY IF EXISTS "Admin write expenses"          ON expenses;

CREATE POLICY "Auth read expense_categories"
  ON expense_categories FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin write expense_categories"
  ON expense_categories FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Auth read expenses"
  ON expenses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin write expenses"
  ON expenses FOR ALL USING (get_user_role() = 'admin');
