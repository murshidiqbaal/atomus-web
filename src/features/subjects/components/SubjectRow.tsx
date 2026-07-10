"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Subject } from "../types";
import { useToggleSubject, useDeleteSubject } from "../hooks";

const TYPE_CFG: Record<string, string> = {
  Core:       "bg-blue-100 text-blue-700",
  Theory:     "bg-violet-100 text-violet-700",
  Practical:  "bg-teal-100 text-teal-700",
  Language:   "bg-amber-100 text-amber-700",
};

interface Props {
  subject: Subject;
  onEdit: (subject: Subject) => void;
}

const SubjectRow = React.memo(function SubjectRow({ subject, onEdit }: Props) {
  const toggle = useToggleSubject();
  const del = useDeleteSubject();

  function handleToggle() {
    toggle.mutate({ id: subject.id, is_active: !subject.is_active });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${subject.name}"? This cannot be undone.`)) return;
    del.mutate(subject.id);
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/8 px-2 py-1 rounded-lg">
          {subject.subject_code}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-slate-800">{subject.name}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-slate-600">{subject.courses?.name ?? "—"}</span>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${TYPE_CFG[subject.subject_type] ?? "bg-slate-100 text-slate-600"}`}>
          {subject.subject_type}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleToggle}
          disabled={toggle.isPending}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            subject.is_active ? "bg-[#0B3C5D]" : "bg-slate-300"
          }`}
          aria-label={subject.is_active ? "Deactivate" : "Activate"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              subject.is_active ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(subject)}
            className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/8 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={del.isPending}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default SubjectRow;
