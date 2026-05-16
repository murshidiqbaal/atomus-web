-- Migration for Announcements Management Module

-- 1. Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_type') THEN
        CREATE TYPE announcement_type AS ENUM ('Notice', 'Event', 'Exam Update', 'Holiday', 'Fee Reminder', 'General Announcement');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_audience') THEN
        CREATE TYPE target_audience AS ENUM ('All', 'Parents', 'Teachers', 'Specific Batch', 'Specific Course');
    END IF;
END$$;

-- 2. Update/Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type announcement_type DEFAULT 'General Announcement',
    target_audience target_audience DEFAULT 'All',
    course_id UUID REFERENCES courses(id),
    batch_id UUID REFERENCES batches(id),
    is_popup BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add RLS Policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for active announcements" 
ON announcements FOR SELECT 
USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

CREATE POLICY "Allow authenticated full access for admins" 
ON announcements FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM auth.users WHERE email LIKE '%@atomus.edu'))
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (SELECT id FROM auth.users WHERE email LIKE '%@atomus.edu'));

-- 4. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true) 
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies for 'announcements' bucket
-- Enable RLS on storage.objects (usually already enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to the posters
CREATE POLICY "Allow public read access to posters"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

-- Allow authenticated users (admins) to upload posters
CREATE POLICY "Allow authenticated upload access to posters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'announcements');

-- Allow authenticated users (admins) to update/delete posters
CREATE POLICY "Allow authenticated full access to posters"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'announcements')
WITH CHECK (bucket_id = 'announcements');
