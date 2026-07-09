-- ATOMUS.edu — Teachers: support multiple campus assignments
ALTER TABLE public.teachers 
  ADD COLUMN IF NOT EXISTS assigned_campuses UUID[];

-- Initialize the array column using the existing single campus_id for all teachers
UPDATE public.teachers 
  SET assigned_campuses = ARRAY[campus_id] 
  WHERE campus_id IS NOT NULL AND assigned_campuses IS NULL;
