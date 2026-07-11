import { supabase } from "@/lib/supabase";
import { generateParentPassword } from "@/lib/utils/password_utils";
import { uploadToDrive, cleanupDriveFile } from "@/lib/utils/drive_upload";
import { convertToWebP } from "@/lib/utils/image_utils";
import { Student, StudentWithRelations, AttendanceRecord, MarksRecord } from "../types";
import { StudentFormValues } from "../schemas";

export interface ParentLinkResult {
  parent_id: string | null;
  credentials?: {
    email: string;
    phone: string;
    password: string;
    parentName: string;
    studentName: string;
    emailSent: boolean;
    existed: boolean;
  };
}

const STUDENT_SELECT = `
  *,
  campuses:campus_id(id, name),
  courses:course_id(id, name),
  batches:batch_id(id, name),
  parents:parent_id(id, full_name, phone_number, email)
`;

async function createOrConnectParent(
  name: string,
  email: string,
  phone: string,
  studentName: string
): Promise<ParentLinkResult> {
  if (!name && !email && !phone) return { parent_id: null };

  // 1. Try to find by email if provided
  if (email) {
    const { data: existing } = await supabase
      .from("parents")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) return { parent_id: existing.id };
  }

  // 2. Try to find by phone if provided
  if (phone) {
    const { data: existing } = await supabase
      .from("parents")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();
    if (existing) return { parent_id: existing.id };
  }

  // 3. If neither email nor phone exists, we can't create/connect (needs at least one for auth)
  if (!email || !phone) {
    return { parent_id: null };
  }

  const password = generateParentPassword(studentName, phone);

  const res = await fetch("/api/admin/parent-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: name || "Parent", phone_number: phone }),
  });

  const contentType = res.headers.get("content-type");
  if (!res.ok || !contentType || !contentType.includes("application/json")) {
    let errMsg = `Failed to create parent auth account (status ${res.status})`;
    try {
      if (contentType && contentType.includes("application/json")) {
        const errData = await res.json();
        errMsg = errData.error || errMsg;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const auth = await res.json();
  if (!auth.user_id) throw new Error(auth.error || "Failed to create parent auth account");

  const { error: insertError } = await supabase
    .from("parents")
    .insert([{
      id: auth.user_id,
      full_name: name || "Parent",
      email,
      phone_number: phone,
      username: phone.replace(/\D/g, ""),
      password_hash: password,
      account_status: "Active",
    }]);

  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    throw insertError;
  }

  let emailSent = false;
  try {
    const { error: fnError } = await supabase.functions.invoke("send-parent-credentials", {
      body: { email, phone, password, studentName, loginId: phone.replace(/\D/g, "") },
    });
    emailSent = !fnError;
  } catch {
    emailSent = false;
  }

  return {
    parent_id: auth.user_id,
    credentials: {
      email,
      phone,
      password,
      parentName: name || "Parent",
      studentName,
      emailSent,
      existed: !!auth.existed,
    },
  };
}

function buildStudentPayload(values: StudentFormValues, parent_id: string | null) {
  const { parent_name, parent_email, parent_phone, email, batch_ids, dob, phone_number, ...rest } = values as any;
  const isAny = !batch_ids || batch_ids.includes("any");
  
  const cleanPhone = phone_number ? String(phone_number).replace(/\D/g, "") : "";
  
  return {
    ...rest,
    phone_number: cleanPhone ? Number(cleanPhone) : null,
    dob: dob || null,
    email: email || null,
    parent_id,
    batch_id: isAny ? null : batch_ids[0],
    batch_ids: isAny ? [] : batch_ids,
  };
}

export type StudentMutationResult = StudentWithRelations & { _parentCredentials?: ParentLinkResult["credentials"] };

export const studentService = {
  async getAll(): Promise<StudentWithRelations[]> {
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as StudentWithRelations[];
  },

  async getById(id: string): Promise<StudentWithRelations> {
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as StudentWithRelations;
  },

  async create(values: StudentFormValues, photoFile?: File): Promise<StudentMutationResult> {
    const link = await createOrConnectParent(
      values.parent_name ?? "",
      values.parent_email ?? "",
      values.parent_phone ?? "",
      values.full_name
    );

    const { data, error } = await supabase
      .from("students")
      .insert([buildStudentPayload(values, link.parent_id)])
      .select(STUDENT_SELECT)
      .single();
    if (error) throw error;

    const student = data as StudentMutationResult;
    if (photoFile) {
      const upload = await this.uploadPhoto(photoFile);
      if (upload) {
        await supabase
          .from("students")
          .update({
            profile_photo_url: upload.url,
            profile_photo_drive_id: upload.fileId,
          })
          .eq("id", student.id);
        student.profile_photo_url = upload.url;
        student.profile_photo_drive_id = upload.fileId;
      }
    }
    student._parentCredentials = link.credentials;
    return student;
  },

  async update(id: string, values: StudentFormValues, photoFile?: File): Promise<StudentMutationResult> {
    const link = await createOrConnectParent(
      values.parent_name ?? "",
      values.parent_email ?? "",
      values.parent_phone ?? "",
      values.full_name
    );

    const { data, error } = await supabase
      .from("students")
      .update(buildStudentPayload(values, link.parent_id))
      .eq("id", id)
      .select(STUDENT_SELECT)
      .single();
    if (error) throw error;

    const student = data as StudentMutationResult;
    if (photoFile) {
      const previousDriveId = student.profile_photo_drive_id ?? null;
      const upload = await this.uploadPhoto(photoFile);
      if (upload) {
        await supabase
          .from("students")
          .update({
            profile_photo_url: upload.url,
            profile_photo_drive_id: upload.fileId,
          })
          .eq("id", id);
        student.profile_photo_url = upload.url;
        student.profile_photo_drive_id = upload.fileId;
        if (previousDriveId && previousDriveId !== upload.fileId) {
          void cleanupDriveFile(previousDriveId);
        }
      }
    }
    student._parentCredentials = link.credentials;
    return student;
  },

  async toggleActive(id: string, is_active: boolean): Promise<StudentWithRelations> {
    const { data, error } = await supabase
      .from("students")
      .update({ academic_status: is_active ? "Active" : "Inactive" })
      .eq("id", id)
      .select(STUDENT_SELECT)
      .single();
    if (error) throw error;
    return data as StudentWithRelations;
  },

  async updateStatus(id: string, status: string): Promise<StudentWithRelations> {
    const { data, error } = await supabase
      .from("students")
      .update({ academic_status: status })
      .eq("id", id)
      .select(STUDENT_SELECT)
      .single();
    if (error) throw error;
    return data as StudentWithRelations;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
  },

  async checkRollDuplicate(roll_number: string, excludeId?: string): Promise<boolean> {
    let q = supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("roll_number", roll_number);
    if (excludeId) q = q.neq("id", excludeId);
    const { count } = await q;
    return (count ?? 0) > 0;
  },

  async getAttendance(student_id: string): Promise<AttendanceRecord[]> {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", student_id)
      .order("attendance_date", { ascending: false })
      .limit(60);
    return (data ?? []) as AttendanceRecord[];
  },

  async getMarks(student_id: string): Promise<MarksRecord[]> {
    const { data, error } = await supabase
      .from("marks")
      .select(`
        *,
        exams (
          name,
          exam_date,
          total_marks,
          exam_scope
        ),
        subjects (
          id,
          name,
          subject_code
        )
      `)
      .eq("student_id", student_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const teacherIds = Array.from(
      new Set(data.map((r: any) => r.teacher_id).filter((id): id is string => !!id))
    );

    const teacherMap = new Map<string, { id: string; full_name: string }>();
    if (teacherIds.length > 0) {
      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, auth_id, full_name")
        .in("auth_id", teacherIds);

      if (teachersData) {
        for (const t of teachersData) {
          if (t.auth_id) {
            teacherMap.set(t.auth_id, { id: t.id, full_name: t.full_name });
          }
        }
      }
    }

    return data.map((r: any) => ({
      ...r,
      teachers: r.teacher_id ? (teacherMap.get(r.teacher_id) || null) : null
    })) as MarksRecord[];
  },

  async getSubjectsByCourse(course_id: string) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name, subject_code, class_level, subject_type")
      .eq("course_id", course_id)
      .eq("is_active", true)
      .order("class_level");
    return data ?? [];
  },

  async uploadPhoto(file: File): Promise<{ url: string; fileId: string } | null> {
    try {
      const compressed = await convertToWebP(file, 0.8).catch(() => file);
      const result = await uploadToDrive(compressed, "/api/upload/student-photo");
      return { url: result.imageUrl, fileId: result.fileId };
    } catch {
      return null;
    }
  },
};
