import { supabase } from "../supabase";
import { Parent, Student } from "../types";
import { generateParentPassword } from "@/lib/utils/password_utils";

export interface IParentRepository {
  getParents(): Promise<Parent[]>;
  addParent(parent: any): Promise<any>;
  updateParent(id: string, updates: Partial<Parent>): Promise<any>;
  deleteParent(id: string): Promise<void>;
  searchStudents(query: string): Promise<Student[]>;
}

export class SupabaseParentRepository implements IParentRepository {
  async getParents(): Promise<Parent[]> {
    const { data, error } = await supabase
      .from('parents')
      .select('*, students(*)');

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone_number,
      username: p.username,
      password: p.password_hash,
      status: p.account_status,
      linkedStudents: (p.students || [])
        .filter((s: any) => s.is_active !== false)
        .map((s: any) => ({
          id: s.id,
          name: s.full_name,
          class: s.course_id, // Map accordingly
          rollNumber: s.roll_number
        })),
      createdAt: p.created_at
    }));
  }

  async addParent(parentData: any): Promise<any> {
    const { data, error } = await supabase
      .from('parents')
      .insert([{
        full_name: parentData.name,
        email: parentData.email,
        phone_number: parentData.phone,
        username: parentData.email,
        password_hash: parentData.password || generateParentPassword(parentData.name || "Parent", parentData.phone),
        account_status: 'Active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateParent(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('parents')
      .update({
        full_name: updates.name,
        email: updates.email,
        phone_number: updates.phone,
        account_status: updates.status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteParent(id: string): Promise<void> {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async searchStudents(query: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .ilike('full_name', `%${query}%`);

    if (error) throw error;
    return data;
  }
}

export const parentRepository = new SupabaseParentRepository();
