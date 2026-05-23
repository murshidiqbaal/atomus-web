"use client";

import { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Wallet, Loader2, Receipt as ReceiptIcon } from "lucide-react";
import {
  useAssignStructureToStudent,
  useFeeStructures,
  useStudentFee,
  useStudentPayments,
} from "../hooks";
import {
  formatINR,
  nextDueTerm,
  PaymentStatus,
  recomputeTermStatuses,
  TermStatus,
  todayISO,
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
  const { data: sf, isLoading: feeLoading } = useStudentFee(studentId);
  const { data: payments = [], isLoading: payLoading } = useStudentPayments(studentId);

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

  if (!sf) {
    return (
      <>
        <ToastStack toasts={toasts} onDismiss={dismiss} />
        <AssignStructure
          studentId={studentId}
          campusId={campusId}
          courseId={courseId}
          onToast={add}
        />
      </>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

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
          <p className="text-[11px] text-slate-400">{terms.length} terms</p>
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
              <TermRow key={i} term={t} />
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

function TermRow({ term }: { term: TermStatus }) {
  const due = Number(term.amount_due) || 0;
  const paid = Number(term.amount_paid) || 0;
  const pct = due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0;
  const icon = iconForStatus(term.status);
  return (
    <li className="px-4 py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg(term.status)}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800 truncate">{term.term_name}</p>
            <StatusPill status={term.status} />
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
  studentId, campusId, courseId, onToast,
}: {
  studentId: string;
  campusId?: string | null;
  courseId?: string | null;
  onToast: (t: "success" | "error", m: string) => void;
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
        onSuccess: () => onToast("success", "Fee structure assigned."),
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

      <button
        onClick={onAssign}
        disabled={assign.isPending || !structures.length}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {assign.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
        Assign Structure
      </button>
    </Card>
  );
}
