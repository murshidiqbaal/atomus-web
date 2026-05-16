"use client";

import React, { useMemo } from "react";
import {
  BookOpen, FileSpreadsheet, GraduationCap, Trophy, TrendingUp,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  useBatchAverages, useDashboardStats, useExamTrend, useSubjectAverages,
} from "../hooks";
import { Card, EmptyState, StatCard } from "./ui";
import { GRADE_CFG } from "../utils/grade";

const SUBJECT_PALETTE = ["#0B3C5D", "#1E5F8E", "#2C7CBF", "#4FA3D9", "#7EBFE5"];

export function MarksDashboard({ courseFilter }: { courseFilter: string }) {
  const dash = useDashboardStats();
  const trend = useExamTrend();
  const subjects = useSubjectAverages(courseFilter);
  const batches = useBatchAverages(courseFilter);

  const stats = dash.data;
  const trendData = useMemo(
    () =>
      (trend.data ?? []).map((p) => ({
        name: p.name.length > 14 ? `${p.name.slice(0, 12)}…` : p.name,
        Average: Number(p.avg.toFixed(1)),
        Top: Number(p.top.toFixed(1)),
      })),
    [trend.data]
  );

  const subjectData = useMemo(
    () =>
      (subjects.data ?? [])
        .slice(0, 8)
        .map((s) => ({ name: s.name, Average: Number(s.avg.toFixed(1)) })),
    [subjects.data]
  );

  const batchData = useMemo(
    () =>
      (batches.data ?? [])
        .slice(0, 8)
        .map((b) => ({ name: b.name, Average: Number(b.avg.toFixed(1)) })),
    [batches.data]
  );

  const pieData = useMemo(() => {
    // Approximate distribution from subject averages — falls back to grade buckets
    const buckets = { Excellent: 0, Good: 0, Average: 0, "Needs Improvement": 0 } as Record<string, number>;
    for (const s of subjects.data ?? []) {
      if (s.avg >= 90) buckets.Excellent++;
      else if (s.avg >= 75) buckets.Good++;
      else if (s.avg >= 50) buckets.Average++;
      else buckets["Needs Improvement"]++;
    }
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }));
  }, [subjects.data]);

  if (dash.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Exams"
          value={stats?.totalExams ?? 0}
          icon={<FileSpreadsheet size={18} />}
          accent="bg-[#0B3C5D]"
        />
        <StatCard
          label="Active Courses"
          value={stats?.activeCourses ?? 0}
          icon={<BookOpen size={18} />}
          accent="bg-indigo-500"
        />
        <StatCard
          label="Students Evaluated"
          value={stats?.studentsEvaluated ?? 0}
          icon={<GraduationCap size={18} />}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Average Performance"
          value={`${(stats?.avgPerformance ?? 0).toFixed(1)}%`}
          icon={<TrendingUp size={18} />}
          accent="bg-amber-400"
        />
        <StatCard
          label="Top Batch"
          value={stats?.topBatch?.name ?? "—"}
          sub={stats?.topBatch ? `${stats.topBatch.avg.toFixed(1)}% avg` : "No data"}
          icon={<Trophy size={18} />}
          accent="bg-[#D4AF37]"
        />
      </div>

      {/* Trend */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Exam Performance Trend</p>
            <p className="text-xs text-slate-400">Last 12 exams · class average vs. top</p>
          </div>
        </div>
        {trendData.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={26} />}
            title="No exam data yet"
            hint="Create an exam and enter marks to see the trend."
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Average"
                  stroke="#0B3C5D"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Top"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Subject + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-bold text-slate-800 mb-1">Subject Performance</p>
          <p className="text-xs text-slate-400 mb-3">
            Average percentage across all exams · top 8
          </p>
          {subjectData.length === 0 ? (
            <EmptyState icon={<BookOpen size={26} />} title="No subject marks yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="Average" radius={[8, 8, 0, 0]}>
                    {subjectData.map((_, i) => (
                      <Cell key={i} fill={SUBJECT_PALETTE[i % SUBJECT_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-800 mb-1">Grade Distribution</p>
          <p className="text-xs text-slate-400 mb-3">Subjects bucketed by average</p>
          {pieData.length === 0 ? (
            <EmptyState icon={<Trophy size={26} />} title="No marks yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={GRADE_CFG[entry.name as keyof typeof GRADE_CFG]?.chart ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Batch Performance */}
      <Card className="p-5">
        <p className="text-sm font-bold text-slate-800 mb-1">Batch Performance Comparison</p>
        <p className="text-xs text-slate-400 mb-3">Average percentage across exams · top 8 batches</p>
        {batchData.length === 0 ? (
          <EmptyState icon={<GraduationCap size={26} />} title="No batch data" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={batchData}
                layout="vertical"
                margin={{ top: 0, right: 15, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  width={90}
                />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="Average" fill="#0B3C5D" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
