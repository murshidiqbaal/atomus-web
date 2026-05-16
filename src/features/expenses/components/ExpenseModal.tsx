"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Save, Loader2, Receipt, Plus, Copy, Banknote, Smartphone,
  Building2, CreditCard,
} from "lucide-react";
import type {
  Expense, ExpenseInput, PaymentMethod,
} from "../types";
import { PAYMENT_METHODS } from "../types";
import {
  useCreateExpense, useExpCampuses, useExpenseCategories, useUpdateExpense,
} from "../hooks";
import {
  CategoryDot, fieldCls, GhostButton, Label, PrimaryButton,
} from "./ui";

const EMPTY: ExpenseInput = {
  title: "",
  category_id: null,
  amount: 0,
  payment_method: "Cash",
  expense_date: new Date().toISOString().slice(0, 10),
  campus_id: null,
  notes: "",
};

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  Cash: <Banknote size={14} />,
  UPI: <Smartphone size={14} />,
  "Bank Transfer": <Building2 size={14} />,
  Card: <CreditCard size={14} />,
};

function fromExpense(e: Expense): ExpenseInput {
  return {
    title: e.title,
    category_id: e.category_id,
    amount: Number(e.amount ?? 0),
    payment_method: e.payment_method,
    expense_date: e.expense_date,
    campus_id: e.campus_id,
    notes: e.notes ?? "",
  };
}

export function ExpenseModal({
  isOpen, onClose, expense, recent, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  /** Most-recent saved expense, used for the "Duplicate previous" shortcut. */
  recent?: Expense | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const isEdit = !!expense;
  const [form, setForm] = useState<ExpenseInput>(EMPTY);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const { data: categories = [] } = useExpenseCategories(true);
  const { data: campuses = [] }   = useExpCampuses();
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    setForm(expense ? fromExpense(expense) : EMPTY);
    // Auto-focus the title field on open
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [isOpen, expense]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setField = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Title is required.";
    if (!Number.isFinite(form.amount) || form.amount <= 0) return "Amount must be a positive number.";
    if (!form.expense_date) return "Date is required.";
    return null;
  };

  const saving = createMut.isPending || updateMut.isPending;

  async function submit(addAnother = false) {
    const err = validate();
    if (err) {
      onToast("error", err);
      return;
    }
    try {
      if (isEdit && expense) {
        await updateMut.mutateAsync({ id: expense.id, patch: form });
        onToast("success", "Expense updated.");
        onClose();
        return;
      }
      await createMut.mutateAsync(form);
      onToast("success", "Expense saved.");
      if (addAnother) {
        // Reset only title/amount/notes — keep category, method, date, campus.
        setForm((p) => ({ ...p, title: "", amount: 0, notes: "" }));
        setTimeout(() => titleRef.current?.focus(), 50);
      } else {
        onClose();
      }
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to save expense.");
    }
  }

  const duplicate = () => {
    if (!recent) return;
    setForm(fromExpense(recent));
    onToast("success", `Loaded "${recent.title}" from your last entry.`);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2 rounded-xl text-white">
            <Receipt size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900">
              {isEdit ? "Edit Expense" : "New Expense"}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {isEdit ? "Update the entry details." : "Track a single expense — assign it a category & campus."}
            </p>
          </div>
          {!isEdit && recent && (
            <button
              type="button"
              onClick={duplicate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 rounded-lg hover:bg-[#0B3C5D]/20"
              title={`Duplicate "${recent.title}"`}
            >
              <Copy size={12} /> Duplicate
            </button>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(false); }}
          className="flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <input
                  ref={titleRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className={fieldCls}
                  placeholder="e.g. November electricity bill"
                />
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.amount || ""}
                  onChange={(e) => setField("amount", Number(e.target.value) || 0)}
                  className={`${fieldCls} font-bold tabular-nums`}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select
                  value={form.category_id ?? ""}
                  onChange={(e) => setField("category_id", e.target.value || null)}
                  className={fieldCls}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label optional>Campus</Label>
                <select
                  value={form.campus_id ?? ""}
                  onChange={(e) => setField("campus_id", e.target.value || null)}
                  className={fieldCls}
                >
                  <option value="">No specific campus</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setField("payment_method", m)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl border transition-colors
                      ${form.payment_method === m
                        ? "bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                  >
                    {METHOD_ICON[m]}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Date</Label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setField("expense_date", e.target.value)}
                className={fieldCls}
              />
            </div>

            <div>
              <Label optional>Notes</Label>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                rows={2}
                className={`${fieldCls} resize-y`}
                placeholder="Anything worth remembering about this expense…"
              />
            </div>

            {form.category_id && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500">
                {(() => {
                  const cat = categories.find((c) => c.id === form.category_id);
                  if (!cat) return null;
                  return (
                    <>
                      <CategoryDot icon={cat.icon} color={cat.color} size="sm" />
                      <span className="font-semibold text-slate-700">{cat.name}</span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center gap-2 sticky bottom-0">
            <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
            {!isEdit && (
              <GhostButton onClick={() => submit(true)} disabled={saving}>
                <Plus size={14} /> Save &amp; Add another
              </GhostButton>
            )}
            <PrimaryButton type="submit" disabled={saving} className="ml-auto">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? "Save Changes" : "Save Expense"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
