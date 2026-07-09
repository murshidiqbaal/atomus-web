import { supabase } from "@/lib/supabase";
import { cleanupDriveFile, uploadToDrive } from "@/lib/utils/drive_upload";
import { convertToWebP } from "@/lib/utils/image_utils";
import { generateParentPassword } from "@/lib/utils/password_utils";
import { ParentFormValues } from "../schemas";
import { LinkedStudent, Parent } from "../types";

async function uploadParentPhoto(file: File): Promise<{ url: string; fileId: string } | null> {
  try {
    const compressed = await convertToWebP(file, 0.8).catch(() => file);
    const result = await uploadToDrive(compressed, "/api/upload/parent-photo");
    return { url: result.imageUrl, fileId: result.fileId };
  } catch {
    return null;
  }
}

const SELECT_WITH_STUDENTS = `
  *,
  students(
    id,
    full_name,
    roll_number,
    course_id,
    batch_id,
    attendance_percentage,
    progress_status,
    academic_status,
    courses:course_id(id, name),
    batches:batch_id(id, name)
  )
`;

async function createAuthUser(args: {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
}): Promise<{ user_id: string | null; existed: boolean }> {
  const res = await fetch("/api/admin/parent-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create auth account");
  return { user_id: json.user_id ?? null, existed: !!json.existed };
}

export interface CreateParentResult {
  parent: Parent;
  password: string;
  emailSent: boolean;
  existed: boolean;
}

