"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { AttendanceStatus } from "../types";

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
          {t.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <XCircle size={16} className="text-rose-500 shrink-0" />
          )}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-40 hover:opacity-80">
            ×
          </button>
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

export function Card({
  children, className = "",
}: { children: React.ReactNode; className?: string }) {
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

// ── Status presentation ───────────────────────────────────────────
export const STATUS_CFG: Record<AttendanceStatus, {
  bg: string;          // filled background (when "on")
  text: string;        // text color on the filled state
  ring: string;        // ring color for focus/active
  soft: string;        // soft background used on idle circles
  border: string;      // border color on idle circles
  outline: string;     // unselected pill outline (legacy)
  rowTint: string;     // table row tint (legacy)
  label: string;
  short: string;
  key: string;
}> = {
  Present: {
    bg: "bg-emerald-500",
    text: "text-white",
    ring: "ring-emerald-200",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    outline: "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
    rowTint: "bg-emerald-50/30",
    label: "Present", short: "P", key: "P",
  },
  Absent: {
    bg: "bg-rose-500",
    text: "text-white",
    ring: "ring-rose-200",
    soft: "bg-rose-50",
    border: "border-rose-200",
    outline: "text-rose-600 border-rose-200 hover:bg-rose-50",
    rowTint: "bg-rose-50/30",
    label: "Absent", short: "A", key: "A",
  },
  Late: {
    bg: "bg-amber-400",
    text: "text-white",
    ring: "ring-amber-200",
    soft: "bg-amber-50",
    border: "border-amber-200",
    outline: "text-amber-600 border-amber-200 hover:bg-amber-50",
    rowTint: "bg-amber-50/30",
    label: "Late", short: "L", key: "L",
  },
  Leave: {
    bg: "bg-sky-500",
    text: "text-white",
    ring: "ring-sky-200",
    soft: "bg-sky-50",
    border: "border-sky-200",
    outline: "text-sky-600 border-sky-200 hover:bg-sky-50",
    rowTint: "bg-sky-50/30",
    label: "Leave", short: "LV", key: "V",
  },
  Unmarked: {
    bg: "bg-slate-200",
    text: "text-slate-500",
    ring: "ring-slate-200",
    soft: "bg-slate-50",
    border: "border-slate-200",
    outline: "text-slate-400 border-slate-200 hover:bg-slate-50",
    rowTint: "",
    label: "Unmarked", short: "—", key: "U",
  },
};
