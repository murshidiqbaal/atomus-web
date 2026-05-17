"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { PaymentStatus } from "../types";

// ── Toasts ────────────────────────────────────────────────────────
export type Toast = { id: number; type: "success" | "error"; message: string };

export function ToastStack({
  toasts, onDismiss,
}: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto
            ${t.type === "success"
              ? "bg-white border-emerald-200 text-emerald-800"
              : "bg-white border-rose-200 text-rose-800"}`}
        >
          {t.type === "success"
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : <XCircle size={16} className="text-rose-500 shrink-0" />}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-40 hover:opacity-80">×</button>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);
  const add = React.useCallback((type: Toast["type"], message: string) => {
    const id = ++idRef.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = React.useCallback(
    (id: number) => setToasts((p) => p.filter((t) => t.id !== id)),
    [],
  );
  return { toasts, add, dismiss };
}

// ── Card primitives ──────────────────────────────────────────────
export function Card({
  children, className = "",
}: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon, title, hint,
}: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <Card className="py-16 text-center border-2 border-dashed">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </Card>
  );
}

export const fieldCls =
  "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
      {children}
    </label>
  );
}

// ── Status pill ──────────────────────────────────────────────────
export const STATUS_PILL: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Partial: "bg-amber-50 text-amber-700 border-amber-200",
  Pending: "bg-slate-50 text-slate-600 border-slate-200",
  Overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

export function StatusPill({ status }: { status: PaymentStatus | string }) {
  const cls = STATUS_PILL[status as PaymentStatus] ?? STATUS_PILL.Pending;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cls}`}>
      {status}
    </span>
  );
}
