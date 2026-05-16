import { supabase } from "@/lib/supabase";

export interface Subject {
  id: string;
  courseId: string | null;
  name: string;
  subjectCode: string | null;
  classLevel: string | null;
  subjectType: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SubjectInput {
  courseId: string;
  name: string;
  subjectCode?: string | null;
  classLevel?: string | null;
  subjectType?: string | null;
  isActive?: boolean;
}

function mapRow(row: Record<string, unknown>): Subject {
  return {
    id: row.id as string,
    courseId: (row.course_id as string) ?? null,
    name: row.name as string,
    subjectCode: (row.subject_code as string) ?? null,
    classLevel: (row.class_level as string) ?? null,
    subjectType: (row.subject_type as string) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}

export const subjectsService = {
  async listByCourse(courseId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("course_id", courseId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(input: SubjectInput): Promise<Subject> {
    const { data, error } = await supabase
      .from("subjects")
      .insert([{
        course_id: input.courseId,
        name: input.name.trim(),
        subject_code: input.subjectCode?.trim() || null,
        class_level: input.classLevel?.trim() || null,
        subject_type: input.subjectType || "Core",
        is_active: input.isActive ?? true,
      }])
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id: string, patch: Partial<SubjectInput>): Promise<Subject> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined)         row.name = patch.name.trim();
    if (patch.subjectCode !== undefined)  row.subject_code = patch.subjectCode?.trim() || null;
    if (patch.classLevel !== undefined)   row.class_level = patch.classLevel?.trim() || null;
    if (patch.subjectType !== undefined)  row.subject_type = patch.subjectType;
    if (patch.isActive !== undefined)     row.is_active = patch.isActive;
    const { data, error } = await supabase
      .from("subjects")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },
};
