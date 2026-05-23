export type Gender = "Male" | "Female" | "Other";
export type AccountStatus = "Active" | "Pending" | "Disabled";

export interface NamedRef { id: string; name: string }

export interface Teacher {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  qualification: string | null;
  gender: Gender | null;
  profile_photo_url: string | null;
  profile_photo_drive_id: string | null;
  address: string | null;
  experience_years: number | null;
  account_status: AccountStatus;
  subject_specialization: string | null;
  campus_id: string | null;
  password_hash?: string | null;
  created_at: string;

  campuses?: NamedRef | null;
  teacher_courses?:  { courses: NamedRef | null }[];
  teacher_subjects?: { subjects: (NamedRef & { course_id?: string | null }) | null }[];
  teacher_batches?:  { batches: (NamedRef & { course_id?: string | null }) | null }[];
}

export interface TeacherCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface TeacherFilters {
  search: string;
  status: "all" | AccountStatus;
  campus_id: string;
  course_id: string;
  subject_id: string;
  batch_id: string;
}
