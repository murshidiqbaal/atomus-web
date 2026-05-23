-- ============================================================
-- ATOMUS.edu — Fees Term-Based Redesign
--
-- Replaces batch-scoped + monthly-installment logic with manual
-- term-based fee structures (Monthly / Quarterly / Half-Yearly /
-- Yearly / Custom) and per-student term tracking via JSONB.
--
-- Run AFTER fees_redesign.sql.
-- Idempotent — safe to re-run.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- fee_structures: term-based columns
-- (campus_id and name already added in fees_redesign.sql)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS term_count    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fee_frequency TEXT    DEFAULT 'Monthly',
  ADD COLUMN IF NOT EXISTS term_details  JSONB   DEFAULT '[]'::jsonb;

-- batch_id is already nullable from fee_management.sql; ensure it stays that way.
ALTER TABLE fee_structures ALTER COLUMN batch_id DROP NOT NULL;

-- Frequency whitelist
ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_frequency_check;
ALTER TABLE fee_structures ADD  CONSTRAINT fee_frequency_check
  CHECK (fee_frequency IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom'));

-- Term count must be positive
ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS term_count_check;
ALTER TABLE fee_structures ADD  CONSTRAINT term_count_check
  CHECK (term_count > 0);

-- term_details must be a JSON array (objects validated at app layer)
ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS term_details_is_array;
ALTER TABLE fee_structures ADD  CONSTRAINT term_details_is_array
  CHECK (jsonb_typeof(term_details) = 'array');

CREATE INDEX IF NOT EXISTS idx_fee_structures_frequency ON fee_structures(fee_frequency);

-- ─────────────────────────────────────────────────────────────
-- student_fees: per-term status tracked as JSONB array
--   Each element:
--     { term_name, amount_due, amount_paid, status, due_date }
--   status ∈ ('Paid', 'Partial', 'Pending', 'Overdue')
-- ─────────────────────────────────────────────────────────────
ALTER TABLE student_fees
  ADD COLUMN IF NOT EXISTS term_status JSONB DEFAULT '[]'::jsonb;

ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_term_status_is_array;
ALTER TABLE student_fees ADD  CONSTRAINT student_fees_term_status_is_array
  CHECK (jsonb_typeof(term_status) = 'array');

COMMIT;
