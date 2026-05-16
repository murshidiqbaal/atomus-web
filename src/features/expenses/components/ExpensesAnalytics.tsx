"use client";

import { useMemo } from "react";
import {
  BarChart3, TrendingUp, Trophy, Activity, IndianRupee,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Legend,
} from "recharts";
import { useAnalyticsData } from "../hooks";
import {
  Card, EmptyState, formatINR, formatINRCompact, formatMonthShort, StatCard,
} from "./ui";

interface MonthBucket {
  key: string;
  label: string;
  total: number;
  date: Date;
}

export function ExpensesAnalytics() {
  const { data: rows = [], isLoading } = useAnalyticsData();

  // ── 12-month line chart ─────────────────────────────────────────
  const trend12 = useMemo<MonthBucket[]>(() => {
    const now = new Date();
    const months: MonthBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: formatMonthShort(d), total: 0, date: d });
    }
    for (const e of rows) {
      const d = new Date(e.expense_date);
      const slot = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (slot) slot.total += Number(e.amount);
    }
    return months;
  }, [rows]);

  // ── Category breakdown ───────────────────────────────────────────
  const byCategory = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string; value: number }>();
    for (const e of rows) {
      if (!e.category) continue;
      const cur = m.get(e.category.id);
      if (cur) cur.value += Number(e.amount);
      else m.set(e.category.id, {
        id: e.category.id, name: e.category.name, color: e.category.color, value: Number(e.amount),
      });
    }
    return Array.from(m.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const categoryTotal = byCategory.reduce((s, c) => s + c.value, 0);

  // ── Campus breakdown ─────────────────────────────────────────────
  const byCampus = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>();
    for (const e of rows) {
      const name = e.campus?.name ?? "Unassigned";
      const cur = m.get(name);
      if (cur) cur.total += Number(e.amount);
      else m.set(name, { name, total: Number(e.amount) });
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  // ── Month-on-month comparison ────────────────────────────────────
  const monthOverMonth = useMemo(() => {
    if (trend12.length < 2) return { current: 0, prev: 0, delta: 0, pct: 0 };
    const current = trend12[trend12.length - 1].total;
    const prev    = trend12[trend12.length - 2].total;
    const delta = current - prev;
    const pct = prev > 0 ? (delta / prev) * 100 : current > 0 ? 100 : 0;
    return { current, prev, delta, pct };
  }, [trend12]);

  // ── Highest single month ─────────────────────────────────────────
  const peakMonth = useMemo(() => {
    let best: MonthBucket | null = null;
    for (const m of trend12) if (!best || m.total > best.total) best = m;
    return best;
  }, [trend12]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-5 h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={26} />}
        title="Not enough data for analytics yet"
        hint="Add some expenses to unlock trends, comparisons, and breakdowns."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="This Month"
          value={formatINR(monthOverMonth.current)}
          icon={<TrendingUp size={18} />}
          accent="bg-[#0B3C5D]"
          sub={`${monthOverMonth.delta >= 0 ? "▲" : "▼"} ${Math.abs(monthOverMonth.pct).toFixed(1)}% vs prev`}
        />
        <StatCard
          label="Previous Month"
          value={formatINR(monthOverMonth.prev)}
          icon={<TrendingUp size={18} />}
          accent="bg-slate-500"
        />
        <StatCard
          label="Peak Month"
          value={peakMonth ? peakMonth.label : "—"}
          icon={<Trophy size={18} />}
          accent="bg-[#D4AF37]"
          sub={peakMonth ? formatINR(peakMonth.total) : "No data"}
        />
        <StatCard
          label="Top Category"
          value={byCategory[0]?.name ?? "—"}
          icon={<Activity size={18} />}
          accent="bg-violet-500"
          sub={byCategory[0] ? formatINR(byCategory[0].value) : "No data"}
        />
      </div>

      {/* 12-month line */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[#0B3C5D]" />
          <p className="text-sm font-bold text-slate-800">12-month spending trend</p>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">Total per month</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend12} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatINRCompact(Number(v))} />
              <Tooltip
                formatter={(v) => [formatINR(Number(v) || 0), "Total"] as [string, string]}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
              />
              <Line type="monotone" dataKey="total" stroke="#0B3C5D" strokeWidth={2.5} dot={{ r: 3, fill: "#D4AF37" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category & Campus side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Category comparison</p>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="No categorised expenses" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byCategory.slice(0, 8).map((c) => ({
                    name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name,
                    Spend: Math.round(c.value),
                    fill: c.color,
                  }))}
                  layout="vertical"
                  margin={{ top: 6, right: 18, left: 6, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => formatINRCompact(Number(v))}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} width={120} />
                  <Tooltip
                    formatter={(v) => [formatINR(Number(v) || 0), "Spend"] as [string, string]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Bar dataKey="Spend" radius={[0, 8, 8, 0]}>
                    {byCategory.slice(0, 8).map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Spend split (categories)</p>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="No data" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory.slice(0, 6)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ percent }) => (percent ?? 0) > 0.06 ? `${Math.round((percent ?? 0) * 100)}%` : ""}
                  >
                    {byCategory.slice(0, 6).map((c, i) => <Cell key={i} fill={c.color} stroke="#fff" strokeWidth={2} />)}
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

      {/* Campus row */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-[#0B3C5D]" />
          <p className="text-sm font-bold text-slate-800">Campus-wise spend</p>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">Last 365 days</span>
        </div>
        {byCampus.length === 0 ? (
          <EmptyState icon={<BarChart3 size={22} />} title="No campus-tagged expenses" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCampus.slice(0, 8)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatINRCompact(Number(v))} />
                <Tooltip
                  formatter={(v) => [formatINR(Number(v) || 0), "Total"] as [string, string]}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Bar dataKey="total" fill="#D4AF37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Category contribution table */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <IndianRupee size={16} className="text-[#0B3C5D]" />
          <p className="text-sm font-bold text-slate-800">Contribution by category</p>
        </div>
        {byCategory.length === 0 ? (
          <EmptyState icon={<IndianRupee size={22} />} title="No data" />
        ) : (
          <div className="space-y-2.5">
            {byCategory.map((c) => {
              const pct = categoryTotal > 0 ? (c.value / categoryTotal) * 100 : 0;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{c.name}</span>
                    <span className="font-bold text-slate-500 tabular-nums">
                      {formatINR(c.value)} <span className="text-slate-400 font-normal">· {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
