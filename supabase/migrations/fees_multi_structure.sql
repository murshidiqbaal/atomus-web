-- ============================================================
-- ATOMUS.edu — Multiple fee structures per student
--
-- Previously student_fees had UNIQUE(student_id), so a student
-- could only ever hold ONE fee structure. This:
--   • Replaces that with UNIQUE(student_id, fee_structure_id),
--     so a student can be assigned many structures (one row each).
--   • Adds payment_transactions.student_fee_id so a payment is
--     attributed to a specific structure row (the balance trigger
--     can no longer rely on a single row per student).
--   • Rewrites the balance trigger to target that row.
--
-- Run AFTER fees_term_based.sql. Idempotent — safe to re-run.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Drop the single-structure-per-student constraint.
--    The CREATE TABLE `UNIQUE(student_id)` is normally auto-named
--    student_fees_student_id_key, but drop ANY unique constraint
--    whose only column is student_id, whatever it is called.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_key;

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'student_fees'::regclass
      AND c.contype = 'u'
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'student_fees'::regclass AND attname = 'student_id')
      ]
  LOOP
    EXECUTE format('ALTER TABLE student_fees DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- One row per (student, structure). Manual/ad-hoc rows keep
-- fee_structure_id NULL; NULLs are distinct in a UNIQUE index, so a
-- student can still carry several manual rows without colliding.
ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_student_structure_uniq;
ALTER TABLE student_fees ADD  CONSTRAINT student_fees_student_structure_uniq
  UNIQUE (student_id, fee_structure_id);

CREATE INDEX IF NOT EXISTS idx_student_fees_structure ON student_fees(fee_structure_id);

-- Stable ordering for the per-student structure tabs.
ALTER TABLE student_fees
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- 2. Attribute each payment to a specific student_fees row.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payment_tx_student_fee ON payment_transactions(student_fee_id);

-- Backfill legacy transactions: if a student has exactly one fee row,
-- point old payments at it so history stays attributable.
UPDATE payment_transactions pt
SET student_fee_id = sf.id
FROM student_fees sf
WHERE pt.student_fee_id IS NULL
  AND sf.student_id = pt.student_id
  AND (SELECT COUNT(*) FROM student_fees x WHERE x.student_id = pt.student_id) = 1;

-- ─────────────────────────────────────────────────────────────
-- 3. Balance trigger updates the targeted row (falls back to
--    student_id for any legacy payment with no student_fee_id).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_student_fee_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_fees
    SET
        paid_amount = paid_amount + NEW.amount_paid,
        balance_amount = balance_amount - NEW.amount_paid,
        last_payment_date = NEW.payment_date,
        payment_status = CASE
            WHEN (balance_amount - NEW.amount_paid) <= 0 THEN 'Paid'
            WHEN (paid_amount + NEW.amount_paid) > 0 THEN 'Partial'
            ELSE 'Pending'
        END,
        updated_at = NOW()
    WHERE (NEW.student_fee_id IS NOT NULL AND id = NEW.student_fee_id)
       OR (NEW.student_fee_id IS NULL AND student_id = NEW.student_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
