"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, PieChart, Download, FileText, Calendar, Users, CreditCard, GraduationCap } from "lucide-react";
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
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Current Month Avg", value: "96%", color: "text-emerald-600" },
        { label: "Perfect Attendance", value: "312 students", color: "text-[#0B3C5D]" },
        { label: "Chronic Absentees", value: "23 students", color: "text-rose-600" },
        { label: "Late Arrivals (May)", value: "48", color: "text-amber-600" },
      ]} />
      <ChartCard title="Monthly Attendance Trend" desc="Average attendance % across all batches">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={attendanceMonthly}>
            <defs>
              <linearGradient id="attRep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={8} />
            <YAxis domain={[75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Attendance']} />
            <Area type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#attRep)" dot={{ fill: '#10b981', r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
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
