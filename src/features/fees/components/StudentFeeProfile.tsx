"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Wallet, Loader2, Receipt as ReceiptIcon, X, Plus, Percent, Pencil } from "lucide-react";
import {
  useAssignStructureToStudent,
  useFeeStructures,
  useStudentFeesForStudent,
  useStudentPayments,
  useAddManualFeeItem,
  useRecordPayment,
  useApplyDiscount,
  useUpdateStudentTermStatus,
} from "../hooks";
import {
  formatINR,
  nextDueTerm,
  PaymentStatus,
  recomputeTermStatuses,
  TermStatus,
  todayISO,
  PaymentMethod,
  PAYMENT_METHODS,
} from "../types";
import { Card, EmptyState, fieldCls, Label, StatusPill, ToastStack, useToasts } from "./ui";

interface Props {
  studentId: string;
  campusId?: string | null;
  courseId?: string | null;
}

/**
 * Student-profile fee tab: shows the assigned structure, term-wise status,
 * payment history and the next due term. If no structure assigned, lets the
 * admin pick a matching one (filtered by the student's campus + course).
 */
export function StudentFeeProfile({ studentId, campusId, courseId }: Props) {
  const { toasts, add, dismiss } = useToasts();
  const { data: fees = [], isLoading: feeLoading } = useStudentFeesForStudent(studentId);

  const addManualFee = useAddManualFeeItem();
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermStatus | null>(null);
  const [collectTerm, setCollectTerm] = useState<string>("auto");
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Active structure row — the chosen one, else the first.
  const sf = fees.find((f) => f.id === selectedFeeId) ?? fees[0] ?? null;
  const { data: payments = [], isLoading: payLoading } = useStudentPayments(studentId, sf?.id);

  const terms = useMemo<TermStatus[]>(
    () => recomputeTermStatuses(sf?.term_status ?? []),
    [sf?.term_status],
  );
  const next = nextDueTerm(terms);

  if (feeLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const handleAddManualFee = (name: string, amount: number, dueDate: string) => {
    addManualFee.mutate(
      { student_id: studentId, name, amount, due_date: dueDate, student_fee_id: sf?.id },
      {
        onSuccess: () => {
          add("success", `Charged manual fee "${name}" of ${formatINR(amount)}.`);
          setIsManualOpen(false);
        },
        onError: (err) => {
          add("error", err instanceof Error ? err.message : "Failed to charge manual fee.");
        },
      }
    );
  };

  const closeCollect = () => {
    setIsCollectOpen(false);
    setCollectTerm("auto");
  };

  if (!sf || assigning) {
    return (
      <>
        <ToastStack toasts={toasts} onDismiss={dismiss} />
        {assigning && fees.length > 0 && (
          <button
            onClick={() => setAssigning(false)}
            className="mb-3 text-[11px] font-bold text-slate-500 hover:text-slate-700"
          >
            ← Back to fees
          </button>
        )}
        <AssignStructure
          studentId={studentId}
          campusId={campusId}
          courseId={courseId}
          onToast={add}
          onSuccess={(newFeeId) => {
            setAssigning(false);
            if (newFeeId) setSelectedFeeId(newFeeId);
            setIsCollectOpen(true);
          }}
          onAddManual={() => setIsManualOpen(true)}
        />
        <ManualFeeModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
          onSubmit={handleAddManualFee}
          pending={addManualFee.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <ManualFeeModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onSubmit={handleAddManualFee}
        pending={addManualFee.isPending}
      />
      <CollectPaymentModal
        isOpen={isCollectOpen}
        onClose={closeCollect}
        row={sf}
        onToast={add}
        defaultTerm={collectTerm}
      />
      <EditTermModal
        isOpen={!!editingTerm}
        onClose={() => setEditingTerm(null)}
        studentId={studentId}
        studentFeeId={sf.id}
        term={editingTerm}
        onToast={add}
      />

      {/* Structure selector — one tab per assigned structure */}
      <div className="flex flex-wrap items-center gap-2">
        {fees.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFeeId(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              f.id === sf.id
                ? "bg-[#0B3C5D] text-white border-[#0B3C5D]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#0B3C5D]/40"
            }`}
          >
            {f.fee_structures?.name ?? "Manual fees"}
            <span className={`ml-1.5 ${f.id === sf.id ? "text-blue-100" : "text-slate-400"}`}>
              {formatINR(f.balance_amount)}
            </span>
          </button>
        ))}
        <button
          onClick={() => setAssigning(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-300 text-[#0B3C5D] hover:bg-slate-50 inline-flex items-center gap-1"
        >
          <Plus size={12} /> Assign structure
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat label="Total Fee" value={formatINR(sf.total_fee)} tone="slate" />
        <SummaryStat label="Paid" value={formatINR(sf.paid_amount)} tone="emerald" />
        <SummaryStat label="Balance" value={formatINR(sf.balance_amount)} tone="rose" />
        <SummaryStat
          label="Status"
          value={sf.payment_status}
          tone={sf.payment_status === "Paid" ? "emerald" : sf.payment_status === "Overdue" ? "rose" : "amber"}
        />
      </div>

      {next && (
        <Card className="p-4 flex items-start gap-3 border-amber-200 bg-amber-50/40">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
            <Calendar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Next Due
            </p>
            <p className="text-sm font-black text-slate-800 truncate">
              {next.term_name} · {formatINR(Math.max(0, next.amount_due - next.amount_paid))}
            </p>
            <p className="text-[11px] text-slate-500 font-bold">
              Due {next.due_date}
            </p>
          </div>
          <StatusPill status={next.status} />
        </Card>
      )}

      {/* Term timeline */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">Term-wise Status</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollectOpen(true)}
              className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1 hover:underline"
            >
              + Collect Payment
            </button>
            <span className="text-[11px] text-slate-400">·</span>
            <button
              onClick={() => setIsManualOpen(true)}
              className="text-[11px] font-bold text-[#0B3C5D] inline-flex items-center gap-1 hover:underline"
            >
              + Add Manual Fee
            </button>
            <span className="text-[11px] text-slate-400">·</span>
            <span className="text-[11px] text-slate-400">{terms.length} terms</span>
          </div>
        </div>
        {terms.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={22} />}
            title="No terms on this fee"
            hint="The structure does not define any terms yet."
          />
        ) : (
          <ul>
            {terms.map((t, i) => (
              <TermRow
                key={i}
                term={t}
                onEdit={() => setEditingTerm(t)}
                onCollect={() => {
                  setCollectTerm(t.term_name);
                  setIsCollectOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Payment history */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">Payment History</p>
          <p className="text-[11px] text-slate-400">{payments.length} payments</p>
        </div>
        {payLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} />}
            title="No payments yet"
            hint="Payments recorded for this student will show up here."
          />
        ) : (
          <ul>
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {p.payment_method}
                    {p.transaction_id ? <span className="text-slate-400 font-mono"> · {p.transaction_id}</span> : null}
                  </p>
                  <p className="text-[11px] text-slate-400">{p.payment_date}</p>
                </div>
                <p className="text-sm font-black text-emerald-600 tabular-nums">
                  +{formatINR(p.amount_paid)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({
  label, value, tone,
}: { label: string; value: string; tone: "slate" | "emerald" | "rose" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <Card className={`p-3 border ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-base font-black tabular-nums truncate">{value}</p>
    </Card>
  );
}

function TermRow({
  term,
  onEdit,
  onCollect,
}: {
  term: TermStatus;
  onEdit: () => void;
  onCollect: () => void;
}) {
  const due = Number(term.amount_due) || 0;
  const paid = Number(term.amount_paid) || 0;
  const pct = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0;
  const icon = iconForStatus(term.status);
  return (
    <li className="px-4 py-3 border-b border-slate-50 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg(term.status)}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800 truncate">{term.term_name}</p>
            <div className="flex items-center gap-2">
              <StatusPill status={term.status} />
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <button
                  onClick={onCollect}
                  disabled={term.status === "Paid"}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-30"
                  title="Collect for this term"
                >
                  <Wallet size={13} />
                </button>
                <button
                  onClick={onEdit}
                  className="p-1 text-[#0B3C5D] hover:bg-blue-50 rounded-lg"
                  title="Edit term details"
                >
                  <Pencil size={13} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
            <span className="text-slate-400 tabular-nums">Due {term.due_date}</span>
            <span className="tabular-nums font-bold text-slate-600">
              {formatINR(paid)} <span className="text-slate-400 font-normal">/ {formatINR(due)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barTone(term.status)}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </li>
  );
}

function iconForStatus(s: PaymentStatus) {
  if (s === "Paid") return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (s === "Overdue") return <ShieldAlert size={16} className="text-rose-600" />;
  if (s === "Partial") return <AlertTriangle size={16} className="text-amber-600" />;
  return <Clock size={16} className="text-slate-500" />;
}
function iconBg(s: PaymentStatus) {
  if (s === "Paid") return "bg-emerald-50";
  if (s === "Overdue") return "bg-rose-50";
  if (s === "Partial") return "bg-amber-50";
  return "bg-slate-50";
}
function barTone(s: PaymentStatus) {
  if (s === "Paid") return "bg-emerald-500";
  if (s === "Overdue") return "bg-rose-500";
  if (s === "Partial") return "bg-amber-400";
  return "bg-slate-300";
}

// ── No-structure assign UI ──────────────────────────────────────
function AssignStructure({
  studentId, campusId, courseId, onToast, onSuccess, onAddManual,
}: {
  studentId: string;
  campusId?: string | null;
  courseId?: string | null;
  onToast: (t: "success" | "error", m: string) => void;
  onSuccess: (newFeeId?: string) => void;
  onAddManual: () => void;
}) {
  const { data: structures = [], isLoading } = useFeeStructures({
    campus_id: campusId ?? "",
    course_id: courseId ?? "",
  });
  const assign = useAssignStructureToStudent();
  const [picked, setPicked] = useState<string>("");
  const [startDate, setStartDate] = useState(todayISO());

  const onAssign = () => {
    if (!picked) {
      onToast("error", "Pick a fee structure first.");
      return;
    }
    assign.mutate(
      { student_id: studentId, fee_structure_id: picked, start_date: startDate },
      {
        onSuccess: (sf) => {
          onToast("success", "Fee structure assigned.");
          onSuccess(sf?.id);
        },
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Assign failed."),
      },
    );
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <p className="text-sm font-black text-slate-800">No fee structure assigned</p>
        <p className="text-[11px] text-slate-400">
          Pick a structure that matches this student's campus and course.
        </p>
      </div>

      {isLoading ? (
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      ) : structures.length === 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          No structures match this student's campus/course. Create one on the Fees → Structures page first.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>Structure</Label>
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className={fieldCls}
            >
              <option value="">Select…</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.courses?.name ?? "Untitled"} · {s.fee_frequency} · {formatINR(s.total_amount)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Term Start Date</Label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldCls}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onAssign}
          disabled={assign.isPending || !structures.length}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {assign.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
          Assign Structure
        </button>
        <span className="text-xs text-slate-400 font-medium">or</span>
        <button
          type="button"
          onClick={onAddManual}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 hover:bg-[#0B3C5D]/20 rounded-xl transition-all"
        >
          Add Manual Fee Item
        </button>
      </div>
    </Card>
  );
}

function ManualFeeModal({
  isOpen,
  onClose,
  onSubmit,
  pending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, amount: number, dueDate: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || !dueDate) return;
    onSubmit(name.trim(), Number(amount), dueDate);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Add Manual Fee Item</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Charge a one-off fee (e.g. Library, Books) without recurring conditions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <Label>Fee Name</Label>
              <input
                type="text"
                placeholder="e.g. Library Fee, Uniform Fee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldCls}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹)</Label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={fieldCls}
                  min="1"
                  required
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldCls}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-lg
                         hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20 disabled:opacity-60
                         disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add Fee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CollectPaymentModal({
  isOpen,
  onClose,
  row,
  onToast,
  defaultTerm = "auto",
}: {
  isOpen: boolean;
  onClose: () => void;
  row: any;
  onToast: (t: "success" | "error", m: string) => void;
  defaultTerm?: string;
}) {
  const record = useRecordPayment();
  const discount = useApplyDiscount();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [txnId, setTxnId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [termName, setTermName] = useState(defaultTerm);

  const [discountAmt, setDiscountAmt] = useState(String(row?.discount_amount ?? 0));

  useEffect(() => {
    if (row) {
      setDiscountAmt(String(row.discount_amount ?? 0));
      setTermName(defaultTerm);
      if (defaultTerm !== "auto") {
        const termObj = row.term_status?.find((t: any) => t.term_name === defaultTerm);
        if (termObj) {
          const termDue = Math.max(0, termObj.amount_due - termObj.amount_paid);
          setAmount(String(termDue));
        }
      } else {
        setAmount("");
      }
    }
  }, [row, isOpen, defaultTerm]);

  if (!isOpen || !row) return null;

  const balance = Number(row.balance_amount);

  const handleSubmit = (e: React.FormEvent) => {
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
        student_fee_id: row.id,
        amount_paid: amt,
        payment_method: method,
        payment_date: date,
        transaction_id: txnId.trim() || null,
        remarks: remarks.trim() || null,
        term_name: termName === "auto" ? null : termName,
      },
      {
        onSuccess: () => {
          onToast("success", `Recorded ${formatINR(amt)} payment.`);
          onClose();
          setAmount("");
          setTxnId("");
          setRemarks("");
        },
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
    const originalGross = Number(row.total_fee) + Number(row.discount_amount);
    const newTotal = Math.max(0, originalGross - d);
    discount.mutate(
      { student_fee_id: row.id, new_total: newTotal, new_discount: d },
      {
        onSuccess: () => onToast("success", "Discount applied."),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Discount failed."),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Collect Fees</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record a payment or apply a discount for this student.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <Label>Apply to Term</Label>
              <select
                value={termName}
                onChange={(e) => {
                  setTermName(e.target.value);
                  if (e.target.value !== "auto") {
                    const termObj = row.term_status?.find((t: TermStatus) => t.term_name === e.target.value);
                    if (termObj) {
                      const termDue = Math.max(0, termObj.amount_due - termObj.amount_paid);
                      setAmount(String(termDue));
                    }
                  } else {
                    setAmount("");
                  }
                }}
                className={fieldCls}
              >
                <option value="auto">Auto-allocate (FIFO)</option>
                {row.term_status?.map((t: TermStatus) => (
                  <option key={t.term_name} value={t.term_name}>
                    {t.term_name} — {formatINR(Math.max(0, t.amount_due - t.amount_paid))} due (Total: {formatINR(t.amount_due)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹)</Label>
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
                <Label>Payment Method</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className={fieldCls}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Date</Label>
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
                <Label>Transaction ID (optional)</Label>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  className={fieldCls}
                  placeholder="UPI ref / cheque no."
                />
              </div>
            </div>

            <div>
              <Label>Remarks (optional)</Label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className={fieldCls}
                placeholder="e.g. May instalment"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-end gap-2.5">
              <div className="flex-1">
                <Label>Discount (₹)</Label>
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-[#0B3C5D] bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                {discount.isPending ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
                Apply Discount
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={record.isPending || balance <= 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg
                         hover:bg-emerald-700 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-60
                         disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {record.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Wallet size={14} />
              )}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTermModal({
  isOpen,
  onClose,
  studentId,
  studentFeeId,
  term,
  onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentFeeId: string;
  term: TermStatus | null;
  onToast: (t: "success" | "error", m: string) => void;
}) {
  const updateTerm = useUpdateStudentTermStatus();
  const [amountDue, setAmountDue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (term) {
      setAmountDue(String(term.amount_due));
      setAmountPaid(String(term.amount_paid));
      setDueDate(term.due_date ?? "");
    }
  }, [term, isOpen]);

  if (!isOpen || !term) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const due = Number(amountDue);
    const paid = Number(amountPaid);
    if (!Number.isFinite(due) || due < 0) {
      onToast("error", "Amount due must be ≥ 0.");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      onToast("error", "Amount paid must be ≥ 0.");
      return;
    }

    updateTerm.mutate(
      {
        student_id: studentId,
        student_fee_id: studentFeeId,
        term_name: term.term_name,
        patch: { amount_due: due, amount_paid: paid, due_date: dueDate },
      },
      {
        onSuccess: () => {
          onToast("success", `Updated term "${term.term_name}" details.`);
          onClose();
        },
        onError: (err) => {
          onToast("error", err instanceof Error ? err.message : "Update failed.");
        },
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Edit Term Fee</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize fee amounts and due dates for term: <span className="font-bold">{term.term_name}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <Label>Amount Due (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  value={amountDue}
                  onChange={(e) => setAmountDue(e.target.value)}
                  className={`${fieldCls} pl-7`}
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Amount Paid (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className={`${fieldCls} pl-7`}
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTerm.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-lg
                         hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20 disabled:opacity-60
                         disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {updateTerm.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Pencil size={14} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
