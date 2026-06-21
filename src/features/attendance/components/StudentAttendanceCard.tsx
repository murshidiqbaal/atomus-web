"use client";

import { memo, useEffect, useRef } from "react";
import type { AttendanceStatus, StudentLite } from "../types";
import { STATUS_CFG } from "./ui";

interface Props {
  student: StudentLite;
  status: AttendanceStatus;
  isFocused?: boolean;
  disabled?: boolean;
  lockedBySubjectName?: string | null;
  markerRole?: "Teacher" | "Admin" | "System" | null;
  markerName?: string | null;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
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

function StudentAttendanceCardImpl({
  student,
  status,
  isFocused = false,
  disabled = false,
  lockedBySubjectName,
  markerRole,
  markerName,
  onStatusChange,
}: Props) {
  const activeCfg = STATUS_CFG[status];
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  // Map each selectable status to its styling config
  const statuses: Exclude<AttendanceStatus, "Unmarked" | "Leave">[] = ["Present", "Absent", "Late"];

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200
        ${lockedBySubjectName
          ? "bg-slate-50/70 border-slate-200/80 opacity-90 shadow-none cursor-not-allowed"
          : isFocused
          ? "bg-white border-slate-800 shadow-md ring-2 ring-slate-800/5 translate-x-1"
          : "bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow"}`}
    >
      {/* Visual focus indicator bar */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-200
          ${isFocused && !lockedBySubjectName ? "bg-slate-800 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-200"}`}
      />

      {/* Left: Student Info */}
      <div className="flex items-center gap-3 pl-2 min-w-0">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors duration-200
            ${status !== "Unmarked" 
              ? `${activeCfg.bg} ${activeCfg.text}` 
              : "bg-slate-100 text-slate-600"}`}
        >
          {initials(student.full_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800 leading-tight tracking-tight truncate">
            {student.full_name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              {student.roll_number ? `#${student.roll_number}` : "No Roll"}
            </span>
            {lockedBySubjectName ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Locked: Marked in {lockedBySubjectName}
              </span>
            ) : status !== "Unmarked" && markerName && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all duration-200
                ${markerRole === "Admin" 
                  ? "bg-slate-900 text-amber-400 border border-slate-800 shadow-sm" 
                  : markerRole === "Teacher"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-slate-50 text-slate-500 border border-slate-100"}`}>
                Marked by {markerName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Tactile Segmented Pill Control */}
      <div className={`flex items-center gap-1 shrink-0 p-1 rounded-xl border select-none transition-all duration-200
        ${lockedBySubjectName
          ? "bg-slate-100/50 border-slate-200/60 opacity-60"
          : "bg-slate-50 border-slate-100"}`}
      >
        {statuses.map((s) => {
          const cfg = STATUS_CFG[s];
          const isSelected = status === s;

          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onStatusChange(student.id, isSelected ? "Unmarked" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 active:scale-95 disabled:opacity-40 disabled:pointer-events-none
                ${isSelected
                  ? `${cfg.bg} ${cfg.text} shadow-sm scale-[1.03]`
                  : "text-slate-500 hover:text-slate-800 hover:bg-white"}`}
            >
              <span className="text-[10px] uppercase">{cfg.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const StudentAttendanceCard = memo(StudentAttendanceCardImpl);
