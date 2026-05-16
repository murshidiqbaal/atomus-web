import { supabase } from "@/lib/supabase";
import {
  AttendanceRecord, AttendanceUpsertRow, StudentLite,
} from "../types";

export const attendanceService = {
  // ── Lookups for the filter chain ─────────────────────────────────
  async listCampuses(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as { id: string; name: string }[];
  },

  async listCoursesByCampus(campus_id: string): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("campus_courses")
      .select("courses!inner(id, name, is_active)")
      .eq("campus_id", campus_id)
      .eq("courses.is_active", true);
    if (error) throw error;
    const rows = (data ?? []) as unknown as { courses: { id: string; name: string } | null }[];
    return rows
      .map((r) => r.courses)
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name)) as { id: string; name: string }[];
  },

  async listBatchesByCourseAndCampus(
    course_id: string, campus_id: string,
  ): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("batches")
      .select("id, name")
      .eq("course_id", course_id)
      .eq("campus_id", campus_id)
      .order("name");
    if (error) throw error;
    return (data ?? []) as { id: string; name: string }[];
  },

  async listSubjectsByCourse(course_id: string): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("course_id", course_id)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as { id: string; name: string }[];
  },

  async listStudents(filters: { campus_id?: string; course_id?: string; batch_id?: string }): Promise<StudentLite[]> {
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

    q = q.order("roll_number", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as StudentLite[];
  },

  // ── Attendance read/write ───────────────────────────────────────
  /**
   * Fetch attendance rows for a (batch, date, subject?) tuple.
   * Subject is optional — `null` matches the legacy "no subject" bucket.
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
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AttendanceRecord[];
  },

  /**
   * Upsert attendance for a homogeneous batch (same batch+date+subject).
   * Looks up existing rows by (batch, date, subject) → maps them to ids
   * → splits into one bulk insert + one bulk update. Two queries total,
   * regardless of how many students.
   */
  async upsertAttendance(rows: AttendanceUpsertRow[]): Promise<void> {
    if (!rows.length) return;
    const sample = rows[0];

    let read = supabase
      .from("attendance")
      .select("id, student_id")
      .eq("attendance_date", sample.attendance_date)
      .in("student_id", rows.map((r) => r.student_id));
    read = sample.subject_id
      ? read.eq("subject_id", sample.subject_id)
      : read.is("subject_id", null);

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
      // .upsert() with default onConflict=id will fan-out to one UPDATE per id
      // server-side but a single round-trip from the client.
      const { error } = await supabase.from("attendance").upsert(updates);
      if (error) throw error;
    }
    if (inserts.length) {
      const { error } = await supabase.from("attendance").insert(inserts);
      if (error) throw error;
    }
  },
};
