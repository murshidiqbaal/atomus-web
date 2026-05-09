import { supabase } from "../supabase";
import { AttendanceRecord, MarkRecord, Exam } from "../types";

export interface IAcademicRepository {
  getAttendance(batchId: string, date: string): Promise<AttendanceRecord[]>;
  updateAttendance(records: any[]): Promise<void>;
  getExams(courseId: string, batchId: string): Promise<Exam[]>;
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
      .eq('batch_id', batchId);

    if (error) throw error;
    return data as any[];
  }

  async getMarks(examId: string): Promise<MarkRecord[]> {
    const { data, error } = await supabase
      .from('marks')
      .select('*, students(full_name), subjects(name)')
      .eq('exam_id', examId);

    if (error) throw error;
    return data as any[];
  }

  async updateMarks(records: any[]): Promise<void> {
    const { error } = await supabase
      .from('marks')
      .upsert(records);
    
    if (error) throw error;
  }
}

export const academicRepository = new SupabaseAcademicRepository();
