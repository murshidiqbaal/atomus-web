import { supabase } from "@/lib/supabase";
import {
  AttendanceRecord,
  AttendanceUpsertRow,
  CurrentUser,
  StudentLite,
  TeacherProfile,
  isFutureDate,
} from "../types";

type IdName = { id: string; name: string };

// Small auth-id cache so a 30-student bulk save doesn't fire 30 getUser calls.
let cachedUserId: { id: string | null; ts: number } | null = null;

async function resolveUserId(): Promise<string | null> {
  if (cachedUserId && Date.now() - cachedUserId.ts < 30_000) return cachedUserId.id;
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id ?? null;
  cachedUserId = { id, ts: Date.now() };
  return id;
}

export const attendanceService = {
  // ── Identity ─────────────────────────────────────────────────────
  async getCurrentUser(): Promise<CurrentUser | null> {
    const { data } = await supabase.auth.getUser();
    const u = data?.user;
    if (!u) return null;
    const role = (u.user_metadata?.role as "admin" | "teacher" | undefined) ?? null;
    return { id: u.id, role };
  },

  async getTeacherProfile(authId: string): Promise<TeacherProfile | null> {
    const { data: teacher, error } = await supabase
      .from("teachers")
      .select("id, full_name, campus_id")
      .eq("auth_id", authId)
      .maybeSingle();
    if (error) throw error;
    if (!teacher) return null;

    const [courses, subjects, batches] = await Promise.all([
      supabase.from("teacher_courses").select("course_id").eq("teacher_id", teacher.id),
      supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", teacher.id),
      supabase.from("teacher_batches").select("batch_id").eq("teacher_id", teacher.id),
    ]);
    if (courses.error) throw courses.error;
    if (subjects.error) throw subjects.error;
    if (batches.error) throw batches.error;

    return {
      id: teacher.id,
      full_name: teacher.full_name,
      campus_id: teacher.campus_id ?? null,
      course_ids: (courses.data ?? []).map((r) => r.course_id as string),
      subject_ids: (subjects.data ?? []).map((r) => r.subject_id as string),
      batch_ids: (batches.data ?? []).map((r) => r.batch_id as string),
    };
  },

  // ── Lookups for the filter chain ─────────────────────────────────
  async listCampuses(restrictTo?: string | null): Promise<IdName[]> {
    let q = supabase
      .from("campuses")
      .select("id, name")
      .eq("is_active", true);
    if (restrictTo) q = q.eq("id", restrictTo);
    const { data, error } = await q.order("name");
    if (error) throw error;
    return (data ?? []) as IdName[];
  },

  async listCoursesByCampus(
    campus_id: string,
    restrictTo?: string[] | null,
  ): Promise<IdName[]> {
    let q = supabase
      .from("campus_courses")
      .select("courses!inner(id, name, is_active)")
      .eq("campus_id", campus_id)
      .eq("courses.is_active", true);
    if (restrictTo) {
      if (restrictTo.length === 0) return [];
      q = q.in("course_id", restrictTo);
    }
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as unknown as { courses: IdName | null }[];
    return rows
      .map((r) => r.courses)
      .filter((c): c is IdName => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async listBatchesByCourseAndCampus(
    course_id: string,
    campus_id: string,
    restrictTo?: string[] | null,
  ): Promise<IdName[]> {
    let q = supabase
      .from("batches")
      .select("id, name")
      .eq("course_id", course_id)
      .eq("campus_id", campus_id);
    if (restrictTo) {
      if (restrictTo.length === 0) return [];
      q = q.in("id", restrictTo);
    }
    const { data, error } = await q.order("name");
    if (error) throw error;
    return (data ?? []) as IdName[];
  },

  async listSubjectsByCourse(
    course_id: string,
    restrictTo?: string[] | null,
  ): Promise<IdName[]> {
    let q = supabase
      .from("subjects")
      .select("id, name")
      .eq("course_id", course_id)
      .eq("is_active", true);
    if (restrictTo) {
      if (restrictTo.length === 0) return [];
      q = q.in("id", restrictTo);
    }
    const { data, error } = await q.order("name");
    if (error) throw error;
    return (data ?? []) as IdName[];
  },

  async listStudents(filters: {
    campus_id?: string;
    course_id?: string;
    batch_id?: string;
  }): Promise<StudentLite[]> {
    let q = supabase
      .from("students")
      .select("id, full_name, roll_number, batch_id, campus_id, course_id");

    if (filters.batch_id) {
      q = q.eq("batch_id", filters.batch_id);
    } else if (filters.course_id) {
      q = q.eq("course_id", filters.course_id);
    } else if (filters.campus_id) {
      q = q.eq("campus_id", filters.campus_id);
    }

    q = q
      .order("roll_number", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as StudentLite[];
  },

  // ── Attendance read ─────────────────────────────────────────────
  /**
   * Fetch every period's attendance for the (batch, date, subject?) slice.
   * Returned rows include period_number so callers can index by
   * (student_id, period_number) for the per-period grid.
   */
  async listAttendance(args: {
    campus_id?: string;
    course_id?: string;
    batch_id?: string;
    attendance_date: string;
    subject_id: string | null;
  }): Promise<AttendanceRecord[]> {
    let q = supabase
      .from("attendance")
      .select("*")
      .eq("attendance_date", args.attendance_date);

    if (args.batch_id) {
      q = q.eq("batch_id", args.batch_id);
    } else if (args.course_id) {
      q = q.eq("course_id", args.course_id);
    } else if (args.campus_id) {
      q = q.eq("campus_id", args.campus_id);
    }

    q = args.subject_id ? q.eq("subject_id", args.subject_id) : q.is("subject_id", null);
    const { data, error } = await q.order("period_number");
    if (error) throw error;
    return (data ?? []) as AttendanceRecord[];
  },

  // ── Attendance write ────────────────────────────────────────────
  /**
   * Save a mixed batch of (student, subject, date, period) cells.
   *
   * Internally groups by period_number → for each group, reads existing rows
   * scoped to (date, period, subject) and splits into bulk UPDATE + bulk
   * INSERT. Two queries per period — total bounded by `periods × 2`,
   * regardless of student count.
   *
   * The DB's `(student, COALESCE(subject, sentinel), date, period)` unique
   * index protects against races even if two clients save simultaneously.
   */
  async upsertAttendance(rows: AttendanceUpsertRow[]): Promise<void> {
    if (!rows.length) return;

    // Future-date guard — single check up front since all rows share a date.
    if (isFutureDate(rows[0].attendance_date)) {
      throw new Error("Future attendance cannot be marked.");
    }

    const userId = await resolveUserId();
    const stamped: AttendanceUpsertRow[] = rows.map((r) => ({
      ...r,
      marked_by: r.marked_by ?? userId ?? null,
    }));

    // Group by period_number so each upsert call operates on a homogeneous
    // (date, subject, period) slice. That keeps the read filter cheap and
    // the conflict resolution unambiguous.
    const byPeriod = new Map<number, AttendanceUpsertRow[]>();
    for (const r of stamped) {
      const k = r.period_number;
      const arr = byPeriod.get(k);
      if (arr) arr.push(r);
      else byPeriod.set(k, [r]);
    }

    for (const group of byPeriod.values()) {
      await upsertPeriodGroup(group);
    }
  },
};

async function upsertPeriodGroup(rows: AttendanceUpsertRow[]): Promise<void> {
  if (!rows.length) return;
  const sample = rows[0];

  let read = supabase
    .from("attendance")
    .select("id, student_id")
    .eq("attendance_date", sample.attendance_date)
    .eq("period_number", sample.period_number)
    .in("student_id", rows.map((r) => r.student_id));
  read = sample.subject_id
    ? read.eq("subject_id", sample.subject_id)
    : read.is("subject_id", null);
  if (sample.batch_id) read = read.eq("batch_id", sample.batch_id);

  const { data: existing, error: readErr } = await read;
  if (readErr) throw readErr;

  const idByStudent = new Map<string, string>();
  for (const r of (existing ?? []) as { id: string; student_id: string }[]) {
    idByStudent.set(r.student_id, r.id);
  }

  const updates: (AttendanceUpsertRow & { id: string })[] = [];
  const inserts: AttendanceUpsertRow[] = [];
  for (const r of rows) {
    const id = idByStudent.get(r.student_id);
    if (id) updates.push({ id, ...r });
    else inserts.push(r);
  }

  if (updates.length) {
    const { error } = await supabase.from("attendance").upsert(updates);
    if (error) throw error;
  }
  if (inserts.length) {
    const { error } = await supabase.from("attendance").insert(inserts);
    if (error) throw error;
  }
}
