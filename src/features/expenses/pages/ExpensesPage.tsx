"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, TrendingUp, Wallet,
  PieChart as PieIcon, BarChart3, Save, CheckCircle2,
} from "lucide-react";
import {
  CUSTOM_PALETTE, DEFAULT_ITEMS, ExpenseItem, ICONS, IconKey,
} from "../types";
import {
  currentMonth, formatINR, loadItems, loadPeriod, saveItems, savePeriod,
} from "../utils/storage";
import { DistributionPie, RankingBar } from "../components/ExpenseCharts";

const fieldCls =
  "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StatCard({
  label, value, icon, accent = "bg-[#0B3C5D]", sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${accent} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

function ExpenseRow({
  item, onChange, onRemove,
}: {
  item: ExpenseItem;
  onChange: (next: Partial<ExpenseItem>) => void;
  onRemove?: () => void;
}) {
  const Icon = ICONS[item.iconKey];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: item.color }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {item.custom ? (
              <input
                type="text"
                value={item.label}
                onChange={(e) => onChange({ label: e.target.value })}
                className="text-sm font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-200 focus:border-[#0B3C5D] outline-none w-full min-w-0"
                placeholder="Expense name"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800 truncate">{item.label}</p>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-slate-400 text-sm font-semibold">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={item.amount || ""}
              onChange={(e) => onChange({ amount: Number(e.target.value) || 0 })}
              placeholder="0"
              className={`${fieldCls} font-bold text-slate-800 tabular-nums`}
            />
          </div>

          <input
            type="text"
            value={item.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Notes (optional)"
            className="mt-2 w-full px-2 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-slate-300"
          />
        </div>
      </div>
    </Card>
  );
}

export default function ExpensesPage() {
  const [items, setItems] = useState<ExpenseItem[]>(DEFAULT_ITEMS);
  const [period, setPeriod] = useState<string>(currentMonth());
  const [justSaved, setJustSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. localStorage isn't available during
  // SSR, so this must run in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setItems(loadItems());
    setPeriod(loadPeriod());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveItems(items);
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [items, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    savePeriod(period);
  }, [period, hydrated]);

  const total = useMemo(() => items.reduce((a, b) => a + (b.amount || 0), 0), [items]);
  const filledCount = useMemo(() => items.filter((i) => i.amount > 0).length, [items]);
  const top = useMemo(() => {
    if (!filledCount) return null;
    return [...items].sort((a, b) => b.amount - a.amount).find((i) => i.amount > 0) ?? null;
  }, [items, filledCount]);
  const avg = filledCount ? total / filledCount : 0;

  const updateItem = (id: string, next: Partial<ExpenseItem>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...next } : p)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const addCustom = () => {
    const color = CUSTOM_PALETTE[items.length % CUSTOM_PALETTE.length];
    const iconPool: IconKey[] = ["receipt", "bag", "coffee", "sparkles", "wallet"];
    const iconKey = iconPool[items.length % iconPool.length];
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: "New Expense",
        iconKey,
        color,
        amount: 0,
        custom: true,
      },
    ]);
  };

  const resetAll = () => {
    if (!window.confirm("Reset all expenses? Custom rows will be removed and amounts cleared.")) return;
    setItems(DEFAULT_ITEMS.map((d) => ({ ...d, amount: 0, notes: "" })));
  };

  const clearAmounts = () => {
    setItems((prev) => prev.map((p) => ({ ...p, amount: 0, notes: "" })));
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
            <Calculator size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Expense Calculator
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Track recurring monthly outlays — electricity, internet, books, salaries — and see them at a glance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <Save size={12} className={justSaved ? "text-emerald-500" : ""} />
            {justSaved ? "Saved" : "Auto-saved"}
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value || currentMonth())}
            className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
          />
          <button
            onClick={clearAmounts}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            title="Clear amounts"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50"
            title="Reset to defaults"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Expenses"
          value={formatINR(total)}
          icon={<Wallet size={18} />}
          accent="bg-[#0B3C5D]"
          sub={`${period} period`}
        />
        <StatCard
          label="Categories Used"
          value={`${filledCount} / ${items.length}`}
          icon={<CheckCircle2 size={18} />}
          accent="bg-emerald-500"
          sub={`${items.length - filledCount} empty`}
        />
        <StatCard
          label="Highest"
          value={top ? top.label : "—"}
          icon={<TrendingUp size={18} />}
          accent="bg-[#D4AF37]"
          sub={top ? formatINR(top.amount) : "No data"}
        />
        <StatCard
          label="Average / Category"
          value={formatINR(avg)}
          icon={<BarChart3 size={18} />}
          accent="bg-violet-500"
          sub={filledCount ? `Across ${filledCount} items` : "—"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Where the money goes</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Distribution
            </span>
          </div>
          <DistributionPie items={items} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Biggest cost centres</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Ranking
            </span>
          </div>
          <RankingBar items={items} />
        </Card>
      </div>

      {/* Inputs grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-800">Enter your expenses</p>
          <button
            onClick={addCustom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 rounded-xl hover:bg-[#0B3C5D]/20"
          >
            <Plus size={14} />
            Add Custom
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ExpenseRow
              key={item.id}
              item={item}
              onChange={(next) => updateItem(item.id, next)}
              onRemove={item.custom ? () => removeItem(item.id) : undefined}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Amounts are saved locally on this device. Use the same browser to retain values.
        </p>
      </div>
    </div>
  );
}
