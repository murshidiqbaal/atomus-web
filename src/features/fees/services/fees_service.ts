import { supabase } from "@/lib/supabase";
import {
  buildTermStatusFromStructure,
  FeeFilters,
  FeeStructure,
  FeeStructureInsert,
  PaymentTransaction,
  PaymentTransactionInsert,
  recomputeTermStatuses,
  StudentFee,
  TermDetail,
  TermStatus,
  todayISO,
} from "../types";

type IdName = { id: string; name: string };

// ── Auth cache (mirrors attendance pattern) ──────────────────────
let cachedUserId: { id: string | null; ts: number } | null = null;

async function resolveUserId(): Promise<string | null> {
  if (cachedUserId && Date.now() - cachedUserId.ts < 30_000) return cachedUserId.id;
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id ?? null;
  cachedUserId = { id, ts: Date.now() };
  return id;
}

const STRUCTURE_SELECT =
  "id, name, campus_id, course_id, fee_frequency, term_count, term_details, total_amount, admission_fee, is_active, created_at, batch_id, monthly_fee, installment_count, due_date_day, applies_to_all_campuses, applies_to_all_batches, campuses(id, name), courses(id, name)";

function normaliseStructure(row: Record<string, unknown>): FeeStructure {
  return {
    ...(row as object),
    term_details: Array.isArray(row.term_details)
      ? (row.term_details as TermDetail[])
      : [],
    term_count: Number(row.term_count ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    admission_fee: Number(row.admission_fee ?? 0),
    fee_frequency: (row.fee_frequency as FeeStructure["fee_frequency"]) ?? "Monthly",
    is_active: Boolean(row.is_active),
  } as FeeStructure;
}

function normaliseStudentFee(row: Record<string, unknown>): StudentFee {
  return {
    ...(row as object),
    term_status: Array.isArray(row.term_status)
      ? (row.term_status as TermStatus[])
      : [],
  } as StudentFee;
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

  // ── Fee structures ──────────────────────────────────────────────
  async listFeeStructures(filters?: {
    campus_id?: string;
    course_id?: string;
  }): Promise<FeeStructure[]> {
    let q = supabase
      .from("fee_structures")
      .select(STRUCTURE_SELECT)
      .order("created_at", { ascending: false });

    if (filters?.course_id) {
      q = q.or(`course_id.eq.${filters.course_id},course_id.is.null`);
    }
    if (filters?.campus_id) {
      // Match the explicit campus, legacy "all campuses" rows, and pre-migration rows without campus_id.
      q = q.or(
        `campus_id.eq.${filters.campus_id},campus_id.is.null,applies_to_all_campuses.eq.true`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => normaliseStructure(r as Record<string, unknown>));
  },

  async createFeeStructure(input: FeeStructureInsert): Promise<FeeStructure> {
    const totalFromTerms = (input.term_details ?? []).reduce(
      (a, t) => a + (Number(t.amount) || 0),
      0,
    );
    const total = Number.isFinite(input.total_amount) && input.total_amount > 0
      ? Number(input.total_amount)
      : Number(input.admission_fee || 0) + totalFromTerms;

    const payload = {
      name: input.name.trim(),
      campus_id: input.campus_id,
      course_id: input.course_id,
      batch_id: null,
      applies_to_all_campuses: !input.campus_id,
      applies_to_all_batches: true,
      is_active: input.is_active ?? true,
      fee_frequency: input.fee_frequency,
      term_count: input.term_count,
      term_details: input.term_details,
      total_amount: total,
      admission_fee: Number(input.admission_fee || 0),
      monthly_fee: 0,
      installment_count: input.term_count,
      due_date_day: input.term_details[0]?.due_day ?? 10,
    };

    const { data, error } = await supabase
      .from("fee_structures")
      .insert([payload])
      .select(STRUCTURE_SELECT)
      .single();
    if (error) throw error;
    return normaliseStructure(data as Record<string, unknown>);
  },

  async updateFeeStructure(id: string, input: FeeStructureInsert): Promise<FeeStructure> {
    const totalFromTerms = (input.term_details ?? []).reduce(
      (a, t) => a + (Number(t.amount) || 0),
      0,
    );
    const total = Number.isFinite(input.total_amount) && input.total_amount > 0
      ? Number(input.total_amount)
      : Number(input.admission_fee || 0) + totalFromTerms;

    const { data, error } = await supabase
      .from("fee_structures")
      .update({
        name: input.name.trim(),
        campus_id: input.campus_id,
        course_id: input.course_id,
        fee_frequency: input.fee_frequency,
        term_count: input.term_count,
        term_details: input.term_details,
        total_amount: total,
        admission_fee: Number(input.admission_fee || 0),
        is_active: input.is_active ?? true,
      })
      .eq("id", id)
      .select(STRUCTURE_SELECT)
      .single();
    if (error) throw error;
    return normaliseStructure(data as Record<string, unknown>);
  },

  async deleteFeeStructure(id: string): Promise<void> {
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Student fees ────────────────────────────────────────────────
  async listStudentFees(filters: FeeFilters): Promise<StudentFee[]> {
    let q = supabase
      .from("student_fees")
      .select(
        "*, students!inner(id, full_name, academic_status, admission_number, roll_number, campus_id, course_id, courses(id, name), campuses(id, name), parents(phone_number, username))",
      )
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (filters.status !== "All") q = q.eq("payment_status", filters.status);
    if (filters.course_id) q = q.eq("students.course_id", filters.course_id);
    if (filters.campus_id) q = q.eq("students.campus_id", filters.campus_id);
    if (filters.academic_status && filters.academic_status !== "All") {
      q = q.eq("students.academic_status", filters.academic_status);
    }

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []).map((r) => normaliseStudentFee(r as Record<string, unknown>));

    if (filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      const digits = s.replace(/\D+/g, "");
      rows = rows.filter((r) => {
        const n = r.students?.full_name?.toLowerCase() ?? "";
        const a = (r.students?.admission_number ?? "").toLowerCase();
        const roll = (r.students?.roll_number ?? "").toLowerCase();
        const phone = (r.students?.parents?.phone_number ?? "").replace(/\D+/g, "");
        const uname = (r.students?.parents?.username ?? "").toLowerCase();
        if (n.includes(s) || a.includes(s) || roll.includes(s) || uname.includes(s)) return true;
        if (digits && phone.includes(digits)) return true;
        return false;
      });
    }
    return rows;
  },

  async getStudentFee(student_id: string): Promise<StudentFee | null> {
    const { data, error } = await supabase
      .from("student_fees")
      .select(
        "*, students!inner(id, full_name, admission_number, roll_number, campus_id, course_id, courses(id, name), campuses(id, name))",
      )
      .eq("student_id", student_id)
      .maybeSingle();
    if (error) throw error;
    return data ? normaliseStudentFee(data as Record<string, unknown>) : null;
  },

  async applyDiscount(student_id: string, new_total: number, new_discount: number): Promise<void> {
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

  async updatePaymentStatus(student_id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from("student_fees")
      .update({ payment_status: status })
      .eq("student_id", student_id);
    if (error) throw error;
  },

  /**
   * Assign a structure to all students matching its scope (campus + course).
   * Generates a student_fees row for every student that doesn't already have
   * one, including the term_status JSONB derived from the structure's terms.
   * Idempotent — UNIQUE(student_id) skips duplicates.
   */
  async assignStructureToScope(fee_structure_id: string): Promise<{ assigned: number; skipped: number }> {
    const { data: fs, error: fsErr } = await supabase
      .from("fee_structures")
      .select("id, campus_id, course_id, total_amount, admission_fee, fee_frequency, term_count, term_details, applies_to_all_campuses")
      .eq("id", fee_structure_id)
      .maybeSingle();
    if (fsErr) throw fsErr;
    if (!fs) throw new Error("Fee structure not found.");
    if (!fs.course_id) throw new Error("Structure must have a course before bulk assigning.");

    let q = supabase.from("students").select("id").eq("course_id", fs.course_id);
    if (fs.campus_id && !fs.applies_to_all_campuses) q = q.eq("campus_id", fs.campus_id);

    const { data: students, error: sErr } = await q;
    if (sErr) throw sErr;
    if (!students?.length) return { assigned: 0, skipped: 0 };

    const studentIds = students.map((s) => s.id as string);

    const { data: existing, error: eErr } = await supabase
      .from("student_fees")
      .select("student_id")
      .in("student_id", studentIds);
    if (eErr) throw eErr;
    const have = new Set((existing ?? []).map((r) => r.student_id as string));

    const terms = Array.isArray(fs.term_details) ? (fs.term_details as TermDetail[]) : [];
    const today = todayISO();
    const total = Number(fs.total_amount);

    const rows = studentIds
      .filter((id) => !have.has(id))
      .map((id) => ({
        student_id: id,
        fee_structure_id: fs.id,
        total_fee: total,
        discount_amount: 0,
        paid_amount: 0,
        balance_amount: total,
        payment_status: "Pending" as const,
        term_status: buildTermStatusFromStructure(terms, fs.fee_frequency, today),
      }));

    if (rows.length === 0) return { assigned: 0, skipped: studentIds.length };

    const { error: iErr } = await supabase.from("student_fees").insert(rows);
    if (iErr) throw iErr;

    return { assigned: rows.length, skipped: studentIds.length - rows.length };
  },

  /** Assign a single student to a structure (or re-assign / generate terms). */
  async assignStructureToStudent(args: {
    student_id: string;
    fee_structure_id: string;
    start_date?: string;
  }): Promise<StudentFee> {
    const { data: fs, error: fsErr } = await supabase
      .from("fee_structures")
      .select("id, total_amount, fee_frequency, term_details")
      .eq("id", args.fee_structure_id)
      .maybeSingle();
    if (fsErr) throw fsErr;
    if (!fs) throw new Error("Fee structure not found.");

    const terms = Array.isArray(fs.term_details) ? (fs.term_details as TermDetail[]) : [];
    const total = Number(fs.total_amount);
    const start = args.start_date || todayISO();
    const termStatus = buildTermStatusFromStructure(terms, fs.fee_frequency, start);

    // Upsert by student_id (UNIQUE).
    const { data: existing } = await supabase
      .from("student_fees")
      .select("id, paid_amount")
      .eq("student_id", args.student_id)
      .maybeSingle();

    const paid = Number(existing?.paid_amount ?? 0);

    if (existing) {
      const { data, error } = await supabase
        .from("student_fees")
        .update({
          fee_structure_id: fs.id,
          total_fee: total,
          balance_amount: Math.max(0, total - paid),
          payment_status: paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending",
          term_status: termStatus,
        })
        .eq("student_id", args.student_id)
        .select("*")
        .single();
      if (error) throw error;
      return normaliseStudentFee(data as Record<string, unknown>);
    }

    const { data, error } = await supabase
      .from("student_fees")
      .insert([{
        student_id: args.student_id,
        fee_structure_id: fs.id,
        total_fee: total,
        discount_amount: 0,
        paid_amount: 0,
        balance_amount: total,
        payment_status: "Pending" as const,
        term_status: termStatus,
      }])
      .select("*")
      .single();
    if (error) throw error;
    return normaliseStudentFee(data as Record<string, unknown>);
  },

  // ── Payments ────────────────────────────────────────────────────
  async recordPayment(input: PaymentTransactionInsert): Promise<PaymentTransaction> {
    const userId = input.recorded_by ?? (await resolveUserId()) ?? null;

    // Apply the payment to the named term in term_status (if provided) before
    // inserting the transaction. The DB trigger updates the aggregate row.
    if (input.term_name) {
      const { data: sf } = await supabase
        .from("student_fees")
        .select("term_status")
        .eq("student_id", input.student_id)
        .maybeSingle();
      if (sf && Array.isArray(sf.term_status)) {
        const terms = (sf.term_status as TermStatus[]).map((t) =>
          t.term_name === input.term_name
            ? { ...t, amount_paid: Number(t.amount_paid) + Number(input.amount_paid) }
            : t,
        );
        await supabase
          .from("student_fees")
          .update({ term_status: recomputeTermStatuses(terms) })
          .eq("student_id", input.student_id);
      }
    }

    const stamped = {
      student_id: input.student_id,
      amount_paid: input.amount_paid,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      transaction_id: input.transaction_id ?? null,
      remarks: input.remarks ?? null,
      recorded_by: userId,
    };

    const { data, error } = await supabase
      .from("payment_transactions")
      .insert([stamped])
      .select("*, students(id, full_name, admission_number, campus_id, course_id, courses(id, name), campuses(id, name))")
      .single();
    if (error) throw error;
    return data as PaymentTransaction;
  },

  async listPayments(filters: FeeFilters): Promise<PaymentTransaction[]> {
    let q = supabase
      .from("payment_transactions")
      .select(
        "*, students!inner(id, full_name, admission_number, campus_id, course_id, courses(id, name), campuses(id, name), parents(phone_number, username))",
      )
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.method !== "All") q = q.eq("payment_method", filters.method);
    if (filters.course_id) q = q.eq("students.course_id", filters.course_id);
    if (filters.campus_id) q = q.eq("students.campus_id", filters.campus_id);
    if (filters.date_from) q = q.gte("payment_date", filters.date_from);
    if (filters.date_to) q = q.lte("payment_date", filters.date_to);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as PaymentTransaction[];
    if (filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      const digits = s.replace(/\D+/g, "");
      rows = rows.filter((r) => {
        const n = r.students?.full_name?.toLowerCase() ?? "";
        const a = (r.students?.admission_number ?? "").toLowerCase();
        const t = (r.transaction_id ?? "").toLowerCase();
        const phone = ((r.students as { parents?: { phone_number?: string | null } | null })?.parents?.phone_number ?? "").replace(/\D+/g, "");
        if (n.includes(s) || a.includes(s) || t.includes(s)) return true;
        if (digits && phone.includes(digits)) return true;
        return false;
      });
    }
    return rows;
  },

  async getPayment(id: string): Promise<PaymentTransaction | null> {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(
        "*, students(id, full_name, admission_number, campus_id, course_id, courses(id, name), campuses(id, name))",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PaymentTransaction | null;
  },

  async listStudentPayments(student_id: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("student_id", student_id)
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PaymentTransaction[];
  },

  // ── Dashboard stats ─────────────────────────────────────────────
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
    const todayISOStr = today.toISOString().slice(0, 10);

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
        .eq("payment_date", todayISOStr),
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

  async getCampusRevenue(): Promise<{ campus_id: string; campus: string; collected: number; pending: number }[]> {
    const [campusesQ, feesQ] = await Promise.all([
      supabase.from("campuses").select("id, name").eq("is_active", true),
      supabase
        .from("student_fees")
        .select("paid_amount, balance_amount, students!inner(campus_id)"),
    ]);
    if (campusesQ.error) throw campusesQ.error;
    if (feesQ.error) throw feesQ.error;

    type Row = {
      paid_amount: number;
      balance_amount: number;
      students: { campus_id: string | null } | null;
    };

    const totals = new Map<string, { collected: number; pending: number }>();
    for (const r of (feesQ.data as unknown as Row[]) ?? []) {
      const id = r.students?.campus_id ?? null;
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

  async addManualFeeItem(args: {
    student_id: string;
    name: string;
    amount: number;
    due_date: string;
  }): Promise<StudentFee> {
    const { data: sf } = await supabase
      .from("student_fees")
      .select("*")
      .eq("student_id", args.student_id)
      .maybeSingle();

    const newTerm: TermStatus = {
      term_name: args.name.trim(),
      amount_due: Number(args.amount) || 0,
      amount_paid: 0,
      status: "Pending",
      due_date: args.due_date,
    };

    if (sf) {
      const currentTerms = Array.isArray(sf.term_status) ? (sf.term_status as TermStatus[]) : [];
      const updatedTerms = [...currentTerms, newTerm];
      
      const newTotal = Number(sf.total_fee) + newTerm.amount_due;
      const newPaid = Number(sf.paid_amount);
      const newBalance = Math.max(0, newTotal - newPaid);
      const newStatus = newBalance === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";

      const { data, error } = await supabase
        .from("student_fees")
        .update({
          total_fee: newTotal,
          balance_amount: newBalance,
          payment_status: newStatus,
          term_status: updatedTerms,
        })
        .eq("student_id", args.student_id)
        .select("*")
        .single();
      if (error) throw error;
      return normaliseStudentFee(data as Record<string, unknown>);
    } else {
      const { data, error } = await supabase
        .from("student_fees")
        .insert([{
          student_id: args.student_id,
          fee_structure_id: null,
          total_fee: newTerm.amount_due,
          discount_amount: 0,
          paid_amount: 0,
          balance_amount: newTerm.amount_due,
          payment_status: "Pending" as const,
          term_status: [newTerm],
        }])
        .select("*")
        .single();
      if (error) throw error;
      return normaliseStudentFee(data as Record<string, unknown>);
    }
  },
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
