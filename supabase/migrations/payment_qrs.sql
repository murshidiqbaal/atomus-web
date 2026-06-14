-- ============================================================
-- ATOMUS.edu — Payment QR Codes & Parent Transactions Policy
-- Adds payment QR code fields to campuses, updates RLS policies,
-- and auto-allocates payments to term status array.
-- ============================================================

-- 1. Add payment QR code fields to campuses table
ALTER TABLE campuses
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_drive_id TEXT;

-- 2. Redefine update_student_fee_balance trigger function with SECURITY DEFINER and term_status JSONB auto-allocation
CREATE OR REPLACE FUNCTION update_student_fee_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_term_status JSONB;
  v_term RECORD;
  v_updated_terms JSONB := '[]'::jsonb;
  v_remaining_paid NUMERIC;
  v_term_amount NUMERIC;
  v_term_paid NUMERIC;
  v_term_status_str TEXT;
BEGIN
    -- Get current term_status
    SELECT term_status INTO v_term_status
    FROM student_fees
    WHERE student_id = NEW.student_id;

    -- Update aggregate student_fees columns
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
    WHERE student_id = NEW.student_id;

    -- Dynamically allocate total paid_amount to individual terms in JSONB
    IF v_term_status IS NOT NULL AND jsonb_array_length(v_term_status) > 0 THEN
      -- Get total paid amount for the student after this transaction
      SELECT paid_amount INTO v_remaining_paid
      FROM student_fees
      WHERE student_id = NEW.student_id;

      FOR v_term IN SELECT * FROM jsonb_to_recordset(v_term_status) AS x(term_name TEXT, amount_due NUMERIC, amount_paid NUMERIC, status TEXT, due_date TEXT) LOOP
        v_term_amount := v_term.amount_due;
        
        IF v_remaining_paid >= v_term_amount THEN
          v_term_paid := v_term_amount;
          v_term_status_str := 'Paid';
          v_remaining_paid := v_remaining_paid - v_term_amount;
        ELSIF v_remaining_paid > 0 THEN
          v_term_paid := v_remaining_paid;
          v_term_status_str := 'Partially Paid';
          v_remaining_paid := 0;
        ELSE
          v_term_paid := 0;
          v_term_status_str := 'Pending';
        END IF;

        v_updated_terms := v_updated_terms || jsonb_build_object(
          'term_name', v_term.term_name,
          'amount_due', v_term.amount_due,
          'amount_paid', v_term_paid,
          'status', v_term_status_str,
          'due_date', v_term.due_date
        );
      END LOOP;

      UPDATE student_fees
      SET term_status = v_updated_terms
      WHERE student_id = NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add policies for parents to view and insert payment transactions
DROP POLICY IF EXISTS "Parent select payment_transactions" ON payment_transactions;
CREATE POLICY "Parent select payment_transactions" ON payment_transactions
  FOR SELECT USING (
    get_user_role() = 'parent' AND
    student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
  );

DROP POLICY IF EXISTS "Parent insert payment_transactions" ON payment_transactions;
CREATE POLICY "Parent insert payment_transactions" ON payment_transactions
  FOR INSERT WITH CHECK (
    get_user_role() = 'parent' AND
    student_id IN (SELECT id FROM students WHERE parent_id = auth.uid())
  );
