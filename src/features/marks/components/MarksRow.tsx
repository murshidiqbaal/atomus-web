"use client";

import React from "react";
import { MarkEntry, StudentLite } from "../types";
import { calcPct, getGrade, GRADE_CFG } from "../utils/grade";

type Props = {
  student: StudentLite;
  entry: MarkEntry;
  defaultTotal: number;
  rowIndex: number;
  onChange: (studentId: string, val: number) => void;
  onRemarksChange: (studentId: string, val: string) => void;
  onKeyDownNav: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => void;
};

export const MarksRow = React.memo(function MarksRow({
  student,
  entry,
  defaultTotal,
  rowIndex,
  onChange,
  onRemarksChange,
  onKeyDownNav,
}: Props) {
  const total = entry.total_marks || defaultTotal;
  const pct = calcPct(entry.marks_obtained, total);
  const grade = getGrade(pct);
  const cfg = GRADE_CFG[grade];

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${entry.dirty ? "bg-amber-50/30" : ""}`}>
      <td className="py-3 px-4 text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
        {student.roll_number || "—"}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] text-xs font-bold flex items-center justify-center shrink-0">
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
            {student.full_name}
          </p>
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={total}
            value={entry.marks_obtained || ""}
            placeholder="0"
            data-row={rowIndex}
            data-col="marks"
            onChange={(e) => {
              const v = e.target.value === ""
                ? 0
                : Math.min(Math.max(0, Number(e.target.value)), total);
              onChange(student.id, v);
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => onKeyDownNav(e, rowIndex)}
            className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold
                       text-[#0B3C5D] outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10
                       transition-all text-center"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap">/ {total}</span>
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${cfg.bar} rounded-full transition-all`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums w-12">
            {pct.toFixed(1)}%
          </span>
        </div>
      </td>

      <td className="py-3 px-4">
        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}>
          {grade}
        </span>
      </td>

      <td className="py-3 px-4">
        <input
          type="text"
          placeholder="Add remark…"
          value={entry.remarks}
          data-row={rowIndex}
          data-col="remarks"
          onChange={(e) => onRemarksChange(student.id, e.target.value)}
          onKeyDown={(e) => onKeyDownNav(e, rowIndex)}
          className="w-full text-sm text-slate-600 bg-transparent border-b border-transparent
                     hover:border-slate-200 focus:border-[#0B3C5D] focus:outline-none transition-all py-1 min-w-[140px]"
        />
      </td>
    </tr>
  );
});

export const MarksMobileCard = React.memo(function MarksMobileCard({
  student,
  entry,
  defaultTotal,
  onChange,
  onRemarksChange,
}: {
  student: StudentLite;
  entry: MarkEntry;
  defaultTotal: number;
  onChange: (studentId: string, val: number) => void;
  onRemarksChange: (studentId: string, val: string) => void;
}) {
  const total = entry.total_marks || defaultTotal;
  const pct = calcPct(entry.marks_obtained, total);
  const grade = getGrade(pct);
  const cfg = GRADE_CFG[grade];

  return (
    <div className={`bg-white rounded-xl border p-4 space-y-3 ${entry.dirty ? "border-amber-200" : "border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] text-xs font-bold flex items-center justify-center">
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{student.full_name}</p>
            <p className="text-[10px] font-mono text-slate-400">{student.roll_number || "—"}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}>
          {grade}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={total}
          value={entry.marks_obtained || ""}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value === ""
              ? 0
              : Math.min(Math.max(0, Number(e.target.value)), total);
            onChange(student.id, v);
          }}
          onFocus={(e) => e.target.select()}
          className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold
                     text-[#0B3C5D] outline-none focus:border-[#0B3C5D] transition-all text-center"
        />
        <span className="text-xs text-slate-400">/ {total}</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${cfg.bar} rounded-full`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      <input
        type="text"
        placeholder="Remark (optional)…"
        value={entry.remarks}
        onChange={(e) => onRemarksChange(student.id, e.target.value)}
        className="w-full text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg
                   px-3 py-1.5 outline-none focus:border-[#0B3C5D] transition-all"
      />
    </div>
  );
});
