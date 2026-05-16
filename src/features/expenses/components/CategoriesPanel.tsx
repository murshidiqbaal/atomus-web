"use client";

import { useMemo } from "react";
import {
  Plus, Edit3, Trash2, Power, Tag, Search, RotateCcw,
} from "lucide-react";
import { useState } from "react";
import type { ExpenseCategory } from "../types";
import {
  useAnalyticsData, useDeleteCategory, useExpenseCategories, useUpdateCategory,
} from "../hooks";
import {
  Card, CategoryDot, EmptyState, fieldCls, formatINR, GhostButton, PrimaryButton, StatCard,
} from "./ui";

export function CategoriesPanel({
  onAdd, onEdit, onToast,
}: {
  onAdd: () => void;
  onEdit: (cat: ExpenseCategory) => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: categories = [], isLoading } = useExpenseCategories();
  const { data: analytics = [] } = useAnalyticsData();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  // Per-category totals over the last 365 days.
  const totals = useMemo(() => {
    const m = new Map<string, { sum: number; count: number }>();
    for (const e of analytics) {
      if (!e.category_id) continue;
      const cur = m.get(e.category_id) ?? { sum: 0, count: 0 };
      cur.sum += Number(e.amount);
      cur.count += 1;
      m.set(e.category_id, cur);
    }
    return m;
  }, [analytics]);

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v.sum, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const topCat = useMemo(() => {
    let top: { id: string; sum: number } | null = null;
    for (const [id, v] of totals.entries()) {
      if (!top || v.sum > top.sum) top = { id, sum: v.sum };
    }
    if (!top) return null;
    const cat = categories.find((c) => c.id === top!.id);
    return cat ? { cat, sum: top.sum } : null;
  }, [totals, categories]);

  const handleToggleActive = (cat: ExpenseCategory) => {
    updateMut.mutate(
      { id: cat.id, patch: { is_active: !cat.is_active } },
      {
        onSuccess: () => onToast("success", `${cat.name} ${cat.is_active ? "disabled" : "enabled"}.`),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to update."),
      },
    );
  };

  const handleDelete = (cat: ExpenseCategory) => {
    if (cat.is_default) {
      onToast("error", "Default categories can't be deleted — disable them instead.");
      return;
    }
    const used = totals.get(cat.id)?.count ?? 0;
    const warn = used > 0
      ? `"${cat.name}" is used by ${used} expense${used === 1 ? "" : "s"}. They'll become uncategorised. Delete?`
      : `Delete "${cat.name}"?`;
    if (!window.confirm(warn)) return;
    deleteMut.mutate(cat.id, {
      onSuccess: () => onToast("success", "Category deleted."),
      onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to delete."),
    });
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Categories"
          value={categories.length}
          icon={<Tag size={18} />}
          accent="bg-[#0B3C5D]"
          sub={`${categories.filter((c) => c.is_active).length} active`}
        />
        <StatCard
          label="Highest Spending"
          value={topCat ? topCat.cat.name : "—"}
          icon={<Tag size={18} />}
          accent="bg-[#D4AF37]"
          sub={topCat ? formatINR(topCat.sum) : "No data"}
        />
        <StatCard
          label="Tracked Spend"
          value={formatINR(grandTotal)}
          icon={<Tag size={18} />}
          accent="bg-violet-500"
          sub="Last 365 days"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className={`${fieldCls} pl-9`}
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0B3C5D]"
          >
            <RotateCcw size={12} /> Clear
          </button>
        )}
        <PrimaryButton onClick={onAdd} className="!py-2 ml-auto">
          <Plus size={14} /> New Category
        </PrimaryButton>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="w-11 h-11 rounded-xl bg-slate-100 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Tag size={26} />}
          title={search ? "No categories match" : "No categories yet"}
          hint={search ? "Try a different search." : "Add your first category to get started."}
          action={!search && <PrimaryButton onClick={onAdd}><Plus size={14} /> Add Category</PrimaryButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const t = totals.get(c.id);
            const sum = t?.sum ?? 0;
            const pct = grandTotal > 0 ? (sum / grandTotal) * 100 : 0;
            return (
              <Card key={c.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <CategoryDot icon={c.icon} color={c.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-slate-900 truncate">{c.name}</h3>
                      {c.is_default && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t?.count ?? 0} expense{(t?.count ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0
                      ${c.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                  >
                    {c.is_active ? "Active" : "Off"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-500">Spend (365d)</span>
                    <span className="font-black text-[#0B3C5D] tabular-nums">{formatINR(sum)}</span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.color }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {pct.toFixed(1)}% of total
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <GhostButton onClick={() => onEdit(c)} className="!px-3 !py-1.5 !text-xs">
                    <Edit3 size={12} /> Edit
                  </GhostButton>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                    title={c.is_active ? "Disable" : "Enable"}
                  >
                    <Power size={12} /> {c.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="ml-auto p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                    title="Delete"
                    disabled={c.is_default}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
