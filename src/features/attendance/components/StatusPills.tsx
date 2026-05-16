"use client";

import { memo } from "react";
import type { AttendanceStatus } from "../types";
import { STATUS_CFG } from "./ui";

const ACTIVE: AttendanceStatus[] = ["Present", "Absent", "Late"];

interface Props {
  value: AttendanceStatus;
  onChange: (next: AttendanceStatus) => void;
  size?: "sm" | "md";
}

/** Row of 3 pill buttons (P / A / L). Filled pill = current status. */
function StatusPillsImpl({ value, onChange, size = "md" }: Props) {
  const pad = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs";
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Attendance status">
      {ACTIVE.map((s) => {
        const cfg = STATUS_CFG[s];
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active ? "Unmarked" : s)}
            aria-pressed={active}
            title={`${cfg.label} (press ${cfg.key})`}
            className={`${pad} rounded-full font-black border transition-all active:scale-90
              ${active
                ? `${cfg.bg} ${cfg.text} border-transparent shadow-sm`
                : `bg-white ${cfg.outline}`}`}
          >
            {cfg.short}
          </button>
        );
      })}
    </div>
  );
}

export const StatusPills = memo(StatusPillsImpl);