export const parentService = {
  async getAll(): Promise<Parent[]> {
    const { data, error } = await supabase
      .from("parents")
      .select(SELECT_WITH_STUDENTS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Parent[];
  },

  async getById(id: string): Promise<Parent> {
    const { data, error } = await supabase
      .from("parents")
      .select(SELECT_WITH_STUDENTS)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Parent;
  },

  async findByEmail(email: string): Promise<Parent | null> {
    const { data } = await supabase
      .from("parents")
      .select(SELECT_WITH_STUDENTS)
      .eq("email", email)
      .maybeSingle();
    return (data as Parent) ?? null;
  },

  async getUnlinkedStudents(): Promise<LinkedStudent[]> {
    const { data, error } = await supabase
      .from("students")
      .select(`
        id,
        full_name,
        roll_number,
        course_id,
        batch_id,
        attendance_percentage,
        progress_status,
        academic_status,
        courses:course_id(id, name),
        batches:batch_id(id, name)
      `)
      .is("parent_id", null)
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as unknown as LinkedStudent[];
  },

  async create(values: ParentFormValues, photoFile?: File): Promise<CreateParentResult> {
    const existing = await this.findByEmail(values.email);
    if (existing) {
      if (values.student_ids.length) {
        await this.linkStudents(existing.id, values.student_ids);
      }
      const refreshed = await this.getById(existing.id);
      return { parent: refreshed, password: existing.password_hash ?? "", emailSent: false, existed: true };
    }

    const firstStudentName =
      values.student_ids.length > 0
        ? (await this.lookupStudentNames(values.student_ids))[0] ?? values.full_name
        : values.full_name;

    const password = values.password?.trim() || generateParentPassword(firstStudentName, values.phone_number);

    const auth = await createAuthUser({
      email: values.email,
      password,
      full_name: values.full_name,
      phone_number: values.phone_number,
    });

    if (!auth.user_id) {
      throw new Error(
        "Couldn't create the parent auth account. The email may already exist in Supabase Auth " +
        "with an unknown password, or the server is missing SUPABASE_SERVICE_ROLE_KEY in .env.local."
      );
    }

    // If the auth account was recovered (already existed) but no parents row
    // points at it, treat the existing parent row (if any) as the target so we
    // don't violate the parents.email UNIQUE constraint.
    if (auth.existed) {
      const orphan = await this.findByEmail(values.email);
      if (orphan) {
        if (values.student_ids.length) {
          await this.linkStudents(orphan.id, values.student_ids);
        }
        const refreshed = await this.getById(orphan.id);
        return { parent: refreshed, password, emailSent: false, existed: true };
      }
    }

    const upload = photoFile ? await uploadParentPhoto(photoFile) : null;

    const { error } = await supabase
      .from("parents")
      .insert([{
        id: auth.user_id,
        full_name: values.full_name,
        email: values.email,
        phone_number: values.phone_number,
        username: values.phone_number.replace(/\D/g, ""),
        password_hash: password,
        account_status: values.account_status,
        profile_photo_url: upload?.url ?? null,
        profile_photo_drive_id: upload?.fileId ?? null,
      }]);

    if (error) throw error;

    if (values.student_ids.length) {
      await this.linkStudents(auth.user_id, values.student_ids);
    }

    const emailSent = await this.sendCredentials(values.email, values.phone_number, password, firstStudentName);
    const refreshed = await this.getById(auth.user_id);
    return { parent: refreshed, password, emailSent, existed: false };
  },

  async update(id: string, values: Partial<ParentFormValues>, photoFile?: File): Promise<Parent> {
    const patch: Record<string, any> = {};
    if (values.full_name !== undefined) patch.full_name = values.full_name;
    if (values.email !== undefined) patch.email = values.email;
    if (values.phone_number !== undefined) {
      patch.phone_number = values.phone_number;
      patch.username = values.phone_number.replace(/\D/g, "");
    }
    if (values.account_status !== undefined) patch.account_status = values.account_status;

    let previousDriveId: string | null = null;
    if (photoFile) {
      const { data: prev } = await supabase
        .from("parents")
        .select("profile_photo_drive_id")
        .eq("id", id)
        .maybeSingle();
      previousDriveId = (prev as { profile_photo_drive_id?: string | null } | null)?.profile_photo_drive_id ?? null;
      const upload = await uploadParentPhoto(photoFile);
      if (upload) {
        patch.profile_photo_url = upload.url;
        patch.profile_photo_drive_id = upload.fileId;
      }
    }

    const { data, error } = await supabase
      .from("parents")
      .update(patch)
      .eq("id", id)
      .select(SELECT_WITH_STUDENTS)
      .single();
    if (error) throw error;

    if (values.student_ids) {
      await this.linkStudents(id, values.student_ids);
    }

    if (previousDriveId && patch.profile_photo_drive_id && previousDriveId !== patch.profile_photo_drive_id) {
      void cleanupDriveFile(previousDriveId);
    }

    return data as Parent;
  },

  async toggleStatus(id: string, account_status: Parent["account_status"]): Promise<Parent> {
    const { data, error } = await supabase
      .from("parents")
      .update({ account_status })
      .eq("id", id)
      .select(SELECT_WITH_STUDENTS)
      .single();
    if (error) throw error;
    return data as Parent;
  },

  async remove(id: string): Promise<void> {
    await supabase.from("students").update({ parent_id: null }).eq("parent_id", id);
    const { error } = await supabase.from("parents").delete().eq("id", id);
    if (error) throw error;
  },

  async linkStudents(parent_id: string, student_ids: string[]): Promise<void> {
    if (!student_ids.length) return;
    const { error } = await supabase
      .from("students")
      .update({ parent_id })
      .in("id", student_ids);
    if (error) throw error;
  },

  async unlinkStudent(student_id: string): Promise<void> {
    const { error } = await supabase
      .from("students")
      .update({ parent_id: null })
      .eq("id", student_id);
    if (error) throw error;
  },

  async resetPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return !error;
  },

  async sendCredentials(
    email: string,
    phone: string,
    password: string,
    studentName: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-parent-credentials", {
        body: { email, phone, password, studentName, loginId: phone.replace(/\D/g, "") },
      });
      return !error;
    } catch {
      return false;
    }
  },

  async lookupStudentNames(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const { data } = await supabase
      .from("students")
      .select("id, full_name")
      .in("id", ids);
    const map = new Map((data ?? []).map((s: any) => [s.id, s.full_name]));
    return ids.map((id) => map.get(id) ?? "");
  },
};
