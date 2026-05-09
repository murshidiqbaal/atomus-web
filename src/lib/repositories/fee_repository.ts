import { supabase } from "../supabase";

export interface IFeeRepository {
  getFeeDashboardStats(): Promise<any>;
  getFeeStructures(): Promise<any[]>;
  addFeeStructure(structure: any): Promise<any>;
  getStudentFees(filters?: any): Promise<any[]>;
  recordPayment(transaction: any): Promise<any>;
  getPaymentHistory(filters?: any): Promise<any[]>;
}

export class SupabaseFeeRepository implements IFeeRepository {
  async getFeeDashboardStats(): Promise<any> {
    const { data: stats, error } = await supabase
      .from('student_fees')
      .select('total_fee, paid_amount, balance_amount, payment_status');
    
    if (error) throw error;

    const totalCollection = stats.reduce((acc, curr) => acc + Number(curr.paid_amount), 0);
    const totalPending = stats.reduce((acc, curr) => acc + Number(curr.balance_amount), 0);
    const paidStudents = stats.filter(s => s.payment_status === 'Paid').length;
    
    return {
      totalCollection,
      totalPending,
      paidStudents,
      totalStudents: stats.length
    };
  }

  async getFeeStructures(): Promise<any[]> {
    const { data, error } = await supabase
      .from('fee_structures')
      .select('*, courses(name), batches(name)');
    
    if (error) throw error;
    return data;
  }

  async addFeeStructure(structure: any): Promise<any> {
    const { data, error } = await supabase
      .from('fee_structures')
      .insert([structure])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getStudentFees(filters?: any): Promise<any[]> {
    let query = supabase
      .from('student_fees')
      .select('*, students(full_name, admission_number, course_id, batch_id, courses(name), batches(name))');
    
    if (filters?.courseId) query = query.eq('students.course_id', filters.courseId);
    if (filters?.status) query = query.eq('payment_status', filters.status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async recordPayment(transaction: any): Promise<any> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        student_id: transaction.studentId,
        amount_paid: transaction.amount,
        payment_method: transaction.method,
        remarks: transaction.remarks,
        payment_date: transaction.date || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getPaymentHistory(filters?: any): Promise<any[]> {
    let query = supabase
      .from('payment_transactions')
      .select('*, students(full_name, courses(name), batches(name))')
      .order('payment_date', { ascending: false });
    
    if (filters?.dateRange) {
        // Handle date range
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

export const feeRepository = new SupabaseFeeRepository();
