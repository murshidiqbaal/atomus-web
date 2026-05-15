import { supabase } from "../supabase";
import { Student } from "../types";

export class SupabaseStudentRepository {
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*, parents(*), courses(name), batches(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as any[];
  }

  async getStudentsByBatch(batchId?: string): Promise<Student[]> {
    let query = supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    if (batchId) {
      query = query.eq("batch_id", batchId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as any[];
  }

  /** Minimal insert — student only, no parent account */
  async insertStudent(payload: {
    full_name: string;
    roll_number: string;
    course_id: string;
    batch_id: string;
    email?: string;
    phone_number?: string;
  }): Promise<any> {
    const { data, error } = await supabase
      .from("students")
      .insert([{ ...payload, progress_status: "Average", attendance_percentage: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createStudentWithParent(
    studentData: any,
    parentData: any
  ): Promise<{ student: any; parent: any }> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parentData.email,
      password: parentData.password || "Temporary#123",
      options: { data: { full_name: parentData.fullName, role: "parent" } },
    });

    if (authError) throw authError;
    const authId = authData.user?.id;

    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .insert([{
        id: authId,
        full_name: parentData.fullName,
        email: parentData.email,
        phone_number: parentData.phone,
        username: parentData.email,
        password_hash: parentData.password || "Temporary#123",
        account_status: "Active",
      }])
      .select()
      .single();

    if (parentError) throw parentError;

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert([{
        full_name: studentData.fullName,
        admission_number: studentData.admissionNumber,
        roll_number: studentData.rollNumber,
        parent_id: parent.id,
        course_id: studentData.courseId,
        batch_id: studentData.batchId,
        progress_status: "Average",
      }])
      .select()
      .single();

    if (studentError) {
      await supabase.from("parents").delete().eq("id", parent.id);
      throw studentError;
    }

    return { student, parent };
  }
}

export const studentRepository = new SupabaseStudentRepository();
