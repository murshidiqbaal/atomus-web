import { supabase } from "@/lib/supabase";
import {
  FeeFilters,
  FeeStructure,
  FeeStructureInsert,
  PaymentTransaction,
  PaymentTransactionInsert,
  StudentFee,
} from "../types";

type IdName = { id: string; name: string };
type BatchLite = { id: string; name: string; campus_id: string | null };

// ── Auth cache (mirrors attendance pattern) ──────────────────────
let cachedUserId: { id: string | null; ts: number } | null = null;

async function resolveUserId(): Promise<string | null> {
  if (cachedUserId && Date.now() - cachedUserId.ts < 30_000) return cachedUserId.id;
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id ?? null;
  cachedUserId = { id, ts: Date.now() };
  return id;
}

export const feesService = {
  // ── Lookups ─────────────────────────────────────────────────────
  async listCampuses(): Promise<IdName[]> {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as IdName[];
  },

  async listCoursesByCampus(campus_id: string): Promise<IdName[]> {
    if (!campus_id) {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as IdName[];
    }
    const { data, error } = await supabase
      .from("campus_courses")
      .select("courses!inner(id, name, is_active)")
      .eq("campus_id", campus_id)
      .eq("courses.is_active", true);
    if (error) throw error;
    const rows = (data ?? []) as unknown as { courses: IdName | null }[];
    return rows
      .map((r) => r.courses)
      .filter((c): c is IdName => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async listBatches(course_id: string, campus_id: string): Promise<BatchLite[]> {
    let q = supabase.from("batches").select("id, name, campus_id");
    if (course_id) q = q.eq("course_id", course_id);
    if (campus_id) q = q.eq("campus_id", campus_id);
    const { data, error } = await q.order("name");
    if (error) throw error;
    return (data ?? []) as BatchLite[];
  },

  // ── Fee structures ──────────────────────────────────────────────
  async listFeeStructures(filters?: {
    campus_id?: string;
    course_id?: string;
    batch_id?: string;
  }): Promise<FeeStructure[]> {
    let q = supabase
      .from("fee_structures")
      .select("*, courses(id, name), batches(id, name, campus_id)")
      .order("created_at", { ascending: false });

    if (filters?.course_id) q = q.eq("course_id", filters.course_id);
    if (filters?.batch_id) q = q.eq("batch_id", filters.batch_id);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as FeeStructure[];
    // Campus filter is on batches.campus_id — apply client-side after fetch
    // since Supabase JS can't easily filter via a nested-join column.
    if (filters?.campus_id) {
      rows = rows.filter((r) => r.batches?.campus_id === filters.campus_id);
    }
    return rows;
  },

  async createFeeStructure(input: FeeStructureInsert): Promise<FeeStructure> {
    const { data, error } = await supabase
      .from("fee_structures")
      .insert([input])
      .select("*, courses(id, name), batches(id, name, campus_id)")
      .single();
    if (error) throw error;
    return data as FeeStructure;
  },

  async deleteFeeStructure(id: string): Promise<void> {
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Student fees ────────────────────────────────────────────────
  /**
   * List student fees with the joined student/course/batch context.
   * Filters (campus/course/batch/status/search) are applied via the SQL
   * relationship; campus is applied client-side after fetch (same reason
   * as fee structures — nested-join column not directly filterable).
   */
  async listStudentFees(filters: FeeFilters): Promise<StudentFee[]> {
    let q = supabase
      .from("student_fees")
      .select(
        "*, students!inner(id, full_name, admission_number, roll_number, course_id, batch_id, courses(id, name), batches(id, name, campus_id))",
      )
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (filters.status !== "All") q = q.eq("payment_status", filters.status);
    if (filters.course_id) q = q.eq("students.course_id", filters.course_id);
    if (filters.batch_id) q = q.eq("students.batch_id", filters.batch_id);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as StudentFee[];

    if (filters.campus_id) {
      rows = rows.filter((r) => r.students?.batches?.campus_id === filters.campus_id);
    }
    if (filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const n = r.students?.full_name?.toLowerCase() ?? "";
        const a = (r.students?.admission_number ?? "").toLowerCase();
        const roll = (r.students?.roll_number ?? "").toLowerCase();
        return n.includes(s) || a.includes(s) || roll.includes(s);
      });
    }
    return rows;
  },

  async getStudentFee(student_id: string): Promise<StudentFee | null> {
    const { data, error } = await supabase
      .from("student_fees")
      .select(
        "*, students!inner(id, full_name, admission_number, roll_number, course_id, batch_id, courses(id, name), batches(id, name, campus_id))",
      )
      .eq("student_id", student_id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as StudentFee | null;
  },

  async applyDiscount(student_id: string, new_total: number, new_discount: number): Promise<void> {
    // Read current paid_amount so we can recompute balance consistently.
    const { data: current, error: rErr } = await supabase
      .from("student_fees")
      .select("paid_amount")
      .eq("student_id", student_id)
      .maybeSingle();
    if (rErr) throw rErr;

    const paid = Number(current?.paid_amount ?? 0);
    const balance = Math.max(0, new_total - paid);
    const status =
      balance === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";

    const { error } = await supabase
      .from("student_fees")
      .update({
        total_fee: new_total,
        discount_amount: new_discount,
        balance_amount: balance,
        payment_status: status,
      })
      .eq("student_id", student_id);
    if (error) throw error;
  },

  /**
   * Auto-assign a fee structure to every student in the linked batch who
   * doesn't already have a student_fees row. Returns the number of new
   * rows created. Existing rows are NOT modified — `student_fees` has a
   * UNIQUE(student_id) constraint, so this naturally skips duplicates.
   */
  async bulkAssignToBatch(fee_structure_id: string): Promise<{ assigned: number; skipped: number }> {
    const { data: fs, error: fsErr } = await supabase
      .from("fee_structures")
      .select("id, total_amount, batch_id")
      .eq("id", fee_structure_id)
      .maybeSingle();
    if (fsErr) throw fsErr;
    if (!fs) throw new Error("Fee structure not found.");
    if (!fs.batch_id) throw new Error("This fee structure has no batch — cannot bulk assign.");

    const { data: students, error: sErr } = await supabase
      .from("students")
      .select("id")
      .eq("batch_id", fs.batch_id);
    if (sErr) throw sErr;
    if (!students?.length) return { assigned: 0, skipped: 0 };

    const studentIds = students.map((s) => s.id as string);

    const { data: existing, error: eErr } = await supabase
      .from("student_fees")
      .select("student_id")
      .in("student_id", studentIds);
    if (eErr) throw eErr;
    const have = new Set((existing ?? []).map((r) => r.student_id as string));

    const rows = studentIds
      .filter((id) => !have.has(id))
      .map((id) => ({
        student_id: id,
        fee_structure_id: fs.id,
        total_fee: Number(fs.total_amount),
        discount_amount: 0,
        paid_amount: 0,
        balance_amount: Number(fs.total_amount),
        payment_status: "Pending" as const,
      }));

    if (rows.length === 0) return { assigned: 0, skipped: studentIds.length };

    const { error: iErr } = await supabase.from("student_fees").insert(rows);
    if (iErr) throw iErr;

    return { assigned: rows.length, skipped: studentIds.length - rows.length };
  },

  // ── Payments ────────────────────────────────────────────────────
  async recordPayment(input: PaymentTransactionInsert): Promise<PaymentTransaction> {
    const stamped: PaymentTransactionInsert = {
      ...input,
      recorded_by: input.recorded_by ?? (await resolveUserId()) ?? null,
    };

    const { data, error } = await supabase
      .from("payment_transactions")
      .insert([stamped])
      .select("*, students(id, full_name, admission_number, course_id, batch_id, courses(id, name), batches(id, name, campus_id))")
      .single();
    if (error) throw error;

    // The DB trigger updates student_fees.paid_amount/balance/status,
    // so callers should invalidate the student_fees query after this.
    return data as PaymentTransaction;
  },

  async listPayments(filters: FeeFilters): Promise<PaymentTransaction[]> {
    let q = supabase
      .from("payment_transactions")
      .select(
        "*, students!inner(id, full_name, admission_number, course_id, batch_id, courses(id, name), batches(id, name, campus_id))",
      )
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.method !== "All") q = q.eq("payment_method", filters.method);
    if (filters.course_id) q = q.eq("students.course_id", filters.course_id);
    if (filters.batch_id) q = q.eq("students.batch_id", filters.batch_id);
    if (filters.date_from) q = q.gte("payment_date", filters.date_from);
    if (filters.date_to) q = q.lte("payment_date", filters.date_to);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as PaymentTransaction[];
    if (filters.campus_id) {
      rows = rows.filter((r) => r.students?.batches?.campus_id === filters.campus_id);
    }
    if (filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const n = r.students?.full_name?.toLowerCase() ?? "";
        const a = (r.students?.admission_number ?? "").toLowerCase();
        const t = (r.transaction_id ?? "").toLowerCase();
        return n.includes(s) || a.includes(s) || t.includes(s);
      });
    }
    return rows;
  },

  async getPayment(id: string): Promise<PaymentTransaction | null> {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(
        "*, students(id, full_name, admission_number, course_id, batch_id, courses(id, name), batches(id, name, campus_id))",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PaymentTransaction | null;
  },

  // ── Dashboard stats ─────────────────────────────────────────────
  /**
   * Returns roll-up numbers for the overview/dues dashboards. Two queries:
   * - student_fees aggregate (collection, pending, status counts)
   * - payment_transactions in current month for revenue
   */
  async getDashboardStats(): Promise<{
    totalCollected: number;
    totalPending: number;
    totalBilled: number;
    paidStudents: number;
    pendingStudents: number;
    partialStudents: number;
    overdueStudents: number;
    totalStudents: number;
    monthRevenue: number;
    todayCollection: number;
    collectionRate: number;
  }> {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().slice(0, 10);
    const todayISO = today.toISOString().slice(0, 10);

    const [feesQ, monthQ, todayQ] = await Promise.all([
      supabase
        .from("student_fees")
        .select("total_fee, paid_amount, balance_amount, payment_status"),
      supabase
        .from("payment_transactions")
        .select("amount_paid")
        .gte("payment_date", monthStart),
      supabase
        .from("payment_transactions")
        .select("amount_paid")
        .eq("payment_date", todayISO),
    ]);

    if (feesQ.error) throw feesQ.error;
    if (monthQ.error) throw monthQ.error;
    if (todayQ.error) throw todayQ.error;

    const fees = (feesQ.data ?? []) as {
      total_fee: number;
      paid_amount: number;
      balance_amount: number;
      payment_status: string;
    }[];

    const totalCollected = fees.reduce((a, r) => a + Number(r.paid_amount), 0);
    const totalPending = fees.reduce((a, r) => a + Number(r.balance_amount), 0);
    const totalBilled = fees.reduce((a, r) => a + Number(r.total_fee), 0);

    const count = (s: string) => fees.filter((r) => r.payment_status === s).length;
    const paidStudents = count("Paid");
    const pendingStudents = count("Pending");
    const partialStudents = count("Partial");
    const overdueStudents = count("Overdue");

    const monthRevenue = (monthQ.data ?? []).reduce(
      (a, r) => a + Number(r.amount_paid), 0,
    );
    const todayCollection = (todayQ.data ?? []).reduce(
      (a, r) => a + Number(r.amount_paid), 0,
    );

    const collectionRate = totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 100)
      : 0;

    return {
      totalCollected,
      totalPending,
      totalBilled,
      paidStudents,
      pendingStudents,
      partialStudents,
      overdueStudents,
      totalStudents: fees.length,
      monthRevenue,
      todayCollection,
      collectionRate,
    };
  },

  /**
   * Group payments by month for the trend chart. Returns the last `months`
   * months including the current one.
   */
  async getMonthlyTrend(months = 6): Promise<{ month: string; collection: number; }[]> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    const startISO = start.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payment_transactions")
      .select("amount_paid, payment_date")
      .gte("payment_date", startISO);
    if (error) throw error;

    const buckets = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
      buckets.set(monthKey(d), 0);
    }

    for (const r of (data ?? []) as { amount_paid: number; payment_date: string }[]) {
      const k = monthKey(new Date(r.payment_date));
      if (buckets.has(k)) buckets.set(k, buckets.get(k)! + Number(r.amount_paid));
    }

    return Array.from(buckets.entries()).map(([month, collection]) => ({ month, collection }));
  },

  /**
   * Per-campus revenue (sum of paid_amount on student_fees). Useful for
   * the campus comparison chart.
   */
  async getCampusRevenue(): Promise<{ campus_id: string; campus: string; collected: number; pending: number }[]> {
    const [campusesQ, feesQ] = await Promise.all([
      supabase.from("campuses").select("id, name").eq("is_active", true),
      supabase
        .from("student_fees")
        .select("paid_amount, balance_amount, students!inner(batch_id, batches!inner(campus_id))"),
    ]);
    if (campusesQ.error) throw campusesQ.error;
    if (feesQ.error) throw feesQ.error;

    type Row = {
      paid_amount: number;
      balance_amount: number;
      students: { batches: { campus_id: string | null } | null } | null;
    };

    const totals = new Map<string, { collected: number; pending: number }>();
    for (const r of (feesQ.data as unknown as Row[]) ?? []) {
      const id = r.students?.batches?.campus_id ?? null;
      if (!id) continue;
      const cur = totals.get(id) ?? { collected: 0, pending: 0 };
      cur.collected += Number(r.paid_amount);
      cur.pending += Number(r.balance_amount);
      totals.set(id, cur);
    }

    return ((campusesQ.data ?? []) as IdName[]).map((c) => {
      const t = totals.get(c.id) ?? { collected: 0, pending: 0 };
      return { campus_id: c.id, campus: c.name, collected: t.collected, pending: t.pending };
    });
  },
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
