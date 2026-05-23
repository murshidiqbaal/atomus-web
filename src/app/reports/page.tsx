"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, PieChart, Download, FileText, Calendar, Users, CreditCard, GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";

// ── Mock Data ──────────────────────────────────────────────────────────────────
const coursePerformance = [
  { course: "Class 8", avg: 72 }, { course: "Class 9", avg: 68 },
  { course: "Class 10", avg: 81 }, { course: "Class 11", avg: 75 },
  { course: "Class 12", avg: 78 }, { course: "O-Level", avg: 85 },
];

const attendanceMonthly = [
  { month: "Oct", pct: 86 }, { month: "Nov", pct: 88 }, { month: "Dec", pct: 82 },
  { month: "Jan", pct: 91 }, { month: "Feb", pct: 89 }, { month: "Mar", pct: 93 },
  { month: "Apr", pct: 94 }, { month: "May", pct: 96 },
];

const feeAnalytics = [
  { month: "Jan", collected: 42000, pending: 14000 },
  { month: "Feb", collected: 50000, pending: 12000 },
  { month: "Mar", collected: 47000, pending: 9000 },
  { month: "Apr", collected: 63000, pending: 7000 },
  { month: "May", collected: 58000, pending: 11000 },
];

const batchEfficiency = [
  { batch: "8-A", students: 28, attendance: 95, avg: 79 },
  { batch: "9-B", students: 32, attendance: 88, avg: 71 },
  { batch: "10-A", students: 25, attendance: 97, avg: 85 },
  { batch: "11-C", students: 20, attendance: 91, avg: 76 },
  { batch: "O-Lv", students: 15, attendance: 93, avg: 88 },
];

const gradeDistribution = [
  { name: "Excellent (>85%)", value: 32, color: "#10b981" },
  { name: "Good (70–85%)", value: 40, color: "#0B3C5D" },
  { name: "Average (50–70%)", value: 20, color: "#f59e0b" },
  { name: "Below Avg (<50%)", value: 8, color: "#ef4444" },
];

const REPORT_CARDS = [
  { id: "performance", label: "Performance Report", desc: "Exam-wise analysis by course & batch", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "attendance", label: "Attendance Audit", desc: "Monthly attendance trends & absentees", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "fee", label: "Fee Collection", desc: "Revenue, pending dues & payment history", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
  { id: "batch", label: "Batch Efficiency", desc: "Comparative batch performance", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
];

export default function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState("performance");

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 font-medium mt-1">Comprehensive institutional performance insights.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#0B3C5D]/90 transition-all active:scale-95">
          <Download size={18} />
          Export Full Report
        </button>
      </header>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_CARDS.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`bg-white p-5 rounded-2xl border transition-all text-left hover:shadow-md ${
              activeReport === r.id ? "border-[#0B3C5D] shadow-md ring-2 ring-[#0B3C5D]/10" : "border-slate-200 shadow-sm"
            }`}
          >
            <div className={`w-11 h-11 ${r.bg} rounded-xl flex items-center justify-center mb-3`}>
              <r.icon className={r.color} size={22} />
            </div>
            <h3 className="font-bold text-[#0B3C5D] text-sm mb-1">{r.label}</h3>
            <p className="text-[11px] text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Dynamic Report Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeReport === "performance" && <PerformanceReport />}
        {activeReport === "attendance" && <AttendanceReport />}
        {activeReport === "fee" && <FeeReport />}
        {activeReport === "batch" && <BatchReport />}
      </div>
    </div>
  );
}

