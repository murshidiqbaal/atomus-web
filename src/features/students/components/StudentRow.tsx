"use client";

import React from "react";
import Link from "next/link";
import { Eye, Pencil, ExternalLink } from "lucide-react";
import { StudentWithRelations } from "../types";
import { useToggleStudent } from "../hooks";

const GENDER_COLOR: Record<string, string> = {
  Male:   "text-blue-600",
  Female: "text-pink-600",
  Other:  "text-purple-600",
};

const STATUS_COLOR: Record<string, string> = {
  Active:    "bg-emerald-100 text-emerald-700",
  Inactive:  "bg-slate-100 text-slate-500",
  Graduated: "bg-blue-100 text-blue-700",
  Dropped:   "bg-rose-100 text-rose-600",
};

interface Props {
  student: StudentWithRelations;
  onEdit: (s: StudentWithRelations) => void;
}

const StudentRow = React.memo(function StudentRow({ student, onEdit }: Props) {
  const toggle = useToggleStudent();
  const isActive = student.academic_status === "Active";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
      {/* Photo + Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-sm font-black border border-[#0B3C5D]/10">
                {student.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#0B3C5D] transition-colors">{student.full_name}</p>
            {student.email && (
              <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
            )}
          </div>
        </div>
      </td>

      {/* Roll */}
      <td className="px-4 py-3">
        <span className="font-mono text-[11px] font-black text-[#0B3C5D] bg-[#0B3C5D]/5 px-2 py-1 rounded-lg border border-[#0B3C5D]/10">
          {student.roll_number}
        </span>
      </td>

      {/* Course */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-700">{student.courses?.name ?? "—"}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Course</span>
        </div>
      </td>

      {/* Batch */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-700">{student.batches?.name ?? "—"}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Batch</span>
        </div>
      </td>

      {/* Parent */}
      <td className="px-4 py-3 hidden xl:table-cell">
        {student.parents ? (
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate max-w-[8rem]">{student.parents.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{student.parents.phone_number}</p>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            Unlinked
          </span>
        )}
      </td>

      {/* Academic Status */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_COLOR[student.academic_status ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
          {student.academic_status ?? "—"}
        </span>
      </td>

      {/* Attendance */}
      <td className="px-4 py-3 hidden md:table-cell">
        {student.attendance_percentage != null ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  student.attendance_percentage >= 75 ? "bg-emerald-500" :
                  student.attendance_percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, student.attendance_percentage)}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-slate-600">
              {Math.round(student.attendance_percentage)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Progress */}
      <td className="px-4 py-3 hidden md:table-cell">
        {student.progress_status ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            {student.progress_status}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Status toggle */}
      <td className="px-4 py-3">
        <button
          onClick={() => toggle.mutate({ id: student.id, is_active: !isActive })}
          disabled={toggle.isPending}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 disabled:opacity-50 ${
            isActive ? "bg-[#0B3C5D]" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isActive ? "translate-x-5.5" : "translate-x-1"
            }`}
          />
        </button>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/students/${student.id}`}
            className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-xl transition-all"
            title="View full profile"
          >
            <Eye size={16} />
          </Link>
          <button
            onClick={() => onEdit(student)}
            className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-xl transition-all"
            title="Quick Edit"
          >
            <Pencil size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default StudentRow;
