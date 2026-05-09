import { supabase } from "../supabase";
import { Student, Parent } from "../types";

export interface IStudentRepository {
  getStudents(): Promise<Student[]>;
  getStudentsByBatch(batchId: string): Promise<Student[]>;
  createStudentWithParent(
    studentData: any,
    parentData: any
  ): Promise<{ student: any; parent: any }>;
}

export class SupabaseStudentRepository implements IStudentRepository {
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*, parents(*), courses(name), batches(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
  }

  async getStudentsByBatch(batchId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('batch_id', batchId)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data as any[];
  }

  async createStudentWithParent(
    studentData: any,
    parentData: any
  ): Promise<{ student: any; parent: any }> {
    // 1. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parentData.email,
      password: parentData.password || 'Temporary#123',
      options: {
        data: {
          full_name: parentData.fullName,
          role: 'parent'
        }
      }
    });

    if (authError) throw authError;
    const authId = authData.user?.id;

    // 2. Create Parent Record linked to Auth ID
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .insert([{
        id: authId, // Use the same ID as Auth
        full_name: parentData.fullName,
        email: parentData.email,
        phone_number: parentData.phone,
        username: parentData.email,
        password_hash: parentData.password || 'Temporary#123',
        account_status: 'Active'
      }])
      .select()
      .single();

    if (parentError) throw parentError;

    // 2. Create Student Linked to Parent
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([{
        full_name: studentData.fullName,
        admission_number: studentData.admissionNumber,
        roll_number: studentData.rollNumber,
        parent_id: parent.id,
        course_id: studentData.courseId,
        batch_id: studentData.batchId,
        progress_status: 'Average'
      }])
      .select()
      .single();

    if (studentError) {
      // Rollback parent if student fails (Manually since Supabase is HTTP-based, 
      // or we could use an RPC function if we wanted a true transaction)
      await supabase.from('parents').delete().eq('id', parent.id);
      throw studentError;
    }

    return { student, parent };
  }
}

export const studentRepository = new SupabaseStudentRepository();
