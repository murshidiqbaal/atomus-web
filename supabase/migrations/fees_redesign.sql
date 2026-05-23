-- ============================================================
-- ATOMUS.edu — Fees Redesign
-- Adds campus scoping + universal scope flags on fee_structures,
-- a friendly name, an is_active flag, and analytic indexes on the
-- existing fees / payments tables.
-- Run AFTER fee_management.sql.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- fee_structures: scope expansion
-- ─────────────────────────────────────────────────────────────
ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS applies_to_all_campuses BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS applies_to_all_batches  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- If applies_to_all_campuses is true, campus_id must be null.
-- If applies_to_all_batches  is true, batch_id  must be null.
DO $$ BEGIN
  ALTER TABLE fee_structures
    ADD CONSTRAINT fee_structures_scope_consistency CHECK (
      (applies_to_all_campuses = FALSE OR campus_id IS NULL) AND
      (applies_to_all_batches  = FALSE OR batch_id  IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for the directory + smart resolution lookups.
CREATE INDEX IF NOT EXISTS idx_fee_structures_campus      ON fee_structures(campus_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_batch       ON fee_structures(batch_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_active      ON fee_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_fee_structures_all_campus  ON fee_structures(applies_to_all_campuses);
CREATE INDEX IF NOT EXISTS idx_fee_structures_all_batches ON fee_structures(applies_to_all_batches);

-- ─────────────────────────────────────────────────────────────
-- Performance indexes on student_fees and payment_transactions
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_fees_student     ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_structure   ON student_fees(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_updated     ON student_fees(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_student       ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_method        ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_tx_recorded_by   ON payment_transactions(recorded_by);

-- ─────────────────────────────────────────────────────────────
-- Overdue recompute function
-- Marks any student_fees row with balance > 0 as Overdue when the
-- structure's monthly due day has passed for the current month.
-- Idempotent — safe to schedule daily or call on demand.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_overdue_fees()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH due AS (
    SELECT sf.id
    FROM student_fees sf
    JOIN fee_structures fs ON fs.id = sf.fee_structure_id
    WHERE sf.balance_amount > 0
      AND sf.payment_status IN ('Pending', 'Partial')
      AND EXTRACT(DAY FROM CURRENT_DATE) > COALESCE(fs.due_date_day, 10)
  )
  UPDATE student_fees
  SET payment_status = 'Overdue',
      updated_at = NOW()
  WHERE id IN (SELECT id FROM due);

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;
