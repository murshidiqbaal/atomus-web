export type ExamScope = "batch" | "course";

export type Grade =
  | "Excellent"
  | "Good"
  | "Average"
  | "Needs Improvement";

export interface Exam {
  id: string;
  name: string;
  course_id: string;
  batch_id: string | null;
  exam_scope: ExamScope;
  exam_date: string | null;
  total_marks: number;
  created_at: string;
  courses?: { name: string } | null;
  batches?: { name: string } | null;
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
