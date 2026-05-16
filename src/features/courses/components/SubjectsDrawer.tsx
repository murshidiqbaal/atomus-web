"use client";

import { useState, KeyboardEvent } from "react";
import {
  X, Plus, BookMarked, Trash2, Loader2, Pencil, Check,
} from "lucide-react";
import type { Course } from "@/lib/types";
import {
  useCreateSubject, useDeleteSubject, useSubjectsForCourse, useUpdateSubject,
} from "../hooks";
import { fieldCls, EmptyState, Badge } from "./ui";

export function SubjectsDrawer({
  isOpen, onClose, course, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const { data: subjects = [], isLoading } = useSubjectsForCourse(course?.id ?? null);
  const createMut = useCreateSubject();
  const deleteMut = useDeleteSubject();
  const updateMut = useUpdateSubject();

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const handleAdd = async () => {
    if (!course || !draft.trim()) return;
    try {
      await createMut.mutateAsync({
        courseId: course.id,
        name: draft.trim(),
        classLevel: course.classLevel ?? null,
      });
      setDraft("");
      onToast("success", "Subject added.");
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to add subject.");
    }
  };

  const handleAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this subject? Marks tied to it remain but lose the subject link.")) return;
    try {
      await deleteMut.mutateAsync(id);
      onToast("success", "Subject removed.");
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditDraft(name);
  };

  const handleSaveEdit = async (id: string) => {
    const next = editDraft.trim();
    if (!next) {
      setEditingId(null);
      return;
    }
    try {
      await updateMut.mutateAsync({ id, patch: { name: next } });
      setEditingId(null);
      onToast("success", "Subject renamed.");
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to rename.");
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50">
      <div className="bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2 rounded-xl text-white">
            <BookMarked size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 truncate">Subjects</h2>
            <p className="text-[11px] text-slate-400 truncate">{course.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleAddKey}
            placeholder="Add a subject (e.g. Mathematics)…"
            className={fieldCls}
          />
          <button
            onClick={handleAdd}
            disabled={!draft.trim() || createMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50"
          >
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              icon={<BookMarked size={26} />}
              title="No subjects yet"
              hint="Add the first subject above to get started."
            />
          ) : (
            <ul className="space-y-2">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:border-[#0B3C5D]/30 bg-white"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center shrink-0">
                    <BookMarked size={13} />
                  </div>
                  {editingId === s.id ? (
                    <>
                      <input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(s.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#0B3C5D]"
                      />
                      <button
                        onClick={() => handleSaveEdit(s.id)}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                        {(s.subjectCode || s.classLevel) && (
                          <p className="text-[10px] text-slate-400 truncate">
                            {[s.subjectCode, s.classLevel].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      {s.subjectType && s.subjectType !== "Core" && (
                        <Badge tone="slate">{s.subjectType}</Badge>
                      )}
                      <button
                        onClick={() => handleStartEdit(s.id, s.name)}
                        className="p-1.5 text-slate-400 hover:text-[#0B3C5D]"
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <p className="text-[11px] text-slate-400">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} in this course
          </p>
        </div>
      </div>
    </div>
  );
}
