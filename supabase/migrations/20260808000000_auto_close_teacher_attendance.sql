-- ============================================================
-- ATOMUS.edu — Auto-Close Teacher Attendance after 4 Hours
-- ============================================================

-- Function to automatically close teacher attendance sessions running longer than 4 hours
CREATE OR REPLACE FUNCTION public.auto_close_expired_teacher_attendance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  closed_count integer;
BEGIN
  -- Update active attendance records older than 4 hours (240 minutes)
  -- end_time is capped at start_time + 4 hours
  WITH expired AS (
    SELECT id, start_time, created_at
    FROM public.teacher_attendance
    WHERE attendance_status = 'Active'
      AND (
        (start_time IS NOT NULL AND start_time < NOW() - INTERVAL '4 hours')
        OR (start_time IS NULL AND created_at < NOW() - INTERVAL '4 hours')
      )
  )
  UPDATE public.teacher_attendance t
  SET 
    attendance_status = 'Completed',
    end_time = COALESCE(t.start_time, t.created_at) + INTERVAL '4 hours'
  FROM expired e
  WHERE t.id = e.id;

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

COMMENT ON FUNCTION public.auto_close_expired_teacher_attendance() IS 'Auto-closes teacher attendance sessions running longer than 4 hours, capping end_time to start_time + 4h.';
