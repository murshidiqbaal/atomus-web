-- ============================================================
-- ATOMUS.edu — Teacher Attendance (Punch In / Punch Out)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id uuid not null default gen_random_uuid (),
  teacher_id uuid not null,
  campus_id uuid null,
  subject_id uuid null,
  course_id uuid null,
  batch_id uuid null,
  attendance_date date not null default CURRENT_DATE,
  start_time timestamp with time zone null,
  end_time timestamp with time zone null,
  total_duration_minutes integer GENERATED ALWAYS as (
    case
      when (
        (end_time is not null)
        and (start_time is not null)
      ) then (
        (
          EXTRACT(
            epoch
            from
              (end_time - start_time)
          )
        )::integer / 60
      )
      else null::integer
    end
  ) STORED null,
  latitude double precision null,
  longitude double precision null,
  attendance_status text not null default 'Active'::text,
  created_at timestamp with time zone null default now(),
  constraint teacher_attendance_pkey primary key (id),
  constraint teacher_attendance_teacher_day_unique unique (teacher_id, attendance_date),
  constraint teacher_attendance_campus_id_fkey foreign KEY (campus_id) references campuses (id),
  constraint teacher_attendance_course_id_fkey foreign KEY (course_id) references courses (id),
  constraint teacher_attendance_subject_id_fkey foreign KEY (subject_id) references subjects (id),
  constraint teacher_attendance_teacher_id_fkey foreign KEY (teacher_id) references teachers (id) on delete CASCADE,
  constraint teacher_attendance_batch_id_fkey foreign KEY (batch_id) references batches (id),
  constraint teacher_attendance_attendance_status_check check (
    (
      attendance_status = any (
        array['Active'::text, 'Completed'::text, 'Missed'::text]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_teacher_att_teacher on public.teacher_attendance using btree (teacher_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_teacher_att_date on public.teacher_attendance using btree (attendance_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_teacher_att_status on public.teacher_attendance using btree (attendance_status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_teacher_att_campus on public.teacher_attendance using btree (campus_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "Admins select teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Admins select teacher_attendance" ON public.teacher_attendance
  FOR SELECT TO authenticated
  USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'teacher'
    ) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "Teachers select own teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Teachers select own teacher_attendance" ON public.teacher_attendance
  FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- INSERT policies
DROP POLICY IF EXISTS "Admins insert teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Admins insert teacher_attendance" ON public.teacher_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'teacher'
    ) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "Teachers insert own teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Teachers insert own teacher_attendance" ON public.teacher_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

-- UPDATE policies
DROP POLICY IF EXISTS "Admins update teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Admins update teacher_attendance" ON public.teacher_attendance
  FOR UPDATE TO authenticated
  USING (
    COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
      'teacher'
    ) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "Teachers update own teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Teachers update own teacher_attendance" ON public.teacher_attendance
  FOR UPDATE TO authenticated
  USING (
    teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );
