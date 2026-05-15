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

export interface Course {
  id: string;
  name: string;
  description: string;
  subjects: string[];
  durationMonths: number;
  batchCount: number;
}

export interface Batch {
  id: string;
  courseId: string;
  name: string;
  timing: string;
  studentCount: number;
  isActive: boolean;
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
