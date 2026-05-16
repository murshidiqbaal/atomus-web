"use client";

import { useMemo } from "react";
import {
  BarChart3, TrendingUp, IndianRupee, Layers, BookOpen, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { useCampuses, useCourses } from "../hooks";
import { Card, EmptyState, formatINR, StatCard } from "./ui";
import { COURSE_TYPES, COURSE_MODES } from "@/lib/types";

const PALETTE = ["#0B3C5D", "#D4AF37", "#06B6D4", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B"];

export function CoursesAnalytics() {
  const { data: courses = [] } = useCourses();
  const { data: campuses = [] } = useCampuses();

  const totals = useMemo(() => {
    const totalRevenue = courses.reduce((a, c) => a + (c.feeAmount ?? 0) * (c.batchCount ?? 0), 0);
    const avgFee = courses.length ? courses.reduce((a, c) => a + c.feeAmount, 0) / courses.length : 0;
    const totalBatches = courses.reduce((a, c) => a + (c.batchCount ?? 0), 0);
    const totalSubjects = courses.reduce((a, c) => a + (c.subjectCount ?? 0), 0);
    return { totalRevenue, avgFee, totalBatches, totalSubjects };
  }, [courses]);

  const byType = useMemo(
    () => COURSE_TYPES.map((t, i) => ({
      name: t,
      value: courses.filter((c) => c.courseType === t).length,
      fill: PALETTE[i % PALETTE.length],
    })).filter((d) => d.value > 0),
    [courses],
  );

  const byMode = useMemo(
    () => COURSE_MODES.map((m, i) => ({
      name: m,
      value: courses.filter((c) => c.mode === m).length,
      fill: PALETTE[(i + 2) % PALETTE.length],
    })).filter((d) => d.value > 0),
    [courses],
  );

  const feeByCampus = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const c of courses) {
      for (const cp of c.campuses ?? []) {
        const cur = m.get(cp.id) ?? { sum: 0, n: 0 };
        cur.sum += c.feeAmount;
        cur.n += 1;
        m.set(cp.id, cur);
      }
    }
    return campuses
      .map((cp) => {
        const v = m.get(cp.id);
        return {
          name: cp.name.length > 14 ? cp.name.slice(0, 12) + "…" : cp.name,
          AvgFee: v ? Math.round(v.sum / v.n) : 0,
        };
      })
      .filter((d) => d.AvgFee > 0)
      .sort((a, b) => b.AvgFee - a.AvgFee)
      .slice(0, 8);
  }, [campuses, courses]);

  const topByBatches = useMemo(
    () => [...courses]
      .sort((a, b) => (b.batchCount ?? 0) - (a.batchCount ?? 0))
      .slice(0, 5),
    [courses],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Potential Revenue"
          value={formatINR(totals.totalRevenue)}
          icon={<IndianRupee size={18} />}
          accent="bg-[#0B3C5D]"
          sub="Fee × batches"
        />
        <StatCard
          label="Average Fee"
          value={formatINR(totals.avgFee)}
          icon={<TrendingUp size={18} />}
          accent="bg-[#D4AF37]"
          sub={`Across ${courses.length} courses`}
        />
        <StatCard
          label="Total Batches"
          value={totals.totalBatches}
          icon={<Layers size={18} />}
          accent="bg-violet-500"
        />
        <StatCard
          label="Total Subjects"
          value={totals.totalSubjects}
          icon={<BookOpen size={18} />}
          accent="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Courses by type</p>
          </div>
          {byType.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="No data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ percent }) =>
                      (percent ?? 0) > 0.06 ? `${Math.round((percent ?? 0) * 100)}%` : ""
                    }
                  >
                    {byType.map((d, i) => (
                      <Cell key={i} fill={d.fill} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Courses by mode</p>
          </div>
          {byMode.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="No data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMode} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {byMode.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <IndianRupee size={16} className="text-[#0B3C5D]" />
          <p className="text-sm font-bold text-slate-800">Average fee by campus</p>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">Top 8</span>
        </div>
        {feeByCampus.length === 0 ? (
          <EmptyState icon={<IndianRupee size={22} />} title="No data yet" hint="Assign courses to campuses to see this chart." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeByCampus} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => formatINR(Number(v))} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(v) => [formatINR(Number(v) || 0), "Avg fee"] as [string, string]}
                />
                <Bar dataKey="AvgFee" fill="#D4AF37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-[#D4AF37]" />
          <p className="text-sm font-bold text-slate-800">Top courses by batch count</p>
        </div>
        {topByBatches.length === 0 ? (
          <EmptyState icon={<Trophy size={22} />} title="No courses yet" />
        ) : (
          <ul className="space-y-2">
            {topByBatches.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                  ${i === 0 ? "bg-[#D4AF37] text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600/80 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.classLevel ?? "—"} · {c.courseType} · {c.mode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#0B3C5D] tabular-nums">{c.batchCount ?? 0}</p>
                  <p className="text-[10px] text-slate-400">batches</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
