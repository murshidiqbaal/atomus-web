export type AccountStatus = 'Active' | 'Pending' | 'Disabled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export type ProgressStatus = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' | 'At Risk';

export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  parentId?: string;
  courseId: string;
  batchId: string;
  attendancePercentage: number;
  progressStatus: ProgressStatus;
  createdAt: string;
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

export interface AuthCredentials {
  email: string;
  password?: string;
}
