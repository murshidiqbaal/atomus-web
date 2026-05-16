"use client";

import { useEffect, useState } from "react";
import { X, Save, Loader2, Tag } from "lucide-react";
import type { ExpenseCategory, ExpenseCategoryInput } from "../types";
import { CATEGORY_PALETTE, ICONS, ICON_KEYS } from "../types";
import { useCreateCategory, useUpdateCategory } from "../hooks";
import {
  CategoryDot, fieldCls, GhostButton, Label, PrimaryButton,
} from "./ui";

const EMPTY: ExpenseCategoryInput = {
  name: "",
  icon: "receipt",
  color: CATEGORY_PALETTE[0],
  is_active: true,
};

export function CategoryModal({
  isOpen, onClose, category, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: ExpenseCategory | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const isEdit = !!category;
  const [form, setForm] = useState<ExpenseCategoryInput>(EMPTY);
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    if (category) {
      setForm({ name: category.name, icon: category.icon, color: category.color, is_active: category.is_active });
    } else {
      setForm(EMPTY);
    }
  }, [isOpen, category]);

  const saving = createMut.isPending || updateMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast("error", "Name is required.");
      return;
    }
    try {
      if (isEdit && category) {
        await updateMut.mutateAsync({ id: category.id, patch: form });
        onToast("success", "Category updated.");
      } else {
        await createMut.mutateAsync(form);
        onToast("success", "Category created.");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save category.";
      onToast("error", msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <CategoryDot icon={form.icon} color={form.color} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900">
              {isEdit ? "Edit Category" : "New Category"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isEdit ? "Update category details." : "Add a custom expense category."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <Label>Name</Label>
            <div className="relative">
              <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={`${fieldCls} pl-9`}
                placeholder="e.g. Cleaning Services"
                autoFocus
                disabled={category?.is_default}
              />
            </div>
            {category?.is_default && (
              <p className="text-[10px] text-slate-400 mt-1">Default categories can't be renamed.</p>
            )}
          </div>

          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_KEYS.map((k) => {
                const Icon = ICONS[k];
                const active = form.icon === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, icon: k }))}
                    className={`aspect-square rounded-xl border flex items-center justify-center transition-all
                      ${active
                        ? "border-[#0B3C5D] bg-[#0B3C5D]/10 text-[#0B3C5D]"
                        : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-10 gap-1.5">
              {CATEGORY_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`aspect-square rounded-lg transition-all
                    ${form.color === c ? "ring-2 ring-offset-2 ring-[#0B3C5D]" : "hover:scale-105"}`}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="rounded text-[#0B3C5D] focus:ring-[#0B3C5D]"
            />
            <span className="text-sm font-semibold text-slate-700">Active</span>
            <span className="ml-auto text-[10px] text-slate-400">
              {form.is_active ? "Available in selectors" : "Hidden from new entries"}
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
