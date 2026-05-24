export type AttendanceStatus = "Active" | "Completed" | "Missed";

export type TeacherStatusBadge = AttendanceStatus | "Offline";

export type GpsStatus = "Verified" | "Outside" | "Unknown";

export interface NamedRef {
  id: string;
  name: string;
}

/** Raw row of `teacher_attendance` joined with related lookups. */
export interface TeacherAttendanceDTO {
  id: string;
  teacher_id: string | null;
  campus_id: string | null;
  course_id: string | null;
  subject_id: string | null;
  attendance_date: string;            // YYYY-MM-DD
  start_time: string | null;          // ISO timestamptz
  end_time: string | null;            // ISO timestamptz
  total_duration_minutes: number | null;
  latitude: number | null;
  longitude: number | null;
  attendance_status: AttendanceStatus;
  created_at: string;

  // joined lookups
  teacher?: {
    id: string;
    full_name: string;
    email: string | null;
    profile_photo_url: string | null;
  } | null;
  campus?: NamedRef | null;
  course?: NamedRef | null;
  subject?: NamedRef | null;
}

/** A currently-running session, normalised for the live monitor. */
export interface ActiveSessionModel {
  id: string;
  teacherId: string | null;
  teacherName: string;
  teacherPhoto: string | null;
  campusId: string | null;
  campusName: string;
  courseId: string | null;
  courseName: string;
  subjectId: string | null;
  subjectName: string;
  startedAt: string;                  // ISO
  startedAtEpochMs: number;
  gps: GpsStatus;
  latitude: number | null;
  longitude: number | null;
  status: AttendanceStatus;
}

export interface TeacherAttendanceFilters {
  search: string;
  campus_id: string;
  course_id: string;
  subject_id: string;
  teacher_id: string;
  status: AttendanceStatus | "";
  date_from: string;                  // YYYY-MM-DD
  date_to: string;                    // YYYY-MM-DD
}

export const EMPTY_FILTERS: TeacherAttendanceFilters = {
  search: "",
  campus_id: "",
  course_id: "",
  subject_id: "",
  teacher_id: "",
  status: "",
  date_from: "",
  date_to: "",
};

export type RangePreset = "today" | "week" | "month" | "all";

/** Per-teacher rollup used by the performance cards. */
export interface TeacherPerformanceRow {
  teacher_id: string;
  teacher_name: string;
  teacher_photo: string | null;
  campus_name: string;
  total_sessions: number;
  completed_sessions: number;
  missed_sessions: number;
  active_sessions: number;
  total_minutes: number;
  avg_minutes_per_session: number;
  avg_daily_hours: number;
  consistency_pct: number;           // completed / (completed + missed)
  late_punch_in_count: number;       // sessions starting after 09:30 local
  punctual_pct: number;
}

/** Snapshot used by the analytics dashboard. */
export interface TeacherAttendanceAnalytics {
  totalSessions: number;
  activeNow: number;
  completed: number;
  missed: number;
  avgDurationMinutes: number;
  completionPct: number;
  trend: { date: string; sessions: number; completed: number; missed: number; minutes: number }[];
  byCampus: { campus_id: string; campus_name: string; sessions: number; minutes: number; completion_pct: number }[];
  bySubject: { subject_id: string; subject_name: string; sessions: number; minutes: number }[];
  punctualityTop: { teacher_id: string; teacher_name: string; punctual_pct: number; total: number }[];
}

/** Alert items shown in the warnings panel. */
export type AttendanceAlertKind =
  | "missing_punch_out"
  | "short_session"
  | "missed_class"
  | "no_gps";

export interface AttendanceAlert {
  id: string;
  kind: AttendanceAlertKind;
  teacher_name: string;
  detail: string;
  occurred_at: string;
  session_id: string;
}

/**
 * Patch shape for admin overrides. The live schema doesn't include a notes
 * column, so we limit overrides to fields that physically exist on
 * teacher_attendance.
 */
export interface AdminAttendanceOverride {
  attendance_status?: AttendanceStatus;
  end_time?: string | null;
}
