"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Power, KeyRound, Trash2, Copy, Check, Building2 } from "lucide-react";
import { Teacher } from "../types";

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

interface Props {
  teacher: Teacher;
  onEdit: (t: Teacher) => void;
  onToggleStatus: (t: Teacher) => void;
  onResetPassword: (t: Teacher) => void;
  onDelete: (t: Teacher) => void;
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function TeacherRow({ teacher, onEdit, onToggleStatus, onResetPassword, onDelete }: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);

  const subjects = useMemo(
    () => (teacher.teacher_subjects ?? []).map((x) => x.subjects?.name).filter(Boolean) as string[],
    [teacher.teacher_subjects]
  );
  const batches = useMemo(
    () => (teacher.teacher_batches ?? []).map((x) => x.batches?.name).filter(Boolean) as string[],
    [teacher.teacher_batches]
  );

  // Password handling is now managed via Supabase Auth

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {teacher.profile_photo_url ? (
            <img src={teacher.profile_photo_url} alt={teacher.full_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-xs font-black shrink-0">
              {initials(teacher.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#0B3C5D] transition-colors">{teacher.full_name}</p>
            <p className="text-[11px] text-slate-400 truncate">{teacher.qualification ?? "—"}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        {teacher.campuses?.name ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] text-[10px] font-bold border border-[#0B3C5D]/20">
            <Building2 size={10} /> {teacher.campuses.name}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        )}
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-sm text-slate-700 font-mono">{teacher.phone_number ?? "—"}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mt-0.5">
          Login: <span className="font-mono">{teacher.email || "—"}</span>
        </p>
        {teacher.password_hash ? (
          <p className="text-[10px] text-[#D4AF37] uppercase tracking-wide font-bold mt-0.5">
            Password: <span className="font-mono select-all bg-amber-50 px-1 rounded border border-amber-200/50">{teacher.password_hash}</span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mt-0.5">
            Password: <span className="text-[10px] font-bold text-slate-400 italic">Managed by Auth</span>
          </p>
        )}
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        {subjects.length === 0 ? (
          <span className="text-xs text-slate-400 italic">—</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[14rem]">
            {subjects.slice(0, 2).map((s) => (
              <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#0B3C5D] text-[10px] font-bold border border-[#D4AF37]/30">{s}</span>
            ))}
            {subjects.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">+{subjects.length - 2}</span>
            )}
          </div>
        )}
      </td>

      <td className="px-4 py-3 hidden xl:table-cell">
        {batches.length === 0 ? (
          <span className="text-xs text-slate-400 italic">—</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[12rem]">
            {batches.slice(0, 2).map((b) => (
              <span key={b} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">{b}</span>
            ))}
            {batches.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">+{batches.length - 2}</span>
            )}
          </div>
        )}
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-[11px] font-semibold text-slate-600">{teacher.experience_years ?? 0}y</span>
      </td>



      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${STATUS_BADGE[teacher.account_status] ?? "bg-slate-100 text-slate-500"}`}>
          {teacher.account_status}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Link href={`/teachers/${teacher.id}`} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="View profile">
            <Eye size={15} />
          </Link>
          <button onClick={() => onToggleStatus(teacher)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Toggle status">
            <Power size={15} />
          </button>
          <button onClick={() => onResetPassword(teacher)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Reset password">
            <KeyRound size={15} />
          </button>
          <button onClick={() => onEdit(teacher)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
            <Pencil size={15} />
          </button>
          <button onClick={() => onDelete(teacher)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(TeacherRow);
