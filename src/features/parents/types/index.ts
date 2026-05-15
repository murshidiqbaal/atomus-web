export type AccountStatus = "Active" | "Pending" | "Disabled";

export interface LinkedStudent {
  id: string;
  full_name: string;
  roll_number: string;
  course_id?: string | null;
  batch_id?: string | null;
  attendance_percentage?: number | null;
  progress_status?: string | null;
  is_active?: boolean | null;
  courses?: { id: string; name: string } | null;
  batches?: { id: string; name: string } | null;
}

export interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  username: string | null;
  password_hash: string | null;
  account_status: AccountStatus;
  created_at: string;
  students?: LinkedStudent[];
}

export interface ParentFilters {
  search: string;
  status: "all" | AccountStatus;
}

export interface ParentCredentials {
  email: string;
  phone: string;
  password: string;
  parentName: string;
  studentName?: string;
}
