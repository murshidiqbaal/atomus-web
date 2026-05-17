"use client";

import { Printer, X } from "lucide-react";
import type { PaymentTransaction, StudentFee } from "../types";
import { formatINR } from "../types";

interface Props {
  payment: PaymentTransaction;
  studentFee?: StudentFee | null;
  onClose: () => void;
}

/**
 * Printable receipt overlay. The body of `print-receipt` is the only thing
 * printed (see the @media print rules in globals.css fallback — we inline
 * via a <style> block to avoid touching the global stylesheet).
 */
export function Receipt({ payment, studentFee, onClose }: Props) {
  const studentName = payment.students?.full_name ?? "Student";
  const admission = payment.students?.admission_number ?? "—";
  const course = payment.students?.courses?.name ?? "—";
  const batch = payment.students?.batches?.name ?? "—";
  const receiptNo = `RCPT-${payment.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-receipt, #print-receipt * { visibility: visible !important; }
          #print-receipt {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
        <div
          id="print-receipt"
          className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        >
          <div className="no-print flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Receipt preview
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0B3C5D] rounded-lg hover:bg-[#0B3C5D]/90"
              >
                <Printer size={13} /> Print
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-black text-[#0B3C5D] tracking-tight">
                  ATOMUS.edu
                </h1>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Coaching Centre · Fee Receipt
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Receipt No.
                </p>
                <p className="text-sm font-black text-slate-800">{receiptNo}</p>
                <p className="text-[11px] text-slate-500">{payment.payment_date}</p>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Student */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Student">{studentName}</Field>
              <Field label="Adm. No.">{admission}</Field>
              <Field label="Course">{course}</Field>
              <Field label="Batch">{batch}</Field>
            </div>

            <hr className="border-slate-200" />

            {/* Amount */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Amount Received
              </p>
              <p className="text-3xl font-black text-emerald-700 tabular-nums leading-tight mt-1">
                {formatINR(payment.amount_paid)}
              </p>
              <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                via {payment.payment_method}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Txn ID">{payment.transaction_id ?? "—"}</Field>
              <Field label="Remarks">{payment.remarks ?? "—"}</Field>
            </div>

            {studentFee && (
              <>
                <hr className="border-slate-200" />
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Field label="Total Fee">{formatINR(studentFee.total_fee)}</Field>
                  <Field label="Paid">{formatINR(studentFee.paid_amount)}</Field>
                  <Field label="Balance" tone="rose">{formatINR(studentFee.balance_amount)}</Field>
                </div>
              </>
            )}

            <p className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100">
              This is a computer-generated receipt. No signature required.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label, children, tone = "slate",
}: { label: string; children: React.ReactNode; tone?: "slate" | "rose" }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-sm font-black ${tone === "rose" ? "text-rose-600" : "text-slate-800"}`}>
        {children}
      </p>
    </div>
  );
}
