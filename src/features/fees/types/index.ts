// ── Status ────────────────────────────────────────────────────────
export type PaymentStatus = "Paid" | "Pending" | "Partial" | "Overdue";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Paid", "Pending", "Partial", "Overdue",
];

// ── Payment methods ──────────────────────────────────────────────
export type PaymentMethod = "Cash" | "UPI" | "Card" | "Bank Transfer";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash", "UPI", "Card", "Bank Transfer",
];

// ── Fee frequency ────────────────────────────────────────────────
export type FeeFrequency = "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "Custom";

export const FEE_FREQUENCIES: FeeFrequency[] = [
  "Monthly", "Quarterly", "Half-Yearly", "Yearly", "Custom",
];

export const FREQUENCY_DEFAULT_COUNT: Record<FeeFrequency, number> = {
  Monthly: 12,
  Quarterly: 4,
  "Half-Yearly": 2,
  Yearly: 1,
  Custom: 3,
};

// ── Term shapes ──────────────────────────────────────────────────
/** Editable term on a fee structure (the template). */
export interface TermDetail {
  term_name: string;
  amount: number;
  due_day: number;        // 1–28
}

/** Per-student term tracking persisted on student_fees.term_status. */
export interface TermStatus {
  term_name: string;
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date: string;       // YYYY-MM-DD
}

// ── Fee structure ────────────────────────────────────────────────
/**
 * Mirrors the `fee_structures` table after fees_term_based.sql.
 * Legacy fields (monthly_fee, installment_count, due_date_day, batch_id,
 * applies_to_all_*) are retained for read-back of old rows but are not
 * written by the new flow.
 */
export interface FeeStructure {
  id: string;
  name: string | null;
  campus_id: string | null;
  course_id: string | null;
  fee_frequency: FeeFrequency;
  term_count: number;
  term_details: TermDetail[];
  total_amount: number;
  admission_fee: number;
  is_active: boolean;
  created_at: string;

  // Legacy / deprecated — readable, not written by new code
  batch_id?: string | null;
  monthly_fee?: number;
  installment_count?: number;
  due_date_day?: number;
  applies_to_all_campuses?: boolean;
  applies_to_all_batches?: boolean;

  // Joined (denormalised) on read
  campuses?: { id: string; name: string } | null;
  courses?: { id: string; name: string } | null;
  batches?: { id: string; name: string; campus_id: string | null } | null;
}

export interface FeeStructureInsert {
  name: string;
  campus_id: string | null;
  course_id: string;
  fee_frequency: FeeFrequency;
  term_count: number;
  term_details: TermDetail[];
  total_amount: number;
  admission_fee: number;
  is_active?: boolean;
  batch_id?: string | null;
  applies_to_all_campuses?: boolean;
  applies_to_all_batches?: boolean;
}

// ── Student fee ───────────────────────────────────────────────────
export interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string | null;
  total_fee: number;
  discount_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  last_payment_date: string | null;
  updated_at: string | null;
  term_status: TermStatus[];

  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    roll_number: string | null;
    campus_id: string | null;
    course_id: string | null;
    batch_id?: string | null;
    courses?: { id: string; name: string } | null;
    campuses?: { id: string; name: string } | null;
    batches?: { id: string; name: string; campus_id: string | null } | null;
    parents?: { phone_number: string | null; username: string | null } | null;
    academic_status?: string | null;
  } | null;
}

export interface StudentFeeInsert {
  student_id: string;
  fee_structure_id: string | null;
  total_fee: number;
  discount_amount?: number;
  paid_amount?: number;
  balance_amount: number;
  payment_status?: PaymentStatus;
  term_status?: TermStatus[];
}

// ── Payment transaction ──────────────────────────────────────────
export interface PaymentTransaction {
  id: string;
  student_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: PaymentMethod | string;
  transaction_id: string | null;
  remarks: string | null;
  recorded_by: string | null;
  created_at: string;

  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    campus_id: string | null;
    course_id: string | null;
    courses?: { id: string; name: string } | null;
    campuses?: { id: string; name: string } | null;
    batches?: { id: string; name: string; campus_id: string | null } | null;
  } | null;
}

export interface PaymentTransactionInsert {
  student_id: string;
  amount_paid: number;
  payment_date: string;     // YYYY-MM-DD
  payment_method: string;
  transaction_id?: string | null;
  remarks?: string | null;
  recorded_by?: string | null;
  /** Optional: name of the term this payment is applied to. */
  term_name?: string | null;
}

// ── Filters ──────────────────────────────────────────────────────
export interface FeeFilters {
  campus_id: string;
  course_id: string;
  status: PaymentStatus | "All";
  search: string;
  date_from: string;
  date_to: string;
  method: PaymentMethod | "All";
  academic_status: string;
}

export function emptyFilters(): FeeFilters {
  return {
    campus_id: "",
    course_id: "",
    status: "All",
    search: "",
    date_from: "",
    date_to: "",
    method: "All",
    academic_status: "Active",
  };
}

// ── Helpers ──────────────────────────────────────────────────────
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatINR(n: number | null | undefined): string {
  if (n == null) return "₹0";
  return `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
}

export function shortINR(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

/** Build a TermStatus[] from a structure's term_details, starting at the given date. */
export function buildTermStatusFromStructure(
  terms: TermDetail[],
  frequency: FeeFrequency,
  startDate: string,
): TermStatus[] {
  if (!terms.length) return [];
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1);

  const monthStep =
    frequency === "Monthly" ? 1 :
    frequency === "Quarterly" ? 3 :
    frequency === "Half-Yearly" ? 6 :
    frequency === "Yearly" ? 12 :
    1; // Custom: monthly spacing by default

  return terms.map((t, i) => {
    const due = new Date(start.getFullYear(), start.getMonth() + i * monthStep, 1);
    const lastDay = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
    const day = Math.min(Math.max(1, t.due_day || 10), lastDay);
    const dueDate = new Date(due.getFullYear(), due.getMonth(), day);
    return {
      term_name: t.term_name,
      amount_due: Number(t.amount) || 0,
      amount_paid: 0,
      status: "Pending",
      due_date: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`,
    };
  });
}

/** Recompute each term's status from amount_due/amount_paid + today. */
export function recomputeTermStatuses(terms: TermStatus[], today = new Date()): TermStatus[] {
  const todayISOStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return terms.map((t) => {
    const due = Number(t.amount_due) || 0;
    const paid = Number(t.amount_paid) || 0;
    let status: PaymentStatus = "Pending";
    if (paid >= due && due > 0) status = "Paid";
    else if (paid > 0) status = "Partial";
    if (status !== "Paid" && t.due_date && t.due_date < todayISOStr) status = "Overdue";
    return { ...t, status };
  });
}

/** Next unpaid term (Pending/Partial/Overdue), earliest due_date first. */
export function nextDueTerm(terms: TermStatus[]): TermStatus | null {
  const open = terms.filter((t) => t.status !== "Paid");
  if (!open.length) return null;
  return [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
}

/** "Quarterly" / "Monthly" / "One Time" derived from installment_count. */
export function inferCadence(installmentCount: number | null | undefined): string {
  const cnt = installmentCount ?? 1;
  if (cnt <= 1) return "One Time";
  if (cnt === 4) return "Quarterly";
  if (cnt === 12) return "Monthly";
  return `${cnt} installments`;
}
