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

// ── Fee structure ────────────────────────────────────────────────
/**
 * Mirrors the `fee_structures` table. The current schema doesn't have
 * `name` / `fee_type` / `is_active` columns — we derive a human label
 * from the linked course + batch, and infer the cadence from
 * `installment_count` (1 = one-time, >1 = installment plan).
 */
export interface FeeStructure {
  id: string;
  course_id: string | null;
  batch_id: string | null;
  total_amount: number;
  admission_fee: number;
  monthly_fee: number;
  installment_count: number;
  due_date_day: number;       // day-of-month for monthly due
  created_at: string;

  // Joined (denormalised) on read
  courses?: { id: string; name: string } | null;
  batches?: { id: string; name: string; campus_id: string | null } | null;
}

export interface FeeStructureInsert {
  course_id: string;
  batch_id: string | null;
  total_amount: number;
  admission_fee: number;
  monthly_fee: number;
  installment_count: number;
  due_date_day: number;
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

  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    roll_number: string | null;
    course_id: string | null;
    batch_id: string | null;
    courses?: { id: string; name: string } | null;
    batches?: { id: string; name: string; campus_id: string | null } | null;
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
    course_id: string | null;
    batch_id: string | null;
    courses?: { id: string; name: string } | null;
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
}

// ── Filters ──────────────────────────────────────────────────────
export interface FeeFilters {
  campus_id: string;
  course_id: string;
  batch_id: string;
  status: PaymentStatus | "All";
  search: string;
  date_from: string;
  date_to: string;
  method: PaymentMethod | "All";
}

export function emptyFilters(): FeeFilters {
  return {
    campus_id: "",
    course_id: "",
    batch_id: "",
    status: "All",
    search: "",
    date_from: "",
    date_to: "",
    method: "All",
  };
}

// ── Helpers ──────────────────────────────────────────────────────
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Quarterly" / "Monthly" / "One Time" derived from installment_count. */
export function inferCadence(installmentCount: number): string {
  if (installmentCount <= 1) return "One Time";
  if (installmentCount === 4) return "Quarterly";
  if (installmentCount === 12) return "Monthly";
  return `${installmentCount} installments`;
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
