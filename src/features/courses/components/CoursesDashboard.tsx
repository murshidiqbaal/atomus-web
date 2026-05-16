"use client";

import { useMemo } from "react";
import {
  BookOpen, CheckCircle2, Wifi, Building2, Layers, Activity, Sparkles,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useCampuses, useCourses } from "../hooks";
import { Card, EmptyState, StatCard } from "./ui";
import type { Course } from "@/lib/types";

const MODE_COLORS: Record<string, string> = {
  Offline: "#0B3C5D",
  Online: "#06B6D4",
  Hybrid: "#8B5CF6",
};

export function CoursesDashboard({ onJumpToCourses }: { onJumpToCourses?: () => void }) {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: campuses = [], isLoading: campusesLoading } = useCampuses();

  const stats = useMemo(() => {
    const active = courses.filter((c) => c.isActive).length;
    const online = courses.filter((c) => c.mode === "Online").length;
    const offline = courses.filter((c) => c.mode === "Offline").length;
    const hybrid = courses.filter((c) => c.mode === "Hybrid").length;
    const totalBatches = courses.reduce((a, b) => a + (b.batchCount ?? 0), 0);
    const activeCampuses = campuses.filter((c) => c.isActive).length;
    return {
      total: courses.length,
      active,
      online, offline, hybrid,
      totalBatches,
      campusCount: campuses.length,
      activeCampuses,
    };
  }, [courses, campuses]);

  const modePie = useMemo(() => {
    return (["Offline", "Online", "Hybrid"] as const)
      .map((m) => ({ name: m, value: courses.filter((c) => c.mode === m).length }))
      .filter((d) => d.value > 0);
  }, [courses]);

  const campusBar = useMemo(() => {
    return campuses
      .map((cp) => ({
        name: cp.name.length > 14 ? cp.name.slice(0, 12) + "…" : cp.name,
        Courses: courses.filter((c) => c.campuses?.some((x) => x.id === cp.id)).length,
      }))
      .sort((a, b) => b.Courses - a.Courses)
      .slice(0, 8);
  }, [campuses, courses]);

  const typeDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      map.set(c.courseType, (map.get(c.courseType) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [courses]);

  const loading = coursesLoading || campusesLoading;

  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Courses"
          value={loading ? "—" : stats.total}
          icon={<BookOpen size={18} />}
          accent="bg-[#0B3C5D]"
        />
        <StatCard
          label="Active"
          value={loading ? "—" : stats.active}
          icon={<CheckCircle2 size={18} />}
          accent="bg-emerald-500"
          sub={`${stats.total - stats.active} inactive`}
        />
        <StatCard
          label="Online"
          value={loading ? "—" : stats.online}
          icon={<Wifi size={18} />}
          accent="bg-cyan-500"
        />
        <StatCard
          label="Offline"
          value={loading ? "—" : stats.offline}
          icon={<Building2 size={18} />}
          accent="bg-[#0B3C5D]"
        />
        <StatCard
          label="Campuses"
          value={loading ? "—" : `${stats.activeCampuses} / ${stats.campusCount}`}
          icon={<Sparkles size={18} />}
          accent="bg-[#D4AF37]"
          sub="Active / Total"
        />
        <StatCard
          label="Batches"
          value={loading ? "—" : stats.totalBatches}
          icon={<Layers size={18} />}
          accent="bg-violet-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Online vs Offline</p>
          </div>
          {modePie.length === 0 ? (
            <EmptyState icon={<Activity size={22} />} title="No courses yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                    label={({ percent }) =>
                      (percent ?? 0) > 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : ""
                    }
                    labelLine={false}
                  >
                    {modePie.map((d, i) => (
                      <Cell key={i} fill={MODE_COLORS[d.name] ?? "#94a3b8"} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Courses per Campus</p>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Top 8
            </span>
          </div>
          {campusBar.length === 0 ? (
            <EmptyState icon={<Building2 size={22} />} title="No campuses yet" hint="Add campuses to see distribution." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campusBar} margin={{ top: 10, right: 10, left: -15, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="Courses" fill="#0B3C5D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Type distribution + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Course type distribution</p>
          </div>
          {typeDist.length === 0 ? (
            <EmptyState icon={<BookOpen size={22} />} title="No courses yet" />
          ) : (
            <div className="space-y-2.5">
              {typeDist.map((t) => {
                const w = stats.total > 0 ? (t.value / stats.total) * 100 : 0;
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{t.name}</span>
                      <span className="text-slate-500 tabular-nums">{t.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0B3C5D] rounded-full transition-all"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#D4AF37]" />
              <p className="text-sm font-bold text-slate-800">Recently added courses</p>
            </div>
            {onJumpToCourses && (
              <button
                onClick={onJumpToCourses}
                className="text-[11px] font-bold text-[#0B3C5D] hover:underline"
              >
                View all →
              </button>
            )}
          </div>
          {courses.length === 0 ? (
            <EmptyState icon={<BookOpen size={22} />} title="No courses yet" />
          ) : (
            <ul className="space-y-2">
              {courses.slice(0, 5).map((c: Course) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {c.classLevel ?? "—"} · {c.courseType} · {c.mode}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {(c.campuses?.length ?? 0)} campus{(c.campuses?.length ?? 0) === 1 ? "" : "es"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
