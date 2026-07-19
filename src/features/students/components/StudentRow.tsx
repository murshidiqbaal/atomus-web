"use client";

import React from "react";
import Link from "next/link";
import { Eye, Pencil, ExternalLink, Trash2 } from "lucide-react";
import { StudentWithRelations } from "../types";
import { useToggleStudent, useUpdateStudentStatus } from "../hooks";

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
  onDelete: (s: StudentWithRelations) => void;
  allBatches?: { id: string; name: string }[];
}

const StudentRow = React.memo(function StudentRow({ student, onEdit, onDelete, allBatches }: Props) {
  const toggle = useToggleStudent();
  const updateStatus = useUpdateStudentStatus();
  const isActive = student.academic_status === "Active";

  const displayBatch = React.useMemo(() => {
    if (!student.batch_ids || student.batch_ids.length === 0 || student.batch_ids.includes("any")) {
      return student.batches?.name ?? "Any Batch";
    }
    // Match ID list to names
    const names = student.batch_ids
      .map(id => allBatches?.find(b => b.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : (student.batches?.name ?? "Any Batch");
  }, [student, allBatches]);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-all group">
      {/* Photo + Name */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            {student.image_url ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(student.image_url!, "_blank");
                }}
                className="cursor-pointer focus:outline-none block"
                title="View full image"
              >
                <img
                  src={student.image_url}
                  alt={student.full_name}
                  className="w-12 h-12 rounded-[1rem] object-cover shadow-sm border border-slate-200 group-hover:scale-110 transition-transform duration-500"
                />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-[1rem] bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-sm font-black border border-[#0B3C5D]/10">
                {student.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate group-hover:text-[#0B3C5D] transition-colors">{student.full_name}</p>
            {student.email && (
              <p className="text-[11px] text-slate-400 truncate font-semibold">{student.email}</p>
            )}
          </div>
        </div>
      </td>

      {/* Roll */}
      <td className="px-6 py-4">
        <span className="font-mono text-[10px] font-black text-[#0B3C5D] bg-[#0B3C5D]/5 px-2.5 py-1.5 rounded-lg border border-[#0B3C5D]/10 uppercase tracking-wider">
          {student.roll_number}
        </span>
      </td>

      {/* Campus */}
      <td className="px-6 py-4 hidden xl:table-cell">
        <div className="flex flex-col">
          <span className="text-xs font-black text-[#D4AF37] tracking-tight">{student.campuses?.name ?? "—"}</span>
          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Campus</span>
        </div>
      </td>

      {/* Course */}
      <td className="px-6 py-4 hidden xl:table-cell">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-700 tracking-tight">{student.courses?.name ?? "—"}</span>
          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{displayBatch}</span>
        </div>
      </td>

      {/* Parent */}
      <td className="px-6 py-4 hidden xl:table-cell">
        {student.parents ? (
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 truncate max-w-[10rem]">{student.parents.full_name}</p>
            <p className="text-[10px] text-slate-400 font-bold">{student.parents.phone_number}</p>
          </div>
        ) : (
          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase tracking-widest">
            Unlinked
          </span>
        )}
      </td>

      {/* Academic Status */}
      <td className="px-6 py-4">
        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.1em] border ${STATUS_COLOR[student.academic_status ?? ""] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
          {student.academic_status ?? "—"}
        </span>
      </td>

      {/* Attendance */}
      <td className="px-6 py-4 hidden xl:table-cell">
        {student.attendance_percentage != null ? (
          <div className="flex items-center gap-3">
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  student.attendance_percentage >= 75 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                  student.attendance_percentage >= 50 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                }`}
                style={{ width: `${Math.min(100, student.attendance_percentage)}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-slate-600">
              {Math.round(student.attendance_percentage)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-bold">—</span>
        )}
      </td>

      {/* Progress */}
      <td className="px-6 py-4 hidden xl:table-cell">
        {student.progress_status ? (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
            {student.progress_status}
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-bold">—</span>
        )}
      </td>

      {/* Status selector */}
      <td className="px-6 py-4">
        <select
          value={student.academic_status || "Active"}
          onChange={(e) => updateStatus.mutate({ id: student.id, status: e.target.value })}
          disabled={updateStatus.isPending}
          className="text-xs font-black border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#0B3C5D] cursor-pointer bg-white text-slate-700 shadow-sm hover:border-slate-300 transition-colors"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Graduated">Graduated</option>
          <option value="Dropped">Dropped</option>
        </select>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <Link
            href={`/students/${student.id}`}
            className="p-2.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-xl transition-all"
            title="View full profile"
          >
            <Eye size={18} />
          </Link>
          <button
            onClick={() => onEdit(student)}
            className="p-2.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-xl transition-all"
            title="Quick Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(student)}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Delete Student"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default StudentRow;
