"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Pencil, KeyRound, Trash2, Power, Eye, Users } from "lucide-react";
import { Parent } from "../types";

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

function uniqueNames(items: { name?: string | null }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const n = i?.name?.trim();
    if (n && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

interface Props {
  parent: Parent;
  onEdit: (p: Parent) => void;
  onResetPassword: (p: Parent) => void;
  onDelete: (p: Parent) => void;
  onToggleStatus: (p: Parent) => void;
}

function ParentRow({ parent, onEdit, onResetPassword, onDelete, onToggleStatus }: Props) {
  const linked = parent.students ?? [];

  const { courses, batches } = useMemo(() => ({
    courses: uniqueNames(linked.map((s) => s.courses ?? null).filter(Boolean) as { name: string }[]),
    batches: uniqueNames(linked.map((s) => s.batches ?? null).filter(Boolean) as { name: string }[]),
  }), [linked]);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
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
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center text-xs font-black shrink-0">
              {parent.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{parent.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{parent.email}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-sm text-slate-700 font-mono">{parent.phone_number ?? "—"}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mt-0.5">
          Login: <span className="font-mono">{parent.username || "—"}</span>
        </p>
        {parent.password_hash && (
          <p className="text-[10px] text-[#D4AF37] uppercase tracking-wide font-bold mt-0.5">
            Password: <span className="font-mono select-all bg-amber-50 px-1 rounded border border-amber-200/50">{parent.password_hash}</span>
          </p>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-black text-[#0B3C5D] bg-[#0B3C5D]/8 px-2 py-1 rounded-lg">
            <Users size={11} /> {linked.length}
          </span>
          {linked.length > 0 && (
            <span className="text-[11px] text-slate-500 truncate max-w-[10rem] hidden sm:inline">
              {linked.slice(0, 2).map((s) => s.full_name).join(", ")}
              {linked.length > 2 ? ` +${linked.length - 2}` : ""}
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        {courses.length === 0 ? (
          <span className="text-xs text-slate-400 italic">—</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[12rem]">
            {courses.slice(0, 2).map((c) => (
              <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#0B3C5D] text-[10px] font-bold border border-[#D4AF37]/30">{c}</span>
            ))}
            {courses.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">+{courses.length - 2}</span>
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

      <td className="px-4 py-3">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${STATUS_BADGE[parent.account_status] ?? "bg-slate-100 text-slate-500"}`}>
          {parent.account_status}
        </span>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500 whitespace-nowrap">
        {formatDate(parent.created_at)}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Link href={`/parents/${parent.id}`} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="View parent">
            <Eye size={15} />
          </Link>
          <button onClick={() => onToggleStatus(parent)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Toggle account status">
            <Power size={15} />
          </button>
          <button onClick={() => onResetPassword(parent)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Reset password">
            <KeyRound size={15} />
          </button>
          <button onClick={() => onEdit(parent)} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-colors" title="Edit parent">
            <Pencil size={15} />
          </button>
          <button onClick={() => onDelete(parent)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(ParentRow);
