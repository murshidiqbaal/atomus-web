"use client";

import { useMemo, useState } from "react";
import { X, Loader2, Search, CheckCircle2, Users } from "lucide-react";
import { useUnlinkedStudents, useLinkStudents } from "../hooks";

interface Props {
  parentId: string;
  parentName: string;
  onClose: () => void;
  onLinked: (count: number) => void;
}

export default function LinkStudentsModal({ parentId, parentName, onClose, onLinked }: Props) {
  const { data: unlinked = [], isLoading } = useUnlinkedStudents();
  const link = useLinkStudents();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return unlinked;
    return unlinked.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)
    );
  }, [unlinked, search]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!selected.length) return;
    await link.mutateAsync({ parent_id: parentId, student_ids: selected });
    onLinked(selected.length);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-900">Link Existing Students</h2>
            <p className="text-xs text-slate-400 mt-0.5">Connect unlinked students to {parentName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll number..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No unlinked students</p>
              <p className="text-xs text-slate-400 mt-1">All students are already linked to a parent.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((s) => {
                const isSel = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors text-left border ${
                      isSel ? "bg-[#0B3C5D]/5 border-[#0B3C5D]/30 text-[#0B3C5D]" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{s.full_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {s.roll_number}
                        {s.courses?.name && ` · ${s.courses.name}`}
                        {s.batches?.name && ` · ${s.batches.name}`}
                      </p>
                    </div>
                    {isSel && <CheckCircle2 size={16} className="text-[#0B3C5D] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
          <p className="text-xs text-slate-500 flex-1">
            {selected.length > 0 ? <span className="font-bold text-[#0B3C5D]">{selected.length}</span> : "No"} student{selected.length === 1 ? "" : "s"} selected
          </p>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected.length || link.isPending}
            className="px-4 py-2 bg-[#0B3C5D] text-white rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {link.isPending && <Loader2 size={14} className="animate-spin" />}
            Link Students
          </button>
        </div>
      </div>
    </div>
  );
}
