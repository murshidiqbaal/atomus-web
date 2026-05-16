"use client";

import { useEffect, useState } from "react";
import { X, Save, Loader2, Building2 } from "lucide-react";
import type { Campus } from "@/lib/types";
import { useCreateCampus, useUpdateCampus } from "../hooks";
import { fieldCls, GhostButton, Label, PrimaryButton } from "./ui";

type FormState = {
  name: string;
  location: string;
  isActive: boolean;
};

const EMPTY: FormState = { name: "", location: "", isActive: true };

export function CampusModal({
  isOpen, onClose, campus, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  campus: Campus | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const isEdit = !!campus;
  const [form, setForm] = useState<FormState>(EMPTY);
  const createMut = useCreateCampus();
  const updateMut = useUpdateCampus();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    if (campus) {
      setForm({ name: campus.name, location: campus.location ?? "", isActive: campus.isActive });
    } else {
      setForm(EMPTY);
    }
  }, [isOpen, campus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saving = createMut.isPending || updateMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast("error", "Campus name is required.");
      return;
    }
    try {
      if (isEdit && campus) {
        await updateMut.mutateAsync({
          id: campus.id,
          patch: { name: form.name, location: form.location || null, isActive: form.isActive },
        });
        onToast("success", "Campus updated.");
      } else {
        await createMut.mutateAsync({
          name: form.name,
          location: form.location || null,
          isActive: form.isActive,
        });
        onToast("success", "Campus created.");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save campus.";
      onToast("error", msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2 rounded-xl text-white">
            <Building2 size={16} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              {isEdit ? "Edit Campus" : "New Campus"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isEdit ? "Update campus details." : "Add a new physical or online campus."}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-3">
          <div>
            <Label>Name</Label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={fieldCls}
              placeholder="e.g. Aroor Campus"
              autoFocus
            />
          </div>
          <div>
            <Label optional>Location</Label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className={fieldCls}
              placeholder="e.g. Aroor, Alappuzha"
            />
          </div>
          <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="rounded text-[#0B3C5D] focus:ring-[#0B3C5D]"
            />
            <span className="text-sm font-semibold text-slate-700">Active</span>
            <span className="ml-auto text-[10px] text-slate-400">
              {form.isActive ? "Available for assignments" : "Hidden from selectors"}
            </span>
          </label>

          <div className="pt-2 flex items-center gap-2 justify-end">
            <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? "Save" : "Create"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