// ── Performance Report ────────────────────────────────────────────────────────
function PerformanceReport() {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Overall Average", value: "76.4%", color: "text-[#0B3C5D]" },
        { label: "Excellent Students", value: "401", color: "text-emerald-600" },
        { label: "At-Risk Students", value: "98", color: "text-rose-600" },
        { label: "Exams Conducted", value: "24", color: "text-purple-600" },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Average Marks by Course" desc="Mean percentage across all exams">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coursePerformance} barCategoryGap={30}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="course" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Avg Marks']} />
              <Bar dataKey="avg" fill="#0B3C5D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Grade Distribution" desc="Student performance classification">
          <div className="relative flex items-center justify-center h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={gradeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {gradeDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, '']} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {gradeDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-bold text-slate-500 truncate">{item.name}</span>
                <span className="text-[11px] font-black text-[#0B3C5D] ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ── Attendance Report ─────────────────────────────────────────────────────────
function AttendanceReport() {
  const [data, setData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [attRes, subjRes] = await Promise.all([
          supabase.from("attendance").select("*").limit(2000),
          supabase.from("subjects").select("id, name"),
        ]);
        setData(attRes.data ?? []);
        setSubjects(subjRes.data ?? []);
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        overallAvg: "0%",
        totalRecords: 0,
        activeMarkers: 0,
        adminCount: 0,
        teacherCount: 0,
        teacherData: [],
        subjectData: [],
        overrideDistribution: [],
      };
    }

    let present = 0;
    let total = 0;
    const markers = new Set<string>();
    let adminCount = 0;
    let teacherCount = 0;

    const teacherCounts: Record<string, number> = {};
    const subjectStats: Record<string, { present: number; total: number }> = {};

    for (const r of data) {
      if (r.status === "Unmarked") continue;
      total++;
      if (r.status === "Present" || r.status === "Late" || r.status === "Leave") {
        present++;
      }

      if (r.attendance_marker_name) {
        markers.add(r.attendance_marker_name);
        teacherCounts[r.attendance_marker_name] = (teacherCounts[r.attendance_marker_name] || 0) + 1;
      }

      if (r.attendance_marker_role === "Admin") {
        adminCount++;
      } else if (r.attendance_marker_role === "Teacher") {
        teacherCount++;
      }

      if (r.subject_id) {
        if (!subjectStats[r.subject_id]) {
          subjectStats[r.subject_id] = { present: 0, total: 0 };
        }
        subjectStats[r.subject_id].total++;
        if (r.status === "Present" || r.status === "Late" || r.status === "Leave") {
          subjectStats[r.subject_id].present++;
        }
      }
    }

    const overallAvg = total > 0 ? `${Math.round((present / total) * 100)}%` : "100%";

    const teacherData = Object.entries(teacherCounts).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const subjectData = Object.entries(subjectStats).map(([subjId, s]) => {
      const subjectObj = subjects.find(sub => sub.id === subjId);
      const name = subjectObj ? subjectObj.name : "Unknown Subject";
      return {
        name,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 100,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const overrideDistribution = [
      { name: "Teacher Marked", value: teacherCount, color: "#10b981" },
      { name: "Admin Overridden (ATOMUS)", value: adminCount, color: "#0B3C5D" },
    ].filter(d => d.value > 0);

    if (overrideDistribution.length === 0 && total > 0) {
      overrideDistribution.push({ name: "Unclassified", value: total, color: "#94a3b8" });
    }

    return {
      overallAvg,
      totalRecords: total,
      activeMarkers: markers.size,
      adminCount,
      teacherCount,
      teacherData,
      subjectData,
      overrideDistribution,
    };
  }, [data, subjects]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <Loader2 size={36} className="animate-spin text-[#0B3C5D] mx-auto" />
        <p className="text-sm font-bold text-slate-400">Loading Database Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Overall Attendance %", value: stats.overallAvg, color: "text-[#0B3C5D]" },
        { label: "Active Markers", value: `${stats.activeMarkers} Profiles`, color: "text-emerald-600" },
        { label: "Admin Overrides (ATOMUS)", value: `${stats.adminCount} Records`, color: "text-amber-600" },
        { label: "Teacher Placements", value: `${stats.teacherCount} Records`, color: "text-purple-600" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Attendance Trends */}
        <ChartCard title="Subject Attendance Averages" desc="Mean attendance percentages aggregated per course subject">
          {stats.subjectData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed rounded-xl">
              No subject-scoped logs found.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.subjectData} barCategoryGap={30}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Attendance Rate']} />
                <Bar dataKey="percentage" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Ownership Tracking / Overrides */}
        <ChartCard title="Attendance Ownership Shares" desc="Breakdown of teacher marked vs admin overridden (ATOMUS) registries">
          {stats.overrideDistribution.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed rounded-xl">
              No marked logs found.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-[280px]">
              <div className="relative w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.overrideDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                      {stats.overrideDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v} records`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {stats.overrideDistribution.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-500">{item.name}</span>
                    <span className="text-xs font-black text-[#0B3C5D]">{item.value} ({Math.round(item.value / stats.totalRecords * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Teacher-wise Marked Counts */}
      <ChartCard title="Marked Logs per Session Marker" desc="Registry transactions executed per teacher profile & admin roles">
        {stats.teacherData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed rounded-xl">
            No marker actions found.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.teacherData} layout="vertical" barCategoryGap={15}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={120} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v} records`, 'Marked Count']} />
              <Bar dataKey="count" fill="#0B3C5D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// ── Fee Report ────────────────────────────────────────────────────────────────
function FeeReport() {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Total Collected (YTD)", value: "₹2,60,000", color: "text-emerald-600" },
        { label: "Total Pending", value: "₹53,000", color: "text-rose-600" },
        { label: "Collection Rate", value: "83%", color: "text-[#0B3C5D]" },
        { label: "Students Defaulting", value: "47", color: "text-amber-600" },
      ]} />
      <ChartCard title="Monthly Fee Collection vs. Pending" desc="Collected vs. outstanding fees by month">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={feeAnalytics} barGap={6} barCategoryGap={25}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
            <Bar dataKey="collected" name="Collected" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-end">
          {[{ c: "#0B3C5D", l: "Collected" }, { c: "#D4AF37", l: "Pending" }].map(l => (
            <div key={l.l} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.c }} />
              {l.l}
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

// ── Batch Report ──────────────────────────────────────────────────────────────
function BatchReport() {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Total Batches", value: "112", color: "text-[#0B3C5D]" },
        { label: "Top Batch", value: "Class 10-A", color: "text-emerald-600" },
        { label: "Avg Batch Size", value: "24 students", color: "text-purple-600" },
        { label: "Avg Batch Attendance", value: "92.8%", color: "text-amber-600" },
      ]} />
      <ChartCard title="Batch Performance Comparison" desc="Students, attendance & average marks by batch">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={batchEfficiency} barGap={4} barCategoryGap={28}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            <Bar dataKey="attendance" name="Attendance %" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avg" name="Avg Marks %" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-end">
          {[{ c: "#10b981", l: "Attendance %" }, { c: "#0B3C5D", l: "Avg Marks %" }].map(l => (
            <div key={l.l} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.c }} />
              {l.l}
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SummaryRow({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
          <h3 className={`text-2xl font-black ${item.color}`}>{item.value}</h3>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-black text-[#0B3C5D]">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}
