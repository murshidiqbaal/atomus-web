"use client";

import React from "react";
import { CheckCircle2, XCircle, Receipt } from "lucide-react";
import { ICONS } from "../types";

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

export function Card({
  children, className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label, value, icon, accent = "bg-[#0B3C5D]", sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${accent} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon, title, hint, action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="py-16 text-center border-2 border-dashed">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export const fieldCls =
  "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all";

export function Label({
  children, optional,
}: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
      {children}
      {optional && (
        <span className="ml-1 normal-case font-normal text-slate-300 tracking-normal">
          (optional)
        </span>
      )}
    </label>
  );
}

export function PrimaryButton({
  children, onClick, type = "button", disabled, className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white
                 bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20
                 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children, onClick, className = "", type = "button", disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600
                  bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function CategoryDot({
  icon, color, size = "md",
}: {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const Cls = (icon && ICONS[icon]) ? ICONS[icon] : Receipt;
  const dims = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const ico  = size === "sm" ? 13 : size === "lg" ? 18 : 15;
  return (
    <div
      className={`${dims} rounded-xl text-white flex items-center justify-center shrink-0`}
      style={{ backgroundColor: color ?? "#0B3C5D" }}
    >
      <Cls size={ico} />
    </div>
  );
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatINRCompact(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount || 0);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
