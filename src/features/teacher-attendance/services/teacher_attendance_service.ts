import { supabase } from "@/lib/supabase";
import type {
  AdminAttendanceOverride, ActiveSessionModel, GpsStatus, NamedRef,
  TeacherAttendanceDTO, TeacherAttendanceFilters,
} from "../types";

const FULL_SELECT = `
  *,
  teacher:teachers(id, full_name, email, profile_photo_url),
  campus:campuses(id, name),
  course:courses(id, name),
  subject:subjects(id, name)
`;

/** Lightweight projection used by the active-sessions poller. */
const ACTIVE_SELECT = `
  id,
  teacher_id,
  campus_id,
  course_id,
  subject_id,
  attendance_date,
  start_time,
  end_time,
  total_duration_minutes,
  latitude,
  longitude,
  attendance_status,
  teacher:teachers(id, full_name, profile_photo_url),
  campus:campuses(id, name),
  course:courses(id, name),
  subject:subjects(id, name)
`;

function gpsFor(lat: number | null, lon: number | null): GpsStatus {
  if (lat == null && lon == null) return "Unknown";
  if (lat == null || lon == null) return "Unknown";
  // No campus geofence radius exists in schema yet; presence of both coords
  // is treated as verified. The model leaves room for radius checks once
  // campuses gain lat/lon/radius columns.
  return "Verified";
}

function normaliseActive(row: TeacherAttendanceDTO): ActiveSessionModel {
  const startedAt = row.start_time ?? row.created_at;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher?.full_name ?? "Unknown teacher",
    teacherPhoto: row.teacher?.profile_photo_url ?? null,
    campusId: row.campus_id,
    campusName: row.campus?.name ?? "—",
    courseId: row.course_id,
    courseName: row.course?.name ?? "—",
    subjectId: row.subject_id,
    subjectName: row.subject?.name ?? "—",
    startedAt,
    startedAtEpochMs: new Date(startedAt).getTime(),
    gps: gpsFor(row.latitude, row.longitude),
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.attendance_status,
  };
}

function applyFilters(
  q: ReturnType<typeof supabase.from> extends infer _ ? any : any, // eslint-disable-line @typescript-eslint/no-explicit-any
  f: TeacherAttendanceFilters,
) {
  if (f.campus_id) q = q.eq("campus_id", f.campus_id);
  if (f.course_id) q = q.eq("course_id", f.course_id);
  if (f.subject_id) q = q.eq("subject_id", f.subject_id);
  if (f.teacher_id) q = q.eq("teacher_id", f.teacher_id);
  if (f.status) q = q.eq("attendance_status", f.status);
  if (f.date_from) q = q.gte("attendance_date", f.date_from);
  if (f.date_to) q = q.lte("attendance_date", f.date_to);
  return q;
}

export const teacherAttendanceService = {
  /**
   * Active sessions — small payload, polled every ~20s by the admin dashboard.
   * Filters apply so admins can scope the live board to a campus/subject/etc.
   */
  async listActiveSessions(filters: TeacherAttendanceFilters): Promise<ActiveSessionModel[]> {
    let q = supabase
      .from("teacher_attendance")
      .select(ACTIVE_SELECT)
      .eq("attendance_status", "Active")
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(200);
    q = applyFilters(q, { ...filters, status: "" });
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => normaliseActive(r as unknown as TeacherAttendanceDTO));
  },

  /** Filtered history rows for the table + timeline + per-row drilldowns. */
  async listAttendance(filters: TeacherAttendanceFilters): Promise<TeacherAttendanceDTO[]> {
    let q = supabase
      .from("teacher_attendance")
      .select(FULL_SELECT)
      .order("attendance_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(1000);

    q = applyFilters(q, filters);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as unknown as TeacherAttendanceDTO[];
    if (filters.search.trim()) {
      const needle = filters.search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const t = (r.teacher?.full_name ?? "").toLowerCase();
        const s = (r.subject?.name ?? "").toLowerCase();
        const c = (r.course?.name ?? "").toLowerCase();
        const cp = (r.campus?.name ?? "").toLowerCase();
        return t.includes(needle) || s.includes(needle) || c.includes(needle) || cp.includes(needle);
      });
    }
    return rows;
  },

  /** Wide window used by analytics — last 60 days, no search. */
  async listForAnalytics(): Promise<TeacherAttendanceDTO[]> {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 60);
    const { data, error } = await supabase
      .from("teacher_attendance")
      .select(FULL_SELECT)
      .gte("attendance_date", from.toISOString().slice(0, 10))
      .order("attendance_date", { ascending: true })
      .limit(5000);
    if (error) throw error;
    return (data ?? []) as unknown as TeacherAttendanceDTO[];
  },

  /** Single session detail (used by the details modal). */
  async getSession(id: string): Promise<TeacherAttendanceDTO> {
    const { data, error } = await supabase
      .from("teacher_attendance")
      .select(FULL_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as TeacherAttendanceDTO;
  },

  /**
   * Manually close an active session. Stamps end_time = now() and computes
   * duration in minutes from start_time → end_time. Status moves to Completed.
   */
  async closeSession(id: string): Promise<TeacherAttendanceDTO> {
    const endIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("teacher_attendance")
      .update({
        attendance_status: "Completed",
        end_time: endIso,
      })
      .eq("id", id)
      .select(FULL_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as TeacherAttendanceDTO;
  },

  /** Generic admin override (mark missed, force complete, etc.). */
  async overrideSession(id: string, patch: AdminAttendanceOverride): Promise<TeacherAttendanceDTO> {
    const row: Record<string, unknown> = {};
    if (patch.attendance_status !== undefined) row.attendance_status = patch.attendance_status;
    if (patch.end_time !== undefined) row.end_time = patch.end_time;
    const { data, error } = await supabase
      .from("teacher_attendance")
      .update(row)
      .eq("id", id)
      .select(FULL_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as TeacherAttendanceDTO;
  },

  // ── lookups ────────────────────────────────────────────────────
  async listCampuses(): Promise<NamedRef[]> {
    const { data, error } = await supabase
      .from("campuses").select("id, name").order("name");
    if (error) throw error;
    return (data ?? []) as NamedRef[];
  },

  async listCourses(): Promise<NamedRef[]> {
    const { data, error } = await supabase
      .from("courses").select("id, name").order("name");
    if (error) throw error;
    return (data ?? []) as NamedRef[];
  },

  async listSubjects(): Promise<NamedRef[]> {
    const { data, error } = await supabase
      .from("subjects").select("id, name").order("name");
    if (error) throw error;
    return (data ?? []) as NamedRef[];
  },

  async listTeachers(): Promise<{ id: string; full_name: string; profile_photo_url: string | null }[]> {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, profile_photo_url")
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as { id: string; full_name: string; profile_photo_url: string | null }[];
  },
};
