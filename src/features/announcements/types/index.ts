export type AnnouncementType = 'Notice' | 'Event' | 'Exam Update' | 'Holiday' | 'Fee Reminder' | 'General Announcement';
export type TargetAudience = 'All' | 'Parents' | 'Teachers' | 'Specific Batch' | 'Specific Course';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: AnnouncementType;
  target_audience: TargetAudience;
  course_id?: string | null;
  batch_id?: string | null;
  is_popup: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_by?: string;
  created_at: string;
}

export interface AnnouncementStats {
  total: number;
  active: number;
  popup: number;
  scheduled: number;
}
