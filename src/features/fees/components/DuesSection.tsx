"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { useStudentFees } from "../hooks";
import { FeeFilters, formatINR } from "../types";
import { Card, EmptyState, StatusPill } from "./ui";
import { StudentFeeCard } from "./StudentFeesSection";

interface Props {
  filters: FeeFilters;
  onToast: (type: "success" | "error", msg: string) => void;
}

/**
 * Dues = anyone with balance > 0. Buckets:
 *   - Overdue / Partial / Pending (any non-zero balance)
 *
 * Pre-filters paid rows in JS so the same query (status=All) powers both
 * the summary cards and the list.
 */
export function DuesSection({ filters, onToast }: Props) {
  // Always pull the "All-status" slice; we bucket and filter client-side.
  const allFilters = useMemo(() => ({ ...filters, status: "All" as const }), [filters]);
  const { data: rows = [], isLoading } = useStudentFees(allFilters);

  const buckets = useMemo(() => {
    let overdue = 0, partial = 0, pending = 0, totalDue = 0;
    for (const r of rows) {
      const bal = Number(r.balance_amount);
      if (bal <= 0) continue;
      totalDue += bal;
      if (r.payment_status === "Overdue") overdue++;
      else if (r.payment_status === "Partial") partial++;
      else pending++;
    }
    return { overdue, partial, pending, totalDue };
  }, [rows]);

  const due = useMemo(
    () => rows.filter((r) => Number(r.balance_amount) > 0),
    [rows],
  );

  const [openFor, setOpenFor] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-24 animate-pulse" />)}
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="h-28 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DueCard
          label="Total Outstanding"
          value={formatINR(buckets.totalDue)}
          tone="amber"
          icon={<AlertCircle size={18} />}
        />
        <DueCard
          label="Overdue"
          value={String(buckets.overdue)}
          sub="students"
          tone="rose"
          icon={<ShieldAlert size={18} />}
        />
        <DueCard
          label="Partial"
          value={String(buckets.partial)}
          sub="students"
          tone="amber"
          icon={<AlertTriangle size={18} />}
        />
        <DueCard
          label="Pending"
          value={String(buckets.pending)}
          sub="students"
          tone="slate"
          icon={<Clock size={18} />}
        />
      </div>

      {due.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title="No dues 🎉"
          hint="Every student in the current filter has settled their balance."
        />
      ) : (
        <>
          <Card className="p-3 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
            <StatusPill status="Overdue" />
            <StatusPill status="Partial" />
            <StatusPill status="Pending" />
            <span className="ml-1">
              Showing students with non-zero balance. Use the campus/course/batch filters above to narrow.
            </span>
          </Card>

          <ul className="space-y-2.5">
            {due.map((row) => (
              <StudentFeeCard
                key={row.id}
                row={row}
                expanded={openFor === row.student_id}
                onToggle={() =>
                  setOpenFor((c) => (c === row.student_id ? null : row.student_id))
                }
                onToast={onToast}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DueCard({
  label, value, sub, tone, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "amber" | "rose" | "slate";
  icon: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <Card className={`p-4 border ${tones[tone]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/60">{icon}</div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-xl font-black tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] font-bold opacity-60 mt-0.5 uppercase">{sub}</p>}
    </Card>
  );
}
