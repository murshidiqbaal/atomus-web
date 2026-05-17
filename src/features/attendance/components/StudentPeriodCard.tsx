"use client";

import { memo } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import type { AttendanceStatus, Period, StudentLite } from "../types";
import { PeriodCircle } from "./PeriodCircle";

interface Props {
  student: StudentLite;
  periods: Period[];
  statusByPeriod: Record<number, AttendanceStatus>;
  pendingPeriods: Set<number>;
  disabled?: boolean;
  onCellTap: (studentId: string, periodNumber: number) => void;
  onMarkRow: (studentId: string, status: AttendanceStatus) => void;
  onResetRow: (studentId: string) => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StudentPeriodCardImpl({
  student, periods, statusByPeriod, pendingPeriods,
  disabled, onCellTap, onMarkRow, onResetRow,
}: Props) {
  return (
    <li className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        {/* Sticky-feeling student column. On mobile this stacks above; on
            wide screens it's pinned to the left of the circles. */}
        <div className="flex items-center gap-3 min-w-0 sm:w-56 sm:shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-[11px] font-black shrink-0">
            {initials(student.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">
              {student.full_name}
            </p>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              {student.roll_number ? `#${student.roll_number}` : "No roll #"}
            </p>
          </div>
        </div>

        {/* Period strip — horizontally scrollable on narrow screens, fills
            the remaining width otherwise. */}
        <div className="flex-1 min-w-0 overflow-x-auto -mx-1 px-1">
          <div className="flex items-end gap-2 sm:gap-3 py-1">
            {periods.map((p) => (
              <PeriodCircle
                key={p.number}
                status={statusByPeriod[p.number] ?? "Unmarked"}
                label={p.short}
                disabled={disabled}
                pending={pendingPeriods.has(p.number)}
                onClick={() => onCellTap(student.id, p.number)}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <QuickButton
            tone="emerald"
            label="Mark full day Present"
            onClick={() => onMarkRow(student.id, "Present")}
            disabled={disabled}
          >
            <CheckCircle2 size={14} />
          </QuickButton>
          <QuickButton
            tone="rose"
            label="Mark full day Absent"
            onClick={() => onMarkRow(student.id, "Absent")}
            disabled={disabled}
          >
            <XCircle size={14} />
          </QuickButton>
          <QuickButton
            tone="slate"
            label="Reset row"
            onClick={() => onResetRow(student.id)}
            disabled={disabled}
          >
            <RotateCcw size={13} />
          </QuickButton>
        </div>
      </div>
    </li>
  );
}

function QuickButton({
  tone, label, onClick, disabled, children,
}: {
  tone: "emerald" | "rose" | "slate";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    rose: "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 inline-flex items-center justify-center border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export const StudentPeriodCard = memo(StudentPeriodCardImpl);
