import { supabase } from "@/lib/supabase";
import { generateTeacherPassword } from "@/lib/utils/password_utils";
import { Teacher } from "../types";
import { TeacherFormValues } from "../schemas";

const SELECT = `
  *,
  campuses(id, name),
  teacher_courses(courses(id, name)),
  teacher_subjects(subjects(id, name, course_id)),
  teacher_batches(batches(id, name, course_id))
`;

async function createAuthUser(args: {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
}): Promise<{ user_id: string | null; existed: boolean }> {
  const res = await fetch("/api/admin/teacher-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create teacher auth account");
  return { user_id: json.user_id ?? null, existed: !!json.existed };
}

function teacherColumns(values: TeacherFormValues) {
  return {
    full_name: values.full_name,
    email: values.email,
    phone_number: values.phone_number,
    qualification: values.qualification,
    campus_id: values.campus_id,
    gender: values.gender || null,
    address: values.address || null,
    experience_years: values.experience_years ?? 0,
    subject_specialization: values.subject_specialization || null,
    account_status: values.account_status,
  };
}

async function syncAssignments(
  teacher_id: string,
  values: TeacherFormValues
): Promise<void> {
  await supabase.from("teacher_courses").delete().eq("teacher_id", teacher_id);
  await supabase.from("teacher_subjects").delete().eq("teacher_id", teacher_id);
  await supabase.from("teacher_batches").delete().eq("teacher_id", teacher_id);

  if (values.course_ids.length) {
    await supabase.from("teacher_courses").insert(values.course_ids.map((course_id) => ({ teacher_id, course_id })));
  }
  if (values.subject_ids.length) {
    await supabase.from("teacher_subjects").insert(values.subject_ids.map((subject_id) => ({ teacher_id, subject_id })));
  }
  if (values.batch_ids.length) {
    await supabase.from("teacher_batches").insert(values.batch_ids.map((batch_id) => ({ teacher_id, batch_id })));
  }
}

export interface CreateTeacherResult {
  teacher: Teacher;
  password: string;
  existed: boolean;
}

export const teacherService = {
  async getAll(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from("teachers")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Teacher[];
  },

  async getById(id: string): Promise<Teacher> {
    const { data, error } = await supabase
      .from("teachers")
      .select(SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Teacher;
  },

  async create(values: TeacherFormValues, photoFile?: File): Promise<CreateTeacherResult> {
    const password = generateTeacherPassword(values.full_name);

    const auth = await createAuthUser({
      email: values.email,
      password,
      full_name: values.full_name,
      phone_number: values.phone_number,
    });

    const { data, error } = await supabase
      .from("teachers")
      .insert([{ ...teacherColumns(values), auth_id: auth.user_id, password_hash: password }])
      .select("id")
      .single();
    if (error) throw error;

    const teacherId = (data as any).id as string;

    let profileUrl: string | null = null;
    if (photoFile) profileUrl = await this.uploadPhoto(photoFile, teacherId);
    if (profileUrl) {
      await supabase.from("teachers").update({ profile_image: profileUrl }).eq("id", teacherId);
    }

    await syncAssignments(teacherId, values);

    const teacher = await this.getById(teacherId);
    return { teacher, password, existed: auth.existed };
  },

  async update(id: string, values: TeacherFormValues, photoFile?: File): Promise<Teacher> {
    const { error } = await supabase
      .from("teachers")
      .update(teacherColumns(values))
      .eq("id", id);
    if (error) throw error;

    if (photoFile) {
      const url = await this.uploadPhoto(photoFile, id);
      if (url) await supabase.from("teachers").update({ profile_image: url }).eq("id", id);
    }

    await syncAssignments(id, values);
    return this.getById(id);
  },

  async toggleStatus(id: string, account_status: Teacher["account_status"]): Promise<Teacher> {
    const { error } = await supabase.from("teachers").update({ account_status }).eq("id", id);
    if (error) throw error;
    return this.getById(id);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) throw error;
  },

  async resetPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return !error;
  },

  async uploadPhoto(file: File, teacherId: string): Promise<string | null> {
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${teacherId}.${ext}`;
      const { error } = await supabase.storage.from("teacher-photos").upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("teacher-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  },

  async getRecentAttendance(teacher_id: string): Promise<any[]> {
    const { data } = await supabase
      .from("attendance")
      .select("id, attendance_date, status, students(full_name, roll_number), batches(name)")
      .eq("marked_by_teacher_id", teacher_id)
      .order("attendance_date", { ascending: false })
      .limit(15);
    if (data && data.length) return data;
    const { data: byUser } = await supabase
      .from("attendance")
      .select("id, attendance_date, status, students(full_name, roll_number), batches(name), marked_by")
      .order("attendance_date", { ascending: false })
      .limit(15);
    return byUser ?? [];
  },

  async getRecentMarks(teacher_id: string): Promise<any[]> {
    const { data } = await supabase
      .from("marks")
      .select("id, marks_obtained, total_marks, created_at, students(full_name, roll_number), exams(name, exam_date)")
      .eq("teacher_id", teacher_id)
      .order("created_at", { ascending: false })
      .limit(15);
    if (data && data.length) return data;
    const { data: fallback } = await supabase
      .from("marks")
      .select("id, marks_obtained, total_marks, created_at, students(full_name, roll_number), exams(name, exam_date)")
      .order("created_at", { ascending: false })
      .limit(15);
    return fallback ?? [];
  },
};
