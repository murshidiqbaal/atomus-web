export type ExamScope = "batch" | "course";

export type Grade =
  | "Excellent"
  | "Good"
  | "Average"
  | "Needs Improvement";

export type CreatorRole = "admin" | "teacher";

export interface Exam {
  id: string;
  name: string;
  course_id: string;
  batch_id: string | null;
  exam_scope: ExamScope;
  exam_date: string | null;
  total_marks: number;
  /**
   * Recurring/daily exams: one exam row, many per-day mark rows distinguished
   * by `marks.mark_date`. For non-daily exams this stays false and marks are
   * keyed by (exam_id, student_id, subject_id) only.
   */
  is_daily: boolean;
  created_at: string;
  created_by: string | null;
  creator_name: string | null;
  creator_role: CreatorRole | null;
  courses?: { name: string } | null;
  batches?: { name: string } | null;
}

export interface ExamSummaryRow {
  exam_id: string;
  marks_count: number;
  student_count: number;
  avg_pct: number | null;
  top_pct: number | null;
  low_pct: number | null;
  pass_pct: number | null;
}

export interface ExamDirectoryRow extends Exam {
  stats: ExamSummaryRow | null;
}

export interface ExamCreator {
  id: string;
  name: string;
  role: CreatorRole;
  exam_count: number;
}

export interface ExamsDirectoryFilters {
  course_id?: string;
  batch_id?: string;
  creator_role?: CreatorRole | "";
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  course_id: string;
  name: string;
}

export interface Subject {
  id: string;
  course_id: string;
  name: string;
  subject_code?: string | null;
}

export interface StudentLite {
  id: string;
  full_name: string;
  roll_number: string | null;
  batch_id: string | null;
  course_id: string | null;
  batches?: { name: string } | null;
}

export interface Mark {
  id?: string;
  exam_id: string;
  student_id: string;
  subject_id: string | null;
  /** YYYY-MM-DD — set only for daily-exam mark rows; null for one-shot exams. */
  mark_date: string | null;
  marks_obtained: number;
  total_marks: number;
  percentage?: number;
  remarks: string | null;
  created_at?: string;
}

export interface MarkEntry {
  id?: string;
  marks_obtained: number;
  total_marks: number;
  remarks: string;
  dirty?: boolean;
}

export type MarksMap = Record<string, MarkEntry>;

export interface DashboardStats {
  totalExams: number;
  activeCourses: number;
  studentsEvaluated: number;
  avgPerformance: number;
  topBatch: { id: string; name: string; avg: number } | null;
}

export interface ExamPerformancePoint {
  examId: string;
  name: string;
  date: string | null;
  avg: number;
  top: number;
  studentCount: number;
}

export interface SubjectAvg {
  subjectId: string;
  name: string;
  avg: number;
  examCount: number;
}

export interface BatchAvg {
  batchId: string;
  name: string;
  avg: number;
  studentCount: number;
}

export interface TopperRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  batchName: string | null;
  percentage: number;
  marksObtained: number;
  totalMarks: number;
}

export interface AnalyticsFilters {
  course_id: string;
  batch_id: string;
  exam_id: string;
  subject_id: string;
  date_from?: string;
  date_to?: string;
}
