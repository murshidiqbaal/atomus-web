"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight, History, Printer,
} from "lucide-react";
import { usePayments, useStudentFeesForStudent } from "../hooks";
import { FeeFilters, PaymentTransaction, formatINR } from "../types";
import { Card, EmptyState } from "./ui";
import { Receipt } from "./Receipt";

interface Props {
  filters: FeeFilters;
}

export function HistorySection({ filters }: Props) {
  const { data: rows = [], isLoading } = usePayments(filters);
  const [receiptFor, setReceiptFor] = useState<PaymentTransaction | null>(null);

  const totals = useMemo(() => {
    const sum = rows.reduce((a, r) => a + Number(r.amount_paid), 0);
    return { sum, count: rows.length };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<History size={26} />}
        title="No payments in range"
        hint="Adjust filters or record a payment from Quick Collect."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Transactions
          </p>
          <p className="text-base font-black text-slate-800 tabular-nums">{totals.count}</p>
        </div>
        <div className="ml-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
            Filtered Total
          </p>
          <p className="text-base font-black text-emerald-600 tabular-nums">
            {formatINR(totals.sum)}
          </p>
        </div>
      </Card>

      <ul className="space-y-2">
        {rows.map((tx) => (
          <HistoryRow key={tx.id} tx={tx} onReceipt={() => setReceiptFor(tx)} />
        ))}
      </ul>

      {receiptFor && (
        <ReceiptModal payment={receiptFor} onClose={() => setReceiptFor(null)} />
      )}
    </div>
  );
}

function HistoryRow({
  tx, onReceipt,
}: { tx: PaymentTransaction; onReceipt: () => void }) {
  const studentName = tx.students?.full_name ?? "—";
  const initials = studentName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <li>
      <Card className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black shrink-0">
            <ArrowDownRight size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-800 truncate">{studentName}</p>
              <span className="text-[10px] font-bold text-slate-400 font-mono shrink-0">
                {initials}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {tx.students?.admission_number ?? "—"} ·{" "}
              {tx.students?.courses?.name ?? "—"} ·{" "}
              <span className="font-bold uppercase tracking-wider">{tx.payment_method}</span>
            </p>
            {tx.remarks && (
              <p className="text-[11px] text-slate-500 truncate italic">{tx.remarks}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="text-right">
            <p className="text-sm font-black text-emerald-600 tabular-nums">
              +{formatINR(tx.amount_paid)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 tabular-nums">{tx.payment_date}</p>
          </div>
          <button
            onClick={onReceipt}
            title="Print receipt"
            className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Printer size={15} />
          </button>
        </div>
      </Card>
    </li>
  );
}

/** Wrapper that fetches the latest student_fees so the receipt can show the
 *  current balance. */
function ReceiptModal({
  payment, onClose,
}: { payment: PaymentTransaction; onClose: () => void }) {
  const { data: fees = [] } = useStudentFeesForStudent(payment.student_id);
  // Show the structure this payment belongs to; fall back to the first row.
  const sf = fees.find((f) => f.id === payment.student_fee_id) ?? fees[0] ?? null;
  return <Receipt payment={payment} studentFee={sf} onClose={onClose} />;
}

