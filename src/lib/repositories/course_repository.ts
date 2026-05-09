import { supabase } from "../supabase";
import { Course, Batch } from "../types";

export interface ICourseRepository {
  getCourses(): Promise<Course[]>;
  getBatchesByCourse(courseId: string): Promise<Batch[]>;
  addCourse(course: any): Promise<any>;
  addBatch(batch: any): Promise<any>;
}

export class SupabaseCourseRepository implements ICourseRepository {
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, batches(count)');
    
    if (error) throw error;
    
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      subjects: [], // Fetching subjects would need another join or a field
      durationMonths: c.duration_months,
      batchCount: c.batches?.[0]?.count || 0
    }));
  }

  async getBatchesByCourse(courseId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*, students(count)')
      .eq('course_id', courseId);

    if (error) throw error;

    return data.map((b: any) => ({
      id: b.id,
      courseId: b.course_id,
      name: b.name,
      timing: b.timing,
      studentCount: b.students?.[0]?.count || 0,
      isActive: b.is_active
    }));
  }

  async addCourse(course: any): Promise<any> {
    const { data, error } = await supabase
      .from('courses')
      .insert([course])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async addBatch(batch: any): Promise<any> {
    const { data, error } = await supabase
      .from('batches')
      .insert([{
        course_id: batch.courseId,
        name: batch.name,
        timing: batch.timing,
        is_active: true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export const courseRepository = new SupabaseCourseRepository();
