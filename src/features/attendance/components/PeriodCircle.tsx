"use client";

import { memo } from "react";
import type { AttendanceStatus } from "../types";
import { STATUS_CFG } from "./ui";

interface Props {
  status: AttendanceStatus;
  label: string;          // short label above the circle, e.g. "H1"
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;      // true while debounce-save is in flight for this cell
  size?: "sm" | "md";
}

/**
 * Tap-to-cycle attendance indicator for a single (student, period) cell.
 * Renders the period short-label above and a coloured circle below — the
 * circle is the tap target (44px on `md`, 36px on `sm` to keep mobile thumbs
 * happy).
 */
function PeriodCircleImpl({
  status, label, onClick, disabled, pending, size = "md",
}: Props) {
  const cfg = STATUS_CFG[status];
  const dim = size === "sm" ? "w-9 h-9 text-[11px]" : "w-11 h-11 text-xs";
  const isUnmarked = status === "Unmarked";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${cfg.label}`}
      title={`${label} · ${cfg.label}`}
      className={`group flex flex-col items-center gap-1 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
        {label}
      </span>
      <span
        className={`relative ${dim} rounded-full flex items-center justify-center
          font-black border transition-all duration-150
          ${disabled ? "" : "active:scale-90 group-hover:shadow-md"}
          ${isUnmarked
            ? "bg-white border-dashed border-slate-300 text-slate-400"
            : `${cfg.bg} ${cfg.text} border-transparent shadow-sm ring-2 ring-offset-2 ${cfg.ring}`}`}
      >
        {cfg.short}
        {pending && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#0B3C5D] border-2 border-white animate-pulse" />
        )}
      </span>
    </button>
  );
}

export const PeriodCircle = memo(PeriodCircleImpl);
