export interface DailyStudentReport {
  id: string;
  daily_report_id: string;
  student_id: string;
  status: 'normal' | 'need_improvement' | string;
  comment: string | null;
  behavior_rating: string | null;
  study_engagement: string | null;
  homework_status: string | null;
  created_at: string;
  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    roll_number: string | null;
    course_id?: string | null;
    batch_id?: string | null;
  } | null;
  daily_class_reports?: {
    id: string;
    report_date: string;
    session_type: 'forenoon' | 'afternoon' | string;
    topics_covered: string;
    homework: string | null;
    general_remarks: string | null;
    teacher_id: string | null;
    course_id: string;
    batch_id: string | null;
    subject_id: string | null;
    teachers?: {
      id: string;
      full_name: string;
      email?: string | null;
    } | null;
    courses?: {
      id: string;
      name: string;
    } | null;
    batches?: {
      id: string;
      name: string;
    } | null;
    subjects?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface FeedbackFilters {
  search: string;
  status: string; // 'All' | 'normal' | 'need_improvement'
  behaviorRating: string; // 'All' | 'Needs Imp.' | 'Good' | 'Excellent' | etc.
  studyEngagement: string; // 'All' | 'Active' | 'Passive' | etc.
  homeworkStatus: string; // 'All' | 'Completed' | 'Incomplete' | etc.
  courseId: string;
  startDate: string;
  endDate: string;
}

export interface FeedbackStats {
  total: number;
  needImprovement: number;
  normal: number;
  highEngagement: number;
  homeworkCompleted: number;
}
