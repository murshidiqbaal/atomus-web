-- ============================================================
-- ATOMUS.edu — Marks constraints cleanup
--
-- Removes leftover and redundant UNIQUE constraints on
-- public.marks that block subject-wise marks per (exam, student).
--
-- Root cause: marks_management.sql tried to drop the original
-- inline UNIQUE(exam_id, student_id) by its auto-generated name
-- (marks_exam_id_student_id_key). On this database that
-- constraint had been renamed to `unique_student_exam`, so the
-- DROP silently no-op'd. Three further redundant unique
-- constraints on (exam_id, student_id, subject_id) accumulated.
--
-- After this script, uniqueness is enforced solely by the
-- partial-NULL-aware unique INDEX `marks_exam_student_subject_uidx`,
-- which correctly treats NULL subject_id as a single bucket
-- (so "Overall" marks stay unique per exam/student too).
-- ============================================================

BEGIN;

ALTER TABLE public.marks
  DROP CONSTRAINT IF EXISTS unique_student_exam,
  DROP CONSTRAINT IF EXISTS unique_exam_student_subject,
  DROP CONSTRAINT IF EXISTS unique_student_exam_subject,
  DROP CONSTRAINT IF EXISTS marks_exam_student_subject_unique,
  DROP CONSTRAINT IF EXISTS marks_exam_id_student_id_key;

-- Ensure the correct enforcement index is present.
CREATE UNIQUE INDEX IF NOT EXISTS marks_exam_student_subject_uidx
  ON public.marks (
    exam_id,
    student_id,
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

COMMIT;
