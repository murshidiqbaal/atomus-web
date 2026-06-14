"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Calculator, Plus, TrendingUp, Wallet,
  PieChart as PieIcon, BarChart3, Calendar,
  Building2, Tag, IndianRupee, Sparkles, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import {
  useExpenseCategories, useExpCampuses, useExpenses,
} from "../hooks";
import { ExpenseModal } from "../components/ExpenseModal";
import { ExpensesHistory } from "../components/ExpensesHistory";
import { CategoriesPanel } from "../components/CategoriesPanel";
import { CategoryModal } from "../components/CategoryModal";
import {
  Card, StatCard, ToastStack, useToasts, formatINR, formatINRCompact
} from "../components/ui";

const ALL_CAMPUSES = "_all";

const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "entries" | "categories">("overview");
  const [period, setPeriod] = useState<string>(currentMonth);
  const [campusId, setCampusId] = useState<string>(ALL_CAMPUSES);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Toast stack
  const { toasts, add: addToast, dismiss: dismissToast } = useToasts();

  // Fetch lookups
  const { data: campuses = [] } = useExpCampuses();

  // Synchronize selectedYear when period changes
  useEffect(() => {
    if (period) {
      const y = Number(period.split("-")[0]);
      if (y && !isNaN(y)) {
        setSelectedYear(y);
      }
    }
  }, [period]);

  // Fetch live dashboard dataset from Supabase scoped to selectedYear
  const { data: yearExpenses = [], isLoading: loadingDashboard } = useExpenses({
    search: "",
    category_id: "",
    campus_id: campusId === ALL_CAMPUSES ? "" : campusId,
    payment_method: "",
    period: "all",
    date_from: `${selectedYear}-01-01`,
    date_to: `${selectedYear}-12-31`,
  });

  const activeCampusName = useMemo(() => {
    if (campusId === ALL_CAMPUSES) return "All Campuses";
    return campuses.find((c) => c.id === campusId)?.name ?? "All Campuses";
  }, [campusId, campuses]);

  // Derived state computations for selected month
  const monthExpenses = useMemo(() => {
    return yearExpenses.filter((e) => e.expense_date.startsWith(period));
  }, [yearExpenses, period]);

  const monthTotal = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [monthExpenses]);

  const yearTotal = useMemo(() => {
    return yearExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [yearExpenses]);

  const daysInMonth = useMemo(() => {
    if (!period) return 30;
    const [y, m] = period.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [period]);

  const avgDaily = useMemo(() => {
    return monthTotal / daysInMonth;
  }, [monthTotal, daysInMonth]);

  // Category breakdown for selected month
  const categoryBreakdown = useMemo(() => {
    const m = new Map<string, { name: string; color: string; value: number }>();
    monthExpenses.forEach((e) => {
      const catId = e.category_id ?? "uncategorized";
      const name = e.category?.name ?? "Uncategorised";
      const color = e.category?.color ?? "#94A3B8";
      const val = m.get(catId) ?? { name, color, value: 0 };
      val.value += Number(e.amount || 0);
      m.set(catId, val);
    });
    return Array.from(m.values()).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const topCategory = useMemo(() => {
    return categoryBreakdown[0] ?? null;
  }, [categoryBreakdown]);

  // Campus breakdown for selected month
  const campusBreakdown = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>();
    monthExpenses.forEach((e) => {
      const name = e.campus?.name ?? "Unassigned";
      const val = m.get(name) ?? { name, total: 0 };
      val.total += Number(e.amount || 0);
      m.set(name, val);
    });
    return Array.from(m.values()).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  // Monthly daily-trend dataset
  const dailyData = useMemo(() => {
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0");
      const dateKey = `${period}-${dayStr}`;
      const total = monthExpenses
        .filter((e) => e.expense_date === dateKey)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      data.push({ day: d, date: dateKey, total });
    }
    return data;
  }, [period, monthExpenses, daysInMonth]);

  // Yearly monthly-trend dataset
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yearlyData = useMemo(() => {
    return MONTH_LABELS.map((label, idx) => {
      const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
      const total = yearExpenses
        .filter((e) => e.expense_date.startsWith(monthKey))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { month: label, monthKey, total };
    });
  }, [selectedYear, yearExpenses]);

  const tabs = [
    { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
    { id: "entries", label: "Daily Entries", icon: Calendar },
    { id: "categories", label: "Categories", icon: Tag },
  ] as const;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#0B3C5D] rounded-2xl flex items-center justify-center text-[#D4AF37]">
              <Calculator size={20} />
            </div>
            <h1 className="text-2xl font-black text-[#0B3C5D] tracking-tight">Institutional Expenses</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Track, filter, and analyze operational costs and budgets across all coaching center branches.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            className="bg-[#D4AF37] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-amber-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Record Daily Expense
          </button>
        </div>
      </header>

      {/* Tabs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1 p-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#0B3C5D] text-white shadow-md"
                  : "text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-50"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="flex items-center gap-2 px-2 flex-wrap">
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="pl-7 pr-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border-none rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#0B3C5D]/10"
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
              onChange={(e) => setPeriod(e.target.value || currentMonth())}
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border-none rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#0B3C5D]/10"
            />

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border-none rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#0B3C5D]/10"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="min-h-[450px]">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Monthly Spend"
                value={loadingDashboard ? "—" : formatINR(monthTotal)}
                icon={<Wallet size={18} />}
                accent="bg-[#0B3C5D]"
                sub={`${activeCampusName} · ${period}`}
              />
              <StatCard
                label="Yearly Spend"
                value={loadingDashboard ? "—" : formatINR(yearTotal)}
                icon={<Activity size={18} />}
                accent="bg-violet-500"
                sub={`${activeCampusName} · ${selectedYear}`}
              />
              <StatCard
                label="Daily Average (Month)"
                value={loadingDashboard ? "—" : formatINR(avgDaily)}
                icon={<IndianRupee size={18} />}
                accent="bg-emerald-500"
                sub={`Across ${daysInMonth} days`}
              />
              <StatCard
                label="Top Month Category"
                value={loadingDashboard ? "—" : topCategory ? topCategory.name : "—"}
                icon={<Sparkles size={18} />}
                accent="bg-[#D4AF37]"
                sub={topCategory ? `${formatINR(topCategory.value)} spent` : "No data"}
              />
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Day-by-Day Graph */}
              <Card className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Monthly Expense Graph</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Daily cash outflow trend for {new Date(period + "-02").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      Daily Curve
                    </span>
                  </div>

                  {loadingDashboard ? (
                    <div className="h-72 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                    </div>
                  ) : monthTotal === 0 ? (
                    <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
                      <TrendingUp size={28} className="mb-2 opacity-40 text-[#0B3C5D]" />
                      <p className="text-xs font-bold">No data for selected month</p>
                      <p className="text-[10px] mt-0.5">Use the "Daily Entries" tab to record expenses.</p>
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="monthDailyColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 9 }}
                            tickFormatter={(v) => formatINRCompact(v)}
                          />
                          <RechartsTooltip
                            formatter={(v) => [formatINR(Number(v) || 0), "Daily Total"] as [string, string]}
                            labelFormatter={(label) => `Day ${label}`}
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#0B3C5D"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#monthDailyColor)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </Card>

              {/* Yearly Month-by-Month Graph */}
              <Card className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Yearly Expense Graph</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Monthly institutional budget outflows for {selectedYear}
                      </p>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      Annual Trend
                    </span>
                  </div>

                  {loadingDashboard ? (
                    <div className="h-72 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                    </div>
                  ) : yearTotal === 0 ? (
                    <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
                      <TrendingUp size={28} className="mb-2 opacity-40 text-[#0B3C5D]" />
                      <p className="text-xs font-bold">No records found for year {selectedYear}</p>
                      <p className="text-[10px] mt-0.5">Add expenses across months to see the yearly breakdown.</p>
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="yearMonthlyColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 9 }}
                            tickFormatter={(v) => formatINRCompact(v)}
                          />
                          <RechartsTooltip
                            formatter={(v) => [formatINR(Number(v) || 0), "Monthly Total"] as [string, string]}
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#D4AF37"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#yearMonthlyColor)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Breakdowns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown list */}
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Category Share ({period})</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Top expense categories this month</p>
                  </div>
                  <PieIcon size={16} className="text-slate-400" />
                </div>

                {loadingDashboard ? (
                  <div className="py-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                  </div>
                ) : categoryBreakdown.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <p className="text-xs font-bold">No category allocation available</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {categoryBreakdown.map((c) => {
                      const pct = Math.round((c.value / monthTotal) * 100);
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-600 truncate max-w-[180px]">{c.name}</span>
                            <span className="text-slate-800 tabular-nums">
                              {formatINR(c.value)} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: c.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Campus split list */}
              <Card className="p-5 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Campus Allocation</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Spend distribution by campus ({period})</p>
                  </div>
                  <Building2 size={16} className="text-slate-400" />
                </div>

                {loadingDashboard ? (
                  <div className="py-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                  </div>
                ) : campusBreakdown.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <p className="text-xs font-bold">No campus spend recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {campusBreakdown.map((c) => {
                      const pct = Math.round((c.total / monthTotal) * 100);
                      return (
                        <div key={c.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600 truncate max-w-[120px]">{c.name}</span>
                            <span className="text-slate-800 tabular-nums">{formatINR(c.total)}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0B3C5D] h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === "entries" && (
          <div className="animate-in fade-in duration-300">
            <ExpensesHistory
              onAdd={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onEdit={(e) => {
                setEditingExpense(e);
                setIsExpenseModalOpen(true);
              }}
              onToast={addToast}
            />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="animate-in fade-in duration-300">
            <CategoriesPanel
              onAdd={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              onEdit={(c) => {
                setEditingCategory(c);
                setIsCategoryModalOpen(true);
              }}
              onToast={addToast}
            />
          </div>
        )}
      </div>

      {/* Live Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onToast={addToast}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onToast={addToast}
      />

      {/* Toast Notification Container */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
