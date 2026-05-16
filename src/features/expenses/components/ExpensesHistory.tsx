"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, RotateCcw, Edit3, Trash2, Receipt, Building2, FileSpreadsheet,
} from "lucide-react";
import type { Expense, ExpenseFilters, PaymentMethod, Period } from "../types";
import { EMPTY_FILTERS, PAYMENT_METHODS } from "../types";
import {
  useDeleteExpense, useExpCampuses, useExpenseCategories, useExpenses,
} from "../hooks";
import {
  Card, CategoryDot, EmptyState, fieldCls, formatDate, formatINR, GhostButton, Label, PrimaryButton, StatCard,
} from "./ui";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week",  label: "Week" },
  { key: "month", label: "Month" },
  { key: "year",  label: "Year" },
  { key: "all",   label: "All" },
];

const PAGE_SIZE = 15;

export function ExpensesHistory({
  onAdd, onEdit, onToast,
}: {
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useExpenseCategories();
  const { data: campuses = [] }   = useExpCampuses();
  const { data: rows = [], isLoading } = useExpenses(filters);
  const deleteMut = useDeleteExpense();

  const set = <K extends keyof ExpenseFilters>(k: K, v: ExpenseFilters[K]) => {
    setFilters((p) => ({ ...p, [k]: v }));
    setPage(1);
  };

  const reset = () => { setFilters(EMPTY_FILTERS); setPage(1); };

  const hasFilters =
    filters.search || filters.category_id || filters.campus_id ||
    filters.payment_method || filters.date_from || filters.date_to ||
    filters.period !== "month";

  const totals = useMemo(() => {
    const sum = rows.reduce((s, e) => s + Number(e.amount), 0);
    return { sum, count: rows.length, avg: rows.length ? sum / rows.length : 0 };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginated  = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (e: Expense) => {
    if (!window.confirm(`Delete "${e.title}" (${formatINR(Number(e.amount))})?`)) return;
    deleteMut.mutate(e.id, {
      onSuccess: () => onToast("success", "Expense deleted."),
      onError: (err) => onToast("error", err instanceof Error ? err.message : "Failed to delete."),
    });
  };

  const exportCsv = () => {
    const header = ["date", "title", "category", "campus", "amount", "payment_method", "notes"];
    const lines = rows.map((e) =>
      [
        e.expense_date,
        `"${(e.title ?? "").replace(/"/g, '""')}"`,
        `"${e.category?.name ?? ""}"`,
        `"${e.campus?.name ?? ""}"`,
        Number(e.amount).toFixed(2),
        e.payment_method,
        `"${(e.notes ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ].join(","),
    );
    const blob = new Blob([header.join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* KPIs for the active filter window */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Filtered Total"
          value={formatINR(totals.sum)}
          icon={<Receipt size={18} />}
          accent="bg-[#0B3C5D]"
          sub={`${totals.count} entr${totals.count === 1 ? "y" : "ies"}`}
        />
        <StatCard
          label="Average / entry"
          value={formatINR(totals.avg)}
          icon={<Receipt size={18} />}
          accent="bg-[#D4AF37]"
        />
        <StatCard
          label="Active Period"
          value={filters.date_from || filters.date_to ? "Date range" : PERIODS.find((p) => p.key === filters.period)?.label ?? "Month"}
          icon={<Receipt size={18} />}
          accent="bg-violet-500"
        />
      </div>

      {/* Period pills + actions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => set("period", p.key)}
                disabled={!!(filters.date_from || filters.date_to)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50
                  ${filters.period === p.key && !filters.date_from && !filters.date_to
                    ? "bg-white text-[#0B3C5D] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <GhostButton onClick={exportCsv} className="ml-auto">
            <FileSpreadsheet size={14} /> Export CSV
          </GhostButton>
          <PrimaryButton onClick={onAdd}>
            <Plus size={14} /> New Expense
          </PrimaryButton>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
          <div className="lg:col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Title or notes…"
                className={`${fieldCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <select value={filters.category_id} onChange={(e) => set("category_id", e.target.value)} className={fieldCls}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Campus</Label>
            <select value={filters.campus_id} onChange={(e) => set("campus_id", e.target.value)} className={fieldCls}>
              <option value="">All</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Payment</Label>
            <select value={filters.payment_method} onChange={(e) => set("payment_method", e.target.value as PaymentMethod | "")} className={fieldCls}>
              <option value="">All</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>From</Label>
            <input type="date" value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} className={fieldCls} />
          </div>
          <div>
            <Label>To</Label>
            <input type="date" value={filters.date_to} onChange={(e) => set("date_to", e.target.value)} className={fieldCls} />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">{rows.length} match{rows.length === 1 ? "" : "es"}</p>
            <button onClick={reset} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0B3C5D]">
              <RotateCcw size={12} /> Reset filters
            </button>
          </div>
        )}
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/4" />
              </div>
              <div className="w-20 h-4 bg-slate-100 rounded" />
            </div>
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt size={26} />}
          title={hasFilters ? "No expenses match" : "No expenses yet"}
          hint={hasFilters ? "Try clearing the filters." : "Add your first expense to get started."}
          action={
            hasFilters
              ? <GhostButton onClick={reset}><RotateCcw size={14} /> Reset filters</GhostButton>
              : <PrimaryButton onClick={onAdd}><Plus size={14} /> Add Expense</PrimaryButton>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Date", "Title", "Category", "Campus", "Amount", "Method", ""].map((h) => (
                    <th key={h} className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDate(e.expense_date)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[28rem]">{e.title}</p>
                      {e.notes && <p className="text-[10px] text-slate-400 truncate max-w-[28rem]">{e.notes}</p>}
                    </td>
                    <td className="py-3 px-4">
                      {e.category ? (
                        <div className="inline-flex items-center gap-2">
                          <CategoryDot icon={e.category.icon} color={e.category.color} size="sm" />
                          <span className="text-xs font-semibold text-slate-700">{e.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Uncategorised</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {e.campus ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] text-[10px] font-bold border border-[#0B3C5D]/20">
                          <Building2 size={10} /> {e.campus.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-black text-[#0B3C5D] tabular-nums whitespace-nowrap">
                      {formatINR(Number(e.amount))}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">{e.payment_method}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(e)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(e)} className="p-1.5 text-slate-400 hover:text-rose-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-3 text-xs font-bold text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
