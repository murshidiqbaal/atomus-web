import { supabase } from "../supabase";
import { Teacher } from "../types";

export class SupabaseTeacherRepository {
  async getTeachers(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Teacher[];
  }

  async addTeacher(
    teacherData: Partial<Teacher> & { password: string }
  ): Promise<Teacher & { generatedPassword: string }> {
    const { password, ...rest } = teacherData;

    // Create Supabase auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: rest.email!,
      password,
      options: {
        data: { full_name: rest.full_name, role: 'teacher' },
      },
    });

    if (authError) {
      // If already registered, we continue and just insert the teachers row
      // (the admin can reset the password separately)
      if (!authError.message.toLowerCase().includes('already registered')) {
        throw authError;
      }
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert([{
        full_name: rest.full_name,
        email: rest.email,
        phone_number: rest.phone_number,
        subject_specialization: rest.subject_specialization,
        assigned_courses: rest.assigned_courses || [],
        assigned_batches: rest.assigned_batches || [],
        account_status: 'Active',
        auth_id: authData?.user?.id ?? null,
      }])
      .select()
      .single();

    if (error) throw error;
    return { ...(data as Teacher), generatedPassword: password };
  }

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .update({
        full_name: updates.full_name,
        email: updates.email,
        phone_number: updates.phone_number,
        subject_specialization: updates.subject_specialization,
        assigned_courses: updates.assigned_courses,
        assigned_batches: updates.assigned_batches,
        account_status: updates.account_status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Teacher;
  }

  async deleteTeacher(id: string): Promise<void> {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
  }

  async getTeachersByBatch(batchId: string): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .contains('assigned_batches', [batchId]);

    if (error) throw error;
    return (data || []) as Teacher[];
  }
}

export const teacherRepository = new SupabaseTeacherRepository();
