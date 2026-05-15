import { supabase } from "../supabase";
import { AttendanceRecord, MarkRecord, Exam } from "../types";

export interface IAcademicRepository {
  getAttendance(batchId: string, date: string): Promise<AttendanceRecord[]>;
  updateAttendance(records: any[]): Promise<void>;
  getExams(courseId: string, batchId: string): Promise<Exam[]>;
  createExam(data: { name: string; course_id: string; batch_id: string; exam_date: string; total_marks?: number }): Promise<any>;
  getSubjects(): Promise<{ id: string; name: string }[]>;
  getMarks(examId: string): Promise<MarkRecord[]>;
  updateMarks(records: any[]): Promise<void>;
}

export class SupabaseAcademicRepository implements IAcademicRepository {
  async getAttendance(batchId: string, date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('batch_id', batchId)
      .eq('attendance_date', date);

    if (error) throw error;
    return data as any[];
  }

  async updateAttendance(records: any[]): Promise<void> {
    // Separate records into those with IDs (updates) and those without (potential new inserts)
    const validRecords = records.filter(r => r.status && r.student_id);

    const { error } = await supabase
      .from('attendance')
      .upsert(validRecords, { 
        onConflict: 'student_id,batch_id,attendance_date' 
      });
    
    if (error) throw error;
  }

  async getExams(courseId: string, batchId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('course_id', courseId)
      .eq('batch_id', batchId)
      .order('exam_date', { ascending: false });

    if (error) throw error;
    return data as any[];
  }

  async createExam(examData: {
    name: string;
    course_id: string;
    batch_id: string;
    exam_date: string;
    total_marks?: number;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('exams')
      .insert([examData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSubjects(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name');

    if (error) return [];
    return data ?? [];
  }

  async getMarks(examId: string): Promise<MarkRecord[]> {
    const { data, error } = await supabase
      .from('marks')
      .select('*')
      .eq('exam_id', examId);

    if (error) throw error;
    return data as any[];
  }

  async updateMarks(records: any[]): Promise<void> {
    const valid = records.filter((r) => r.exam_id && r.student_id);
    if (!valid.length) return;

    const toUpdate = valid.filter((r) => r.id);
    const toInsert = valid.filter((r) => !r.id);

    if (toUpdate.length) {
      const { error } = await supabase.from('marks').upsert(toUpdate);
      if (error) throw error;
    }
    if (toInsert.length) {
      const { error } = await supabase.from('marks').upsert(toInsert, {
        onConflict: 'exam_id,student_id',
      });
      if (error) throw error;
    }
  }
}

export const academicRepository = new SupabaseAcademicRepository();
