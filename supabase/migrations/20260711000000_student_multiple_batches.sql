-- Database migration: Support multiple batches per student
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_ids UUID[] DEFAULT '{}';

-- Migrate existing student batch data to the new batch_ids array
UPDATE students 
SET batch_ids = ARRAY[batch_id] 
WHERE batch_id IS NOT NULL;
