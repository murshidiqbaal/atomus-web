"use client";

import { memo, useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, KeyRound, Trash2, Power, Users } from "lucide-react";
import { Parent } from "../types";

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

interface Props {
  parent: Parent;
  onEdit: (p: Parent) => void;
  onResetPassword: (p: Parent) => void;
  onDelete: (p: Parent) => void;
  onToggleStatus: (p: Parent) => void;
}

function ParentCard({ parent, onEdit, onResetPassword, onDelete, onToggleStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const linked = parent.students ?? [];

  const courses = useMemo(() => {
    const set = new Set<string>();
    linked.forEach((s) => s.courses?.name && set.add(s.courses.name));
    return [...set];
  }, [linked]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        {parent.profile_photo_url ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const fileId = parent.profile_photo_drive_id;
              if (fileId) {
                window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
              } else {
                window.open(parent.profile_photo_url!, "_blank");
              }
            }}
            className="cursor-pointer focus:outline-none block shrink-0"
            title="View image in Google Drive"
          >
            <img
              src={parent.profile_photo_url}
              alt={parent.full_name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 hover:scale-105 transition-transform"
            />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-sm font-black shrink-0">
            {parent.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{parent.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{parent.email.toLowerCase()}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${STATUS_BADGE[parent.account_status] ?? "bg-slate-100 text-slate-500"}`}>
          {parent.account_status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span className="font-mono">{parent.phone_number ?? "—"}</span>
        <span className="inline-flex items-center gap-1 font-bold text-[#0B3C5D] justify-end">
          <Users size={11} /> {linked.length} student{linked.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="bg-slate-50/50 rounded-xl p-2.5 space-y-1.5 border border-slate-100/80">
        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
          <span>LOGIN:</span>
          <span className="font-mono text-slate-700 select-all normal-case font-semibold">{parent.email?.toLowerCase() || "—"}</span>
        </div>
        {parent.password_hash && (
          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
            <span>PASSWORD:</span>
            <span className="font-mono text-[#D4AF37] select-all">{parent.password_hash}</span>
          </div>
        )}
      </div>

      {courses.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {courses.slice(0, 3).map((c) => (
            <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#0B3C5D] text-[10px] font-bold border border-[#D4AF37]/30">{c}</span>
          ))}
        </div>
      )}

      {linked.length > 0 && (
        <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-[#0B3C5D] transition-colors">
          {expanded ? "Hide students" : "Show students"}
          <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {expanded && linked.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          {linked.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`} className="flex items-center justify-between text-xs hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors">
              <div>
                <p className="font-semibold text-slate-700">{s.full_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{s.roll_number}</p>
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                {s.courses?.name ?? "—"}<br />
                <span className="text-slate-400">{s.batches?.name ?? "—"}</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <Link href={`/parents/${parent.id}`} className="text-xs font-bold text-[#0B3C5D] hover:underline">View</Link>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onToggleStatus(parent)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Toggle status">
            <Power size={14} />
          </button>
          <button onClick={() => onResetPassword(parent)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Reset password">
            <KeyRound size={14} />
          </button>
          <button onClick={() => onEdit(parent)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(parent)} className="p-1.5 text-slate-400 hover:text-rose-600" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ParentCard);
