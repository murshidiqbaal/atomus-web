export type SubjectType = "Core" | "Theory" | "Practical" | "Language";
export type ClassLevel = "8" | "9" | "10" | "+1" | "+2";

export interface Subject {
  id: string;
  course_id: string;
  name: string;
  subject_code: string;
  class_level: ClassLevel;
  subject_type: SubjectType;
  is_active: boolean;
  created_at: string;
  courses?: { name: string } | null;
}

export interface SubjectFilters {
  search: string;
  course_id: string;
  class_level: string;
  subject_type: string;
  status: "all" | "active" | "inactive";
}
