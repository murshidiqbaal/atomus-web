"use client";

import { useMemo } from "react";
import {
  Wallet, AlertCircle, CheckCircle2, TrendingUp, Calendar, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { useCampusRevenue, useFeeStats, useMonthlyTrend } from "../hooks";
import { formatINR, shortINR } from "../types";
import { Card } from "./ui";

const COLORS = {
  Paid: "#10b981",
  Partial: "#f59e0b",
  Pending: "#64748b",
  Overdue: "#ef4444",
};

export function OverviewSection() {
  const { data: stats, isLoading: statsLoading } = useFeeStats();
  const { data: monthly = [], isLoading: monthlyLoading } = useMonthlyTrend(6);
  const { data: campuses = [], isLoading: campusesLoading } = useCampusRevenue();

  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Paid", value: stats.paidStudents, color: COLORS.Paid },
      { name: "Partial", value: stats.partialStudents, color: COLORS.Partial },
      { name: "Pending", value: stats.pendingStudents, color: COLORS.Pending },
      { name: "Overdue", value: stats.overdueStudents, color: COLORS.Overdue },
    ].filter((d) => d.value > 0);
  }, [stats]);

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          title="Today's Collection"
          value={formatINR(stats?.todayCollection ?? 0)}
          icon={<Activity size={18} />}
          tone="indigo"
          loading={statsLoading}
        />
        <KPI
          title="This Month"
          value={formatINR(stats?.monthRevenue ?? 0)}
          icon={<TrendingUp size={18} />}
          tone="emerald"
          loading={statsLoading}
        />
        <KPI
          title="Total Collected"
          value={formatINR(stats?.totalCollected ?? 0)}
          subValue={`of ${formatINR(stats?.totalBilled ?? 0)} billed`}
          icon={<Wallet size={18} />}
          tone="blue"
          loading={statsLoading}
        />
        <KPI
          title="Outstanding"
          value={formatINR(stats?.totalPending ?? 0)}
          subValue={`${stats?.overdueStudents ?? 0} overdue`}
          icon={<AlertCircle size={18} />}
          tone="amber"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          title="Paid Students"
          value={`${stats?.paidStudents ?? 0}`}
          subValue={`of ${stats?.totalStudents ?? 0}`}
          icon={<CheckCircle2 size={18} />}
          tone="emerald"
          loading={statsLoading}
        />
        <KPI
          title="Partial"
          value={`${stats?.partialStudents ?? 0}`}
          icon={<Calendar size={18} />}
          tone="amber"
          loading={statsLoading}
        />
        <KPI
          title="Pending"
          value={`${stats?.pendingStudents ?? 0}`}
          icon={<Calendar size={18} />}
          tone="slate"
          loading={statsLoading}
        />
        <KPI
          title="Collection Rate"
          value={`${stats?.collectionRate ?? 0}%`}
          icon={<Activity size={18} />}
          tone="blue"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">Collection Trend</h3>
              <p className="text-[11px] text-slate-400">Last 6 months · daily rollup</p>
            </div>
          </div>
          <div className="h-60">
            {monthlyLoading ? (
              <Skeleton />
            ) : monthly.length === 0 ? (
              <ChartEmpty label="No collections yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={shortMonthLabel}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => shortINR(v as number)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => [formatINR(Number(v ?? 0)), "Collection"]}
                    labelFormatter={(l) => shortMonthLabel(l as string)}
                  />
                  <Area
                    type="monotone"
                    dataKey="collection"
                    stroke="#0B3C5D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorColl)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Status pie */}
        <Card className="p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-black text-slate-800">Student Status</h3>
            <p className="text-[11px] text-slate-400">Distribution across {stats?.totalStudents ?? 0} students</p>
          </div>
          <div className="flex-1 relative min-h-[180px]">
            {statsLoading ? (
              <Skeleton />
            ) : statusData.length === 0 ? (
              <ChartEmpty label="No student fees yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-[#0B3C5D]">{stats?.collectionRate ?? 0}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collected</span>
                </div>
              </>
            )}
          </div>
          <ul className="space-y-2 mt-3">
            {statusData.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-bold text-slate-600">{s.name}</span>
                </span>
                <span className="font-black text-slate-800 tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Campus revenue */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-black text-slate-800">Campus Revenue Comparison</h3>
          <p className="text-[11px] text-slate-400">Collected vs outstanding by campus</p>
        </div>
        <div className="h-60">
          {campusesLoading ? (
            <Skeleton />
          ) : campuses.length === 0 ? (
            <ChartEmpty label="No campus revenue yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campuses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="campus"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => shortINR(v as number)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v) => formatINR(Number(v ?? 0))}
                />
                <Bar dataKey="collected" fill="#0B3C5D" radius={[8, 8, 0, 0]} name="Collected" />
                <Bar dataKey="pending" fill="#D4AF37" radius={[8, 8, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function shortMonthLabel(key: string): string {
  // "2026-05" → "May '26"
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIdx = Number(m) - 1;
  return `${names[monthIdx] ?? m} '${y.slice(2)}`;
}

function KPI({
  title, value, subValue, icon, tone, loading,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  tone: "blue" | "amber" | "emerald" | "indigo" | "slate";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      {loading ? (
        <div className="h-6 w-24 bg-slate-100 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-lg font-black text-slate-800 leading-tight tabular-nums truncate">{value}</p>
      )}
      {subValue && <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{subValue}</p>}
    </Card>
  );
}

function Skeleton() {
  return <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" />;
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
      {label}
    </div>
  );
}
