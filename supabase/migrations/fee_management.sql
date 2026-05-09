-- 1. Fee Structures (Course-wise setup)
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    admission_fee DECIMAL(10,2) DEFAULT 0,
    monthly_fee DECIMAL(10,2) NOT NULL,
    installment_count INTEGER DEFAULT 1,
    due_date_day INTEGER DEFAULT 10, -- Day of the month
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Student Fee Master (Tracks total paid/balance per student)
CREATE TABLE IF NOT EXISTS student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id),
    total_fee DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending', -- Paid, Pending, Partial, Overdue
    last_payment_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id)
);

-- 3. Payment Transactions (History of every payment)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL, -- Cash, UPI, Bank Transfer, QR
    transaction_id TEXT,
    remarks TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Function to Update Student Fee Balance automatically after a transaction
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
    WHERE student_id = NEW.student_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for balance update
CREATE TRIGGER trg_update_fee_balance
AFTER INSERT ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_student_fee_balance();

-- Indexes for performance
CREATE INDEX idx_student_fees_status ON student_fees(payment_status);
CREATE INDEX idx_transactions_date ON payment_transactions(payment_date);
CREATE INDEX idx_fee_structures_course ON fee_structures(course_id);
