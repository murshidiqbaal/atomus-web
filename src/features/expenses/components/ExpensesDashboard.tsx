"use client";

import { useMemo } from "react";
import {
  IndianRupee, CalendarDays, TrendingUp, Building2, Wallet, Sparkles,
  BarChart3, PieChart as PieIcon, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAnalyticsData, useExpenses } from "../hooks";
import { EMPTY_FILTERS } from "../types";
import {
  Card, EmptyState, formatINR, formatINRCompact, formatMonthShort, StatCard,
} from "./ui";

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ExpensesDashboard({ onJumpToEntries }: { onJumpToEntries?: () => void }) {
  const { data: analytics = [], isLoading: aLoading } = useAnalyticsData();
  const { data: thisMonth = [] } = useExpenses({ ...EMPTY_FILTERS, period: "month" });

  const stats = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);

    const total = analytics.reduce((s, e) => s + Number(e.amount), 0);
    const today_total = analytics
      .filter((e) => isSameDay(new Date(e.expense_date), today))
      .reduce((s, e) => s + Number(e.amount), 0);
    const month_total = analytics
      .filter((e) => new Date(e.expense_date) >= monthStart)
      .reduce((s, e) => s + Number(e.amount), 0);

    // Top category by spend (within last 365 days)
    const byCat = new Map<string, { name: string; color: string; sum: number }>();
    for (const e of analytics) {
      if (!e.category) continue;
      const cur = byCat.get(e.category.id);
      if (cur) cur.sum += Number(e.amount);
      else byCat.set(e.category.id, {
        name: e.category.name, color: e.category.color, sum: Number(e.amount),
      });
    }
    let top: { name: string; color: string; sum: number } | null = null;
    for (const v of byCat.values()) if (!top || v.sum > top.sum) top = v;

    // Average monthly spending (over the months that have at least one row)
    const monthsWithData = new Set<string>();
    for (const e of analytics) {
      const d = new Date(e.expense_date);
      monthsWithData.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    const avgMonthly = monthsWithData.size > 0 ? total / monthsWithData.size : 0;

    return { total, today_total, month_total, top, avgMonthly };
  }, [analytics]);

  // Trend data: 6-month area chart
  const trend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: formatMonthShort(d),
        total: 0,
        date: d,
      });
    }
    for (const e of analytics) {
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const slot = months.find((m) => m.key === k);
      if (slot) slot.total += Number(e.amount);
    }
    return months;
  }, [analytics]);

  // Category breakdown for the pie chart
  const catBreakdown = useMemo(() => {
    const m = new Map<string, { name: string; color: string; value: number }>();
    for (const e of thisMonth) {
      if (!e.category) continue;
      const cur = m.get(e.category.id);
      if (cur) cur.value += Number(e.amount);
      else m.set(e.category.id, { name: e.category.name, color: e.category.color, value: Number(e.amount) });
    }
    return Array.from(m.values()).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  }, [thisMonth]);

  // Campus bar chart for current month
  const campusBar = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>();
    for (const e of thisMonth) {
      const name = e.campus?.name ?? "Unassigned";
      const cur = m.get(name);
      if (cur) cur.total += Number(e.amount);
      else m.set(name, { name, total: Number(e.amount) });
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [thisMonth]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Spent"
          value={aLoading ? "—" : formatINR(stats.total)}
          icon={<Wallet size={18} />}
          accent="bg-[#0B3C5D]"
          sub="Last 365 days"
        />
        <StatCard
          label="Today"
          value={aLoading ? "—" : formatINR(stats.today_total)}
          icon={<CalendarDays size={18} />}
          accent="bg-emerald-500"
        />
        <StatCard
          label="This Month"
          value={aLoading ? "—" : formatINR(stats.month_total)}
          icon={<TrendingUp size={18} />}
          accent="bg-[#D4AF37]"
        />
        <StatCard
          label="Top Category"
          value={stats.top ? stats.top.name : "—"}
          icon={<Sparkles size={18} />}
          accent="bg-violet-500"
          sub={stats.top ? formatINR(stats.top.sum) : "No data"}
        />
        <StatCard
          label="Avg / Month"
          value={aLoading ? "—" : formatINR(stats.avgMonthly)}
          icon={<IndianRupee size={18} />}
          accent="bg-rose-500"
        />
      </div>

      {/* Trend + Category split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Monthly spending trend</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">Last 6 months</span>
          </div>
          {trend.every((m) => m.total === 0) ? (
            <EmptyState icon={<Activity size={22} />} title="No expenses yet" hint="Add an expense to start seeing trends." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B3C5D" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0B3C5D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatINRCompact(Number(v))} />
                  <Tooltip
                    formatter={(v) => [formatINR(Number(v) || 0), "Total"] as [string, string]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0B3C5D" strokeWidth={2.5} fill="url(#expSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-[#D4AF37]" />
            <p className="text-sm font-bold text-slate-800">By category</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">This month</span>
          </div>
          {catBreakdown.length === 0 ? (
            <EmptyState icon={<PieIcon size={22} />} title="No categorised spending" hint="Assign categories when adding expenses." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ percent }) => (percent ?? 0) > 0.06 ? `${Math.round((percent ?? 0) * 100)}%` : ""}
                  >
                    {catBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [formatINR(Number(v) || 0), "Spent"] as [string, string]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Campus split + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Campus-wise spend</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">This month</span>
          </div>
          {campusBar.length === 0 ? (
            <EmptyState icon={<Building2 size={22} />} title="No campus-tagged expenses" hint="Pick a campus when adding entries." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campusBar} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatINRCompact(Number(v))} />
                  <Tooltip
                    formatter={(v) => [formatINR(Number(v) || 0), "Total"] as [string, string]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Bar dataKey="total" fill="#0B3C5D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-[#0B3C5D]" />
              <p className="text-sm font-bold text-slate-800">Recent entries</p>
            </div>
            {onJumpToEntries && (
              <button onClick={onJumpToEntries} className="text-[11px] font-bold text-[#0B3C5D] hover:underline">
                View all →
              </button>
            )}
          </div>
          {thisMonth.length === 0 ? (
            <EmptyState icon={<Wallet size={22} />} title="No expenses this month" />
          ) : (
            <ul className="space-y-2">
              {thisMonth.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50">
                  <div
                    className="w-2 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: e.category?.color ?? "#94A3B8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{e.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {e.category?.name ?? "Uncategorised"} · {new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <p className="text-sm font-black text-[#0B3C5D] tabular-nums">{formatINR(Number(e.amount))}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
