"use client";

import { memo, useCallback } from "react";
import type { AttendanceStatus, StudentLite } from "../types";
import { STATUS_CFG } from "./ui";
import { StatusPills } from "./StatusPills";

interface Props {
  rowIndex: number;
  student: StudentLite;
  status: AttendanceStatus;
  remarks: string;
  onStatus: (studentId: string, next: AttendanceStatus) => void;
  onRemarks: (studentId: string, next: string) => void;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function AttendanceRowImpl({
  rowIndex, student, status, remarks, onStatus, onRemarks,
}: Props) {
  const cfg = STATUS_CFG[status];
  const setStatus = useCallback(
    (next: AttendanceStatus) => onStatus(student.id, next),
    [onStatus, student.id],
  );
  const setRemarks = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onRemarks(student.id, e.target.value),
    [onRemarks, student.id],
  );

  return (
    <tr
      tabIndex={0}
      data-row={rowIndex}
      className={`border-b border-slate-100 outline-none focus:bg-slate-50 ${cfg.rowTint}`}
    >
      <td className="py-2.5 px-4 text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap">
        {student.roll_number ?? "—"}
      </td>
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-[11px] font-black shrink-0">
            {initials(student.full_name)}
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{student.full_name}</p>
        </div>
      </td>
      <td className="py-2.5 px-4">
        <StatusPills value={status} onChange={setStatus} />
      </td>
      <td className="py-2.5 px-4">
        <input
          type="text"
          value={remarks}
          onChange={setRemarks}
          placeholder="—"
          className="w-full px-2 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-[#0B3C5D] focus:bg-white transition-colors"
        />
      </td>
    </tr>
  );
}

export const AttendanceRow = memo(AttendanceRowImpl);
