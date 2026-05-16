export type Gender = "Male" | "Female" | "Other";
export type AcademicStatus = "Active" | "Inactive" | "Graduated" | "Dropped";

export interface Student {
  id: string;
  full_name: string;
  roll_number: string;
  admission_number?: string | null;
  gender?: Gender | null;
  dob?: string | null;
  photo_url?: string | null;
  campus_id: string;
  course_id: string;
  batch_id: string;
  joining_date?: string | null;
  academic_status?: AcademicStatus | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  parent_id?: string | null;
  is_active?: boolean | null;
  attendance_percentage?: number | null;
  progress_status?: string | null;
  created_at: string;
}

export interface StudentWithRelations extends Student {
  campuses?: { id: string; name: string } | null;
  courses?: { id: string; name: string } | null;
  batches?: { id: string; name: string } | null;
  parents?: { id: string; full_name: string; phone_number: string; email: string } | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Unmarked";
  batch_id?: string;
}

export interface MarksRecord {
  id: string;
  student_id: string;
  exam_id: string;
  marks_obtained: number;
  total_marks?: number;
  remarks?: string | null;
  exams?: { name: string; exam_date: string; total_marks: number } | null;
}

export interface StudentFilters {
  search: string;
  campus_id: string;
  course_id: string;
  batch_id: string;
  gender: string;
  academic_status: string;
  status: "all" | "active" | "inactive";
}
