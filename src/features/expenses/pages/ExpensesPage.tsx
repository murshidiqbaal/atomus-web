"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, TrendingUp, Wallet,
  PieChart as PieIcon, BarChart3, Save, CheckCircle2, ChevronLeft, Calendar,
  Building2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CUSTOM_PALETTE, DEFAULT_ITEMS, ExpenseItem, ICONS, IconKey,
} from "../types";
import {
  ALL_CAMPUSES, currentMonth, formatINR, getYearlyData, loadCampus, loadItems,
  loadPeriod, saveCampus, saveItems, savePeriod,
} from "../utils/storage";
import { DistributionPie, RankingBar } from "../components/ExpenseCharts";
import { useExpCampuses } from "../hooks";

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
  item, onChange, onRemove, readOnly = false,
}: {
  item: ExpenseItem;
  onChange: (next: Partial<ExpenseItem>) => void;
  onRemove?: () => void;
  readOnly?: boolean;
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
            {item.custom && !readOnly ? (
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
            {onRemove && !readOnly && (
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
            {readOnly ? (
              <p className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 tabular-nums bg-slate-50 border border-slate-100 rounded-xl">
                {(item.amount || 0).toLocaleString("en-IN")}
              </p>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={item.amount || ""}
                onChange={(e) => onChange({ amount: Number(e.target.value) || 0 })}
                placeholder="0"
                className={`${fieldCls} font-bold text-slate-800 tabular-nums`}
              />
            )}
          </div>

          {readOnly ? (
            item.notes ? (
              <p className="mt-2 w-full px-2 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg truncate" title={item.notes}>
                {item.notes}
              </p>
            ) : null
          ) : (
            <input
              type="text"
              value={item.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Notes (optional)"
              className="mt-2 w-full px-2 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-slate-300"
            />
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ExpensesPage() {
  const [items, setItems] = useState<ExpenseItem[]>(DEFAULT_ITEMS);
  const [period, setPeriod] = useState<string>(currentMonth());
  const [campusId, setCampusId] = useState<string>(ALL_CAMPUSES);
  const [justSaved, setJustSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showYearlyAnalysis, setShowYearlyAnalysis] = useState(false);

  const { data: campuses = [] } = useExpCampuses();

  const currentYear = useMemo(() => {
    try {
      return new Date(period).getFullYear() || new Date().getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  }, [period]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const activeCampusName = useMemo(() => {
    if (campusId === ALL_CAMPUSES) return "All Campuses";
    return campuses.find((c) => c.id === campusId)?.name ?? "All Campuses";
  }, [campusId, campuses]);

  // "All Campuses" is a computed aggregate, not an editable bucket.
  const isAggregate = campusId === ALL_CAMPUSES;

  // Sync selected year if period changes
  useEffect(() => {
    setSelectedYear(currentYear);
  }, [currentYear]);

  // Hydrate from localStorage on mount. localStorage isn't available during SSR.
  useEffect(() => {
    const p = loadPeriod();
    const c = loadCampus();
    setPeriod(p);
    setCampusId(c);
    setItems(loadItems(p, c));
    setHydrated(true);
  }, []);

  // Save current items to current period+campus automatically whenever they change.
  useEffect(() => {
    if (!hydrated) return;
    if (campusId === ALL_CAMPUSES) return; // aggregate view is computed — never persist
    saveItems(period, campusId, items);
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [items, period, campusId, hydrated]);

  // Re-aggregate when the user lands on (or returns to) All Campuses so the
  // view reflects the latest per-campus data.
  useEffect(() => {
    if (!hydrated) return;
    if (campusId !== ALL_CAMPUSES) return;
    setItems(loadItems(period, ALL_CAMPUSES));
  }, [hydrated, campusId, period]);

  // Save period choice.
  useEffect(() => {
    if (!hydrated) return;
    savePeriod(period);
  }, [period, hydrated]);

  // Save campus choice.
  useEffect(() => {
    if (!hydrated) return;
    saveCampus(campusId);
  }, [campusId, hydrated]);

  const total = useMemo(() => items.reduce((a, b) => a + (b.amount || 0), 0), [items]);
  const filledCount = useMemo(() => items.filter((i) => i.amount > 0).length, [items]);
  const top = useMemo(() => {
    if (!filledCount) return null;
    return [...items].sort((a, b) => b.amount - a.amount).find((i) => i.amount > 0) ?? null;
  }, [items, filledCount]);
  const avg = filledCount ? total / filledCount : 0;

  // Monthly change transaction to prevent race conditions.
  const handlePeriodChange = (nextPeriod: string) => {
    if (!hydrated) return;
    saveItems(period, campusId, items); // save old month for current campus
    setPeriod(nextPeriod);
    savePeriod(nextPeriod);
    const loaded = loadItems(nextPeriod, campusId); // load new month for current campus
    setItems(loaded);
  };

  // Campus change — persist current items to the previous (period, campus)
  // pair, then swap to the new campus's data for the same period.
  const handleCampusChange = (nextCampusId: string) => {
    if (!hydrated) return;
    if (nextCampusId === campusId) return;
    saveItems(period, campusId, items);
    setCampusId(nextCampusId);
    saveCampus(nextCampusId);
    setItems(loadItems(period, nextCampusId));
  };

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

  // Yearly data calculations (scoped to currently selected campus)
  const yearlyData = useMemo(
    () => getYearlyData(selectedYear, campusId),
    [selectedYear, campusId],
  );

  const yearlyTotal = useMemo(() => yearlyData.reduce((acc, curr) => acc + curr.total, 0), [yearlyData]);

  const yearlyAvg = useMemo(() => {
    const activeMonths = yearlyData.filter((d) => d.total > 0).length;
    return activeMonths ? yearlyTotal / activeMonths : 0;
  }, [yearlyData, yearlyTotal]);

  const peakMonth = useMemo(() => {
    if (yearlyTotal === 0) return null;
    return [...yearlyData].sort((a, b) => b.total - a.total)[0];
  }, [yearlyData, yearlyTotal]);

  const yearlyCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    yearlyData.forEach((d) => {
      Object.entries(d.breakdown).forEach(([label, amt]) => {
        totals[label] = (totals[label] || 0) + amt;
      });
    });
    return Object.entries(totals)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearlyData]);

  // If showing yearly analysis panel
  if (showYearlyAnalysis) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowYearlyAnalysis(false)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#0B3C5D] hover:border-[#0B3C5D] transition-all active:scale-95 shadow-sm group shrink-0"
              title="Back to Monthly Entry"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Yearly Analysis ({selectedYear})
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCampusName} · Overview of annual spending, seasonal trends, and department-wise cost allocations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={campusId}
                onChange={(e) => handleCampusChange(e.target.value)}
                className="pl-7 pr-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10"
                title="Campus"
              >
                <option value={ALL_CAMPUSES}>All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowYearlyAnalysis(false)}
              className="px-4 py-2.5 text-sm font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 hover:bg-[#0B3C5D]/20 rounded-xl transition-all active:scale-95"
            >
              Monthly Calculator
            </button>
          </div>
        </div>

        {/* Yearly KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Annual Spending"
            value={formatINR(yearlyTotal)}
            icon={<Wallet size={18} />}
            accent="bg-[#0B3C5D]"
            sub={`${activeCampusName} · ${selectedYear}`}
          />
          <StatCard
            label="Monthly Average"
            value={formatINR(yearlyAvg)}
            icon={<BarChart3 size={18} />}
            accent="bg-violet-500"
            sub="Across active months"
          />
          <StatCard
            label="Peak Outlay"
            value={peakMonth ? peakMonth.month : "—"}
            icon={<TrendingUp size={18} />}
            accent="bg-[#D4AF37]"
            sub={peakMonth ? formatINR(peakMonth.total) : "No data"}
          />
          <StatCard
            label="Top Category"
            value={yearlyCategories.length ? yearlyCategories[0].label : "—"}
            icon={<PieIcon size={18} />}
            accent="bg-emerald-500"
            sub={yearlyCategories.length ? formatINR(yearlyCategories[0].amount) : "No data"}
          />
        </div>

        {/* Yearly Graph Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-bold text-slate-800">Monthly Expense Curve</p>
                <p className="text-xs text-slate-400 mt-0.5">Fluctuations in institutional budget outflows</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                Annual Trend
              </span>
            </div>

            {yearlyTotal === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
                <TrendingUp size={28} className="mb-2 opacity-50 text-[#0B3C5D]" />
                <p className="text-sm font-semibold">No annual records found</p>
                <p className="text-xs mt-1">Enter monthly expenses to populate this year's graph.</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="yearlyColorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => formatINR(v)}
                    />
                    <RechartsTooltip
                      formatter={(v) => [formatINR(Number(v) || 0), "Total Expenses"] as [string, string]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#0B3C5D"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#yearlyColorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Top Categories Card */}
          <Card className="p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Category Share</p>
                  <p className="text-xs text-slate-400 mt-0.5">Top expense categories this year</p>
                </div>
                <PieIcon size={16} className="text-slate-400" />
              </div>

              {yearlyCategories.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <p className="text-xs font-bold">No category data available</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                  {yearlyCategories.map((c) => {
                    const pct = Math.round((c.amount / yearlyTotal) * 100);
                    return (
                      <div key={c.label} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-600 truncate max-w-[120px]">{c.label}</span>
                          <span className="text-slate-800 tabular-nums">{formatINR(c.amount)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0B3C5D] h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {yearlyCategories.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-4 leading-normal">
                These categories represent cumulative outlays calculated from all months in year {selectedYear}.
              </p>
            )}
          </Card>
        </div>

        {/* Monthly Breakdown Table */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Monthly Breakdown Overview</p>
              <p className="text-xs text-slate-400 mt-0.5">Status and cost centers for each calendar month</p>
            </div>
            <Calendar size={16} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Total Spending</th>
                  <th className="py-3 px-4">Top Cost Category</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((d) => {
                  const sortedBreakdown = Object.entries(d.breakdown).sort((a, b) => b[1] - a[1]);
                  const topCat = sortedBreakdown.length ? sortedBreakdown[0] : null;

                  return (
                    <tr key={d.monthKey} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{d.month}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 tabular-nums">
                        {d.total > 0 ? formatINR(d.total) : <span className="text-slate-300 font-semibold">₹0</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {topCat ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                            {topCat[0]} ({formatINR(topCat[1])})
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setPeriod(d.monthKey);
                            setItems(loadItems(d.monthKey, campusId));
                            setShowYearlyAnalysis(false);
                          }}
                          className="px-3 py-1 text-xs font-bold text-[#0B3C5D] border border-[#0B3C5D]/20 hover:border-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-lg transition-all"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

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
              {activeCampusName} · Track recurring monthly outlays — electricity, internet, books, salaries — and see them at a glance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {isAggregate ? (
              <>
                <Calculator size={12} className="text-[#0B3C5D]" />
                Computed
              </>
            ) : (
              <>
                <Save size={12} className={justSaved ? "text-emerald-500" : ""} />
                {justSaved ? "Saved" : "Auto-saved"}
              </>
            )}
          </div>
          <div className="relative">
            <Building2
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={campusId}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="pl-7 pr-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
              title="Campus"
            >
              <option value={ALL_CAMPUSES}>All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value || currentMonth())}
            className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
          />
          <button
            onClick={() => setShowYearlyAnalysis(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-[#0B3C5D]/10 active:scale-95"
            title="Yearly Analysis"
          >
            <TrendingUp size={14} />
            <span>Year Analysis</span>
          </button>
          <button
            onClick={clearAmounts}
            disabled={isAggregate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isAggregate ? "Switch to a specific campus to clear" : "Clear amounts"}
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={resetAll}
            disabled={isAggregate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isAggregate ? "Switch to a specific campus to reset" : "Reset to defaults"}
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
          sub={`${activeCampusName} · ${period}`}
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
          <p className="text-sm font-bold text-slate-800">
            {isAggregate ? "Aggregated across all campuses" : "Enter your expenses"}
          </p>
          {!isAggregate && (
            <button
              onClick={addCustom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 rounded-xl hover:bg-[#0B3C5D]/20"
            >
              <Plus size={14} />
              Add Custom
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ExpenseRow
              key={item.id}
              item={item}
              readOnly={isAggregate}
              onChange={(next) => updateItem(item.id, next)}
              onRemove={!isAggregate && item.custom ? () => removeItem(item.id) : undefined}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          {isAggregate
            ? "Totals are summed live from every campus that has saved data for this period. Pick a campus to edit its numbers."
            : "Amounts are saved locally on this device. Use the same browser to retain values."}
        </p>
      </div>
    </div>
  );
}
