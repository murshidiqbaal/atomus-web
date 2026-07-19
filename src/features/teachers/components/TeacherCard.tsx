"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Mail, Phone, GraduationCap, BookOpen, Layers, Pencil, Power, Building2, Trash2 } from "lucide-react";
import { Teacher } from "../types";

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

interface Props {
  teacher: Teacher;
  onEdit: (t: Teacher) => void;
  onToggleStatus: (t: Teacher) => void;
  onDelete: (t: Teacher) => void;
  campusNameMap?: Map<string, string>;
}

function TeacherCard({ teacher, onEdit, onToggleStatus, onDelete, campusNameMap }: Props) {
  const counts = useMemo(() => ({
    courses: teacher.teacher_courses?.length ?? 0,
    subjects: teacher.teacher_subjects?.length ?? 0,
    batches: teacher.teacher_batches?.length ?? 0,
  }), [teacher]);

  const campusNames = useMemo(() => {
    if (teacher.assigned_campuses && teacher.assigned_campuses.length > 0 && campusNameMap) {
      return teacher.assigned_campuses.map((cid) => campusNameMap.get(cid)).filter(Boolean).join(", ");
    }
    return teacher.campuses?.name || "No campus";
  }, [teacher.assigned_campuses, teacher.campuses, campusNameMap]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        {teacher.image_url ? (
          <img src={teacher.image_url} alt={teacher.full_name} className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#0B3C5D] text-white flex items-center justify-center font-black text-sm shrink-0">
            {initials(teacher.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{teacher.full_name}</p>
          <p className="text-[11px] text-[#D4AF37] font-bold mt-0.5 truncate">{teacher.qualification ?? "—"}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${STATUS_BADGE[teacher.account_status] ?? "bg-slate-100 text-slate-500"}`}>
          {teacher.account_status}
        </span>
      </div>

      <div className="space-y-1 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Building2 size={12} className="shrink-0" />
          <span className="truncate" title={campusNames}>{campusNames}</span>
        </div>
        <div className="flex items-center gap-2"><Mail size={12} /><span className="truncate">{teacher.email.toLowerCase()}</span></div>
        <div className="flex items-center gap-2"><Phone size={12} /><span className="font-mono">{teacher.phone_number ?? "—"}</span></div>
      </div>

      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
          <span>LOGIN:</span>
          <span className="font-mono text-slate-600 select-all">{teacher.email.toLowerCase()}</span>
        </div>
        {teacher.password_hash ? (
          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between pt-1.5 border-t border-slate-200/50">
            <span>PASSWORD:</span>
            <span className="font-mono text-[#D4AF37] select-all">{teacher.password_hash}</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between pt-1.5 border-t border-slate-200/50">
            <span>PASSWORD:</span>
            <span className="text-[10px] font-bold text-slate-400 italic">Managed by Auth</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="bg-slate-50 rounded-lg py-2 text-center">
          <BookOpen size={11} className="mx-auto text-[#D4AF37]" />
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Courses</p>
          <p className="text-sm font-black text-[#0B3C5D]">{counts.courses}</p>
        </div>
        <div className="bg-slate-50 rounded-lg py-2 text-center">
          <GraduationCap size={11} className="mx-auto text-blue-500" />
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Subjects</p>
          <p className="text-sm font-black text-[#0B3C5D]">{counts.subjects}</p>
        </div>
        <div className="bg-slate-50 rounded-lg py-2 text-center">
          <Layers size={11} className="mx-auto text-emerald-500" />
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Batches</p>
          <p className="text-sm font-black text-[#0B3C5D]">{counts.batches}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <Link href={`/teachers/${teacher.id}`} className="text-xs font-bold text-[#0B3C5D] hover:underline">View profile</Link>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onToggleStatus(teacher)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Toggle status">
            <Power size={14} />
          </button>
          <button onClick={() => onEdit(teacher)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(teacher)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(TeacherCard);
