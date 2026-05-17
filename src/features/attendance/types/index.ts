export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Leave"
  | "Unmarked";

/** Tap order on a circle: U → P → A → L → LV → U */
export const STATUS_CYCLE: AttendanceStatus[] = [
  "Unmarked",
  "Present",
  "Absent",
  "Late",
  "Leave",
];

export function cycleStatus(s: AttendanceStatus): AttendanceStatus {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export const STATUS_KEY: Record<string, AttendanceStatus> = {
  p: "Present", P: "Present",
  a: "Absent", A: "Absent",
  l: "Late", L: "Late",
  v: "Leave", V: "Leave",
  u: "Unmarked", U: "Unmarked",
  "0": "Unmarked",
};

export type Role = "admin" | "teacher" | null;

export interface CurrentUser {
  id: string;
  role: Role;
}

export interface TeacherProfile {
  id: string;
  full_name: string;
  campus_id: string | null;
  course_ids: string[];
  subject_ids: string[];
  batch_ids: string[];
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  campus_id: string | null;
  course_id: string | null;
  batch_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  attendance_date: string;
  period_number: number;
  period_label: string | null;
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
  period_number: number;
  period_label?: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
  marked_by?: string | null;
}

// ── Periods ──────────────────────────────────────────────────────
/**
 * Default per-day period count. Configurable later per campus/batch via a
 * schedule table; for now a static 1..N keeps the UI simple.
 */
export const DEFAULT_PERIOD_COUNT = 5;

export function defaultPeriods(count = DEFAULT_PERIOD_COUNT): Period[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    label: `Hour ${i + 1}`,
    short: `H${i + 1}`,
  }));
}

export interface Period {
  number: number;
  label: string;
  short: string;
}

// ── Date helpers ─────────────────────────────────────────────────
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isFutureDate(iso: string): boolean {
  if (!iso) return false;
  return iso > todayISO();
}

// ── Cell key helpers ─────────────────────────────────────────────
/** Stable key for (student, period) within a single grid session. */
export function cellKey(studentId: string, period: number): string {
  return `${studentId}|${period}`;
}

export function parseCellKey(key: string): { studentId: string; period: number } {
  const [studentId, p] = key.split("|");
  return { studentId, period: Number(p) };
}
