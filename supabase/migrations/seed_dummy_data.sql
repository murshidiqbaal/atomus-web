-- ============================================================
-- ATOMUS.edu — Dummy Data Insertion Script
-- Run this in Supabase SQL Editor to populate tables with sample data.
-- ============================================================

-- 1. COURSES
INSERT INTO courses (id, name, description, duration_months) VALUES
('c1000000-0000-0000-0000-000000000001', 'Web Development Boot Camp', 'Full-stack web development course covering HTML, CSS, JavaScript, and Node.js.', 6),
('c2000000-0000-0000-0000-000000000002', 'Data Science Foundation', 'Introduction to Python, data analysis, and machine learning principles.', 8),
('c3000000-0000-0000-0000-000000000003', 'UI/UX Design Masterclass', 'Comprehensive guide to user interface and experience design.', 4);

-- 2. BATCHES
INSERT INTO batches (id, course_id, name, timing, is_active) VALUES
('b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Morning Batch - A', '09:00 AM - 12:00 PM', TRUE),
('b2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Evening Batch - B', '06:00 PM - 09:00 PM', TRUE),
('b3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', 'Weekend Intensive', 'Saturday-Sunday All Day', TRUE);

-- 3. PARENTS
-- Note: In a real Supabase setup, these IDs should correspond to auth.users.id.
INSERT INTO parents (id, full_name, email, phone_number, username, password_hash, account_status) VALUES
('p1000000-0000-0000-0000-000000000001', 'John Doe', 'john.doe@example.com', '9876543210', '9876543210', 'hashed_pass_1', 'Active'),
('p2000000-0000-0000-0000-000000000002', 'Jane Smith', 'jane.smith@example.com', '8765432109', '8765432109', 'hashed_pass_2', 'Active');

-- 4. STUDENTS
INSERT INTO students (id, full_name, admission_number, roll_number, parent_id, course_id, batch_id, attendance_percentage, progress_status) VALUES
('s1000000-0000-0000-0000-000000000001', 'Alice Doe', 'ADM001', 'R101', 'p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 95.5, 'Excellent'),
('s2000000-0000-0000-0000-000000000002', 'Bob Smith', 'ADM002', 'R102', 'p2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 88.0, 'Good'),
('s3000000-0000-0000-0000-000000000003', 'Charlie Brown', 'ADM003', 'R103', 'p1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 75.0, 'Average');

-- 5. TEACHERS
INSERT INTO teachers (id, full_name, email, phone_number, subject_specialization, assigned_courses, assigned_batches, account_status) VALUES
('t1000000-0000-0000-0000-000000000001', 'Dr. Robert Miller', 'robert.miller@example.com', '7654321098', 'Full-stack Development', '{c1000000-0000-0000-0000-000000000001}', '{b1000000-0000-0000-0000-000000000001, b2000000-0000-0000-0000-000000000002}', 'Active'),
('t2000000-0000-0000-0000-000000000002', 'Prof. Sarah Wilson', 'sarah.wilson@example.com', '6543210987', 'Data Analysis', '{c2000000-0000-0000-0000-000000000002}', '{b3000000-0000-0000-0000-000000000003}', 'Active');

-- 6. ATTENDANCE
INSERT INTO attendance (student_id, batch_id, attendance_date, status) VALUES
('s1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', CURRENT_DATE, 'Present'),
('s2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', CURRENT_DATE, 'Absent'),
('s3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '1 day', 'Present');

-- 7. EXAMS
INSERT INTO exams (id, course_id, batch_id, name, subject, total_marks, exam_date) VALUES
('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Mid-Term Exam', 'JavaScript Fundamentals', 100, CURRENT_DATE + INTERVAL '7 days'),
('e2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 'Intro Quiz', 'Python Basics', 50, CURRENT_DATE + INTERVAL '14 days');

-- 8. MARKS
-- Note: Normally marks are entered AFTER exam_date, but for dummy data we will add past examples if needed.
INSERT INTO marks (exam_id, student_id, marks_obtained, total_marks, remarks) VALUES
('e1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 92.5, 100, 'Excellent performance'),
('e1000000-0000-0000-0000-000000000001', 's2000000-0000-0000-0000-000000000002', 78.0, 100, 'Good job');

-- 9. FEE STRUCTURES
INSERT INTO fee_structures (course_id, batch_id, total_amount, admission_fee, monthly_fee) VALUES
('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 50000.00, 5000.00, 7500.00),
('c2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 60000.00, 6000.00, 9000.00);

-- 10. STUDENT FEES
INSERT INTO student_fees (student_id, total_fee, paid_amount, payment_status, due_date) VALUES
('s1000000-0000-0000-0000-000000000001', 50000.00, 20000.00, 'Partial', CURRENT_DATE + INTERVAL '30 days'),
('s2000000-0000-0000-0000-000000000002', 50000.00, 50000.00, 'Paid', CURRENT_DATE - INTERVAL '5 days'),
('s3000000-0000-0000-0000-000000000003', 60000.00, 0.00, 'Pending', CURRENT_DATE + INTERVAL '10 days');

-- 11. PAYMENT TRANSACTIONS
INSERT INTO payment_transactions (student_id, amount_paid, payment_method, remarks) VALUES
('s1000000-0000-0000-0000-000000000001', 10000.00, 'UPI / GPay', 'Initial admission payment'),
('s1000000-0000-0000-0000-000000000001', 10000.00, 'Cash', 'First month installment'),
('s2000000-0000-0000-0000-000000000002', 50000.00, 'Bank Transfer', 'Full course payment');

-- 12. ANNOUNCEMENTS
INSERT INTO announcements (title, content, priority, audience, is_published, published_at) VALUES
('Welcome to ATOMUS.edu!', 'We are excited to have you all here for the new semester.', 'Normal', 'All', TRUE, NOW()),
('New Batch Starting Soon', 'Registrations for the June Web Dev batch are now open.', 'Important', 'Students', TRUE, NOW()),
('Teacher Training Session', 'A mandatory session for all teachers this Friday at 4 PM.', 'Urgent', 'Teachers', TRUE, NOW());
