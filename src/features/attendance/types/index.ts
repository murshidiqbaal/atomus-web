export type AttendanceStatus = "Present" | "Absent" | "Late" | "Unmarked";

export const STATUS_CYCLE: AttendanceStatus[] = [
  "Unmarked", "Present", "Absent", "Late",
];

export const STATUS_KEY: Record<string, AttendanceStatus> = {
  p: "Present", P: "Present",
  a: "Absent", A: "Absent",
  l: "Late", L: "Late",
  u: "Unmarked", U: "Unmarked",
  "0": "Unmarked",
};

export interface AttendanceRecord {
  id: string;
  student_id: string;
  campus_id: string | null;
  course_id: string | null;
  batch_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AttendanceFilters {
  campus_id: string;
  course_id: string;
  batch_id: string;
  subject_id: string;          // empty string = "Overall" (no subject)
  attendance_date: string;     // YYYY-MM-DD
}

export interface StudentLite {
  id: string;
  full_name: string;
  roll_number: string | null;
  batch_id: string | null;
  campus_id: string | null;
  course_id: string | null;
}

export interface AttendanceUpsertRow {
  student_id: string;
  campus_id: string | null;
  course_id: string | null;
  batch_id: string | null;
  subject_id: string | null;
  teacher_id?: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks?: string | null;
}
