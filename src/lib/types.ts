export type AccountStatus = 'Active' | 'Pending' | 'Disabled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial' | 'Overdue';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export type ProgressStatus = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' | 'At Risk';
export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';
export type AnnouncementAudience = 'All' | 'Parents' | 'Teachers' | 'Students';

export interface Student {
  id: string;
  name: string;
  full_name?: string;
  admissionNumber: string;
  admission_number?: string;
  rollNumber: string;
  roll_number?: string;
  parentId?: string;
  parent_id?: string;
  courseId: string;
  course_id?: string;
  batchId: string;
  batch_id?: string;
  attendancePercentage: number;
  attendance_percentage?: number;
  progressStatus: ProgressStatus;
  progress_status?: ProgressStatus;
  createdAt: string;
  created_at?: string;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  linkedStudents: Student[];
  username: string;
  password?: string;
  status: AccountStatus;
  createdAt: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  subject_specialization: string;
  assigned_courses: string[];
  assigned_batches: string[];
  account_status: AccountStatus;
  created_at: string;
  auth_id?: string;
}

// ── Course Management ────────────────────────────────────────────
export type CourseType =
  | 'Regular'
  | 'Crash Course'
  | 'Foundation'
  | 'Revision Batch'
  | 'Entrance Coaching';

export type CourseMode = 'Offline' | 'Online' | 'Hybrid';

/** Stored as free TEXT in DB; app-level enum keeps inputs consistent. */
export type CourseClassLevel =
  | '8th Standard'
  | '9th Standard'
  | '10th Standard'
  | '+1 HSS'
  | '+2 HSS'
  | 'CBSE'
  | 'ICSE'
  | 'CEE';

export const COURSE_TYPES: readonly CourseType[] = [
  'Regular', 'Crash Course', 'Foundation', 'Revision Batch', 'Entrance Coaching',
];
export const COURSE_MODES: readonly CourseMode[] = ['Offline', 'Online', 'Hybrid'];
export const COURSE_CLASS_LEVELS: readonly CourseClassLevel[] = [
  '8th Standard', '9th Standard', '10th Standard',
  '+1 HSS', '+2 HSS', 'CBSE', 'ICSE', 'CEE',
];

export interface Campus {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  courseCount?: number;
  paymentQrUrl?: string | null;
  paymentQrDriveId?: string | null;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  // Legacy fields — kept so existing callers still compile.
  subjects: string[];
  batchCount: number;
  // Course-management fields (snake-case → camelCase mapping in repo)
  courseType: CourseType;
  classLevel: CourseClassLevel | string | null;
  durationMonths: number | null;
  feeAmount: number;
  mode: CourseMode;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt?: string;
  campuses?: Campus[];
  subjectCount?: number;
}

export interface Batch {
  id: string;
  courseId: string;
  campusId: string | null;
  name: string;
  timing: string | null;
  capacity: number | null;
  studentCount: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CampusCourseLink {
  id: string;
  campusId: string;
  courseId: string;
}

/** Filter shape consumed by courseRepository.getCourses(filters?). */
export interface CourseFilters {
  search?: string;
  campusId?: string;
  courseType?: CourseType;
  mode?: CourseMode;
  classLevel?: string;
  isActive?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  batchId: string;
  date: string;
  status: AttendanceStatus;
}

export interface Exam {
  id: string;
  courseId: string;
  batchId: string;
  name: string;
  date: string;
  subject?: string;
  totalMarks?: number;
}

export interface MarkRecord {
  id: string;
  examId: string;
  studentId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  remarks?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  dueDate: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  is_published: boolean;
  scheduled_at?: string;
  published_at?: string;
  created_by?: string;
  created_at: string;
}

export interface AuthCredentials {
  email: string;
  password?: string;
}

export interface AppDownload {
  platform: 'android' | 'ios';
  download_url: string;
  version: string;
  min_os: string;
  file_size: string | null;
  is_active: boolean;
  drive_file_id: string | null;
  updated_at: string;
}
