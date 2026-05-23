"use client";

import { memo, useState } from "react";
import {
  CreditCard, Percent, Loader2, Wallet, Users,
} from "lucide-react";
import { useApplyDiscount, useRecordPayment, useStudentFees, useUpdatePaymentStatus } from "../hooks";
import {
  FeeFilters, PAYMENT_METHODS, PaymentMethod, StudentFee, formatINR, todayISO, PAYMENT_STATUSES,
} from "../types";
import { Card, EmptyState, fieldCls, Label } from "./ui";

interface Props {
  filters: FeeFilters;
  onToast: (type: "success" | "error", msg: string) => void;
  onPaid?: (studentId: string) => void;
}

export function StudentFeesSection({ filters, onToast }: Props) {
  const { data: rows = [], isLoading } = useStudentFees(filters);
  const [openFor, setOpenFor] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users size={26} />}
        title="No student fees yet"
        hint="Create a fee structure and assign it from the Structures tab."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <StudentFeeCard
          key={row.id}
          row={row}
          expanded={openFor === row.student_id}
          onToggle={() =>
            setOpenFor((cur) => (cur === row.student_id ? null : row.student_id))
          }
          onToast={onToast}
        />
      ))}
    </ul>
  );
}

interface CardProps {
  row: StudentFee;
  expanded: boolean;
  onToggle: () => void;
  onToast: (t: "success" | "error", m: string) => void;
}

export const StudentFeeCard = memo(function StudentFeeCardImpl({
  row, expanded, onToggle, onToast,
}: CardProps) {
  const updateStatus = useUpdatePaymentStatus();
  const studentName = row.students?.full_name ?? "Unknown";
  const course = row.students?.courses?.name ?? "—";
  const campus = row.students?.campuses?.name ?? "—";
  const pct = Number(row.total_fee) > 0
    ? Math.min(100, Math.round((Number(row.paid_amount) / Number(row.total_fee)) * 100))
    : 0;

  return (
    <li>
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-3 min-w-0 md:w-64 md:shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-xs font-black shrink-0">
              {studentName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800 truncate leading-tight">
                {studentName}
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                {row.students?.admission_number ?? "—"} · {course} · {campus}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 flex-1 md:max-w-[420px]">
            <Metric label="Total" value={formatINR(row.total_fee)} tone="slate" />
            <Metric label="Paid" value={formatINR(row.paid_amount)} tone="emerald" />
            <Metric label="Balance" value={formatINR(row.balance_amount)} tone="rose" />
          </div>

          <div className="flex items-center gap-2 md:shrink-0">
            <select
              value={row.payment_status}
              onChange={(e) => updateStatus.mutate(
                { student_id: row.student_id, status: e.target.value },
                {
                  onSuccess: () => onToast("success", `Updated payment status to ${e.target.value}.`),
                  onError: (err) => onToast("error", err instanceof Error ? err.message : "Update failed."),
                }
              )}
              disabled={updateStatus.isPending}
              className="text-xs font-black border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#0B3C5D] cursor-pointer bg-white text-slate-700 shadow-sm hover:border-slate-300 transition-colors"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all"
            >
              <CreditCard size={13} />
              {expanded ? "Close" : "Collect"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {expanded && (
          <CollectPanel row={row} onToast={(t, m) => { onToast(t, m); if (t === "success") onToggle(); }} />
        )}
      </Card>
    </li>
  );
});

function Metric({
  label, value, tone,
}: { label: string; value: string; tone: "slate" | "emerald" | "rose" }) {
  const tones: Record<string, string> = {
    slate: "text-slate-800",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  };
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className={`text-sm font-black tabular-nums truncate ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function CollectPanel({
  row, onToast,
}: { row: StudentFee; onToast: (t: "success" | "error", m: string) => void }) {
  const record = useRecordPayment();
  const discount = useApplyDiscount();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [txnId, setTxnId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");

  const [discountAmt, setDiscountAmt] = useState(String(row.discount_amount ?? 0));

  const balance = Number(row.balance_amount);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onToast("error", "Enter a positive amount.");
      return;
    }
    if (amt > balance) {
      onToast("error", `Amount exceeds balance (${formatINR(balance)}).`);
      return;
    }
    record.mutate(
      {
        student_id: row.student_id,
        amount_paid: amt,
        payment_method: method,
        payment_date: date,
        transaction_id: txnId.trim() || null,
        remarks: remarks.trim() || null,
      },
      {
        onSuccess: () => onToast("success", `Recorded ${formatINR(amt)}.`),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Payment failed."),
      },
    );
  };

  const applyDiscount = () => {
    const d = Number(discountAmt);
    if (!Number.isFinite(d) || d < 0) {
      onToast("error", "Discount must be ≥ 0.");
      return;
    }
    // Recompute total = original total - delta. Original total = current
    // total + current discount (since admin entered a *new* discount).
    const originalGross = Number(row.total_fee) + Number(row.discount_amount);
    const newTotal = Math.max(0, originalGross - d);
    discount.mutate(
      { student_id: row.student_id, new_total: newTotal, new_discount: d },
      {
        onSuccess: () => onToast("success", "Discount applied."),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Discount failed."),
      },
    );
  };

  return (
    <div className="p-4 bg-slate-50/60 border-t border-slate-100">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        <div className="md:col-span-1">
          <Label>Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} pl-7`}
              placeholder={String(Math.min(balance, 5000))}
              min="1"
              max={balance}
              required
            />
          </div>
        </div>
        <div>
          <Label>Method</Label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={fieldCls}
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label>Date</Label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className={fieldCls}
            required
          />
        </div>
        <div>
          <Label>Txn ID (optional)</Label>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            className={fieldCls}
            placeholder="UPI ref / cheque no."
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={record.isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {record.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
            Record Payment
          </button>
        </div>
        <div className="md:col-span-5">
          <Label>Remarks (optional)</Label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className={fieldCls}
            placeholder="e.g. May instalment"
          />
        </div>
      </form>

      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-end gap-2.5">
        <div className="w-32">
          <Label>Discount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={discountAmt}
              onChange={(e) => setDiscountAmt(e.target.value)}
              className={`${fieldCls} pl-7`}
              min="0"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={applyDiscount}
          disabled={discount.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-[#0B3C5D] bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
        >
          {discount.isPending ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
          Apply discount
        </button>
        <p className="text-[11px] text-slate-400 ml-auto">
          Adjusts <span className="font-bold">total fee</span> and recomputes balance.
        </p>
      </div>
    </div>
  );
}
