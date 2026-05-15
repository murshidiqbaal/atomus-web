import { supabase } from "@/lib/supabase";
import { Subject } from "../types";
import { SubjectFormValues } from "../schemas";

export const subjectService = {
  async getAll(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from("subjects")
      .select("*, courses(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Subject[];
  },

  async create(payload: SubjectFormValues): Promise<Subject> {
    const { data, error } = await supabase
      .from("subjects")
      .insert([{ ...payload, subject_code: payload.subject_code.toUpperCase() }])
      .select("*, courses(name)")
      .single();
    if (error) throw error;
    return data as Subject;
  },

  async update(id: string, payload: SubjectFormValues): Promise<Subject> {
    const { data, error } = await supabase
      .from("subjects")
      .update({ ...payload, subject_code: payload.subject_code.toUpperCase() })
      .eq("id", id)
      .select("*, courses(name)")
      .single();
    if (error) throw error;
    return data as Subject;
  },

  async toggleActive(id: string, is_active: boolean): Promise<Subject> {
    const { data, error } = await supabase
      .from("subjects")
      .update({ is_active })
      .eq("id", id)
      .select("*, courses(name)")
      .single();
    if (error) throw error;
    return data as Subject;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },

  /** Returns { nameDuplicate, codeDuplicate } */
  async checkDuplicates(
    name: string,
    course_id: string,
    subject_code: string,
    excludeId?: string
  ): Promise<{ nameDuplicate: boolean; codeDuplicate: boolean }> {
    const buildBase = (col: string, val: string) => {
      let q = supabase
        .from("subjects")
        .select("id", { count: "exact", head: true })
        .eq(col, val);
      if (excludeId) q = q.neq("id", excludeId);
      return q;
    };

    const [nameRes, codeRes] = await Promise.all([
      buildBase("name", name).eq("course_id", course_id),
      buildBase("subject_code", subject_code.toUpperCase()),
    ]);

    return {
      nameDuplicate: (nameRes.count ?? 0) > 0,
      codeDuplicate: (codeRes.count ?? 0) > 0,
    };
  },
};
