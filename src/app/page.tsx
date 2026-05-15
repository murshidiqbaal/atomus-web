"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserCircle, GraduationCap, BookOpen, Layers,
  CreditCard, CalendarCheck, TrendingUp, Plus, ArrowUpRight,
  Megaphone, Bell
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const attendanceTrend = [
  { month: "Nov", avg: 88 }, { month: "Dec", avg: 84 }, { month: "Jan", avg: 91 },
  { month: "Feb", avg: 89 }, { month: "Mar", avg: 93 }, { month: "Apr", avg: 94 },
  { month: "May", avg: 96 },
];

const feeCollection = [
  { month: "Jan", collected: 42000, pending: 14000 },
  { month: "Feb", collected: 50000, pending: 12000 },
  { month: "Mar", collected: 47000, pending: 9000 },
  { month: "Apr", collected: 63000, pending: 7000 },
  { month: "May", collected: 58000, pending: 11000 },
];

const performanceDist = [
  { name: "Excellent", value: 32, color: "#10b981" },
  { name: "Good", value: 40, color: "#0B3C5D" },
  { name: "Average", value: 20, color: "#f59e0b" },
  { name: "Needs Imp.", value: 8, color: "#ef4444" },
];

const recentActivity = [
  { text: "Attendance marked for Batch A — Mathematics", time: "2 hours ago", color: "bg-blue-500" },
  { text: "New student 'Zainab Ahmed' enrolled in Class 10", time: "5 hours ago", color: "bg-emerald-500" },
  { text: "Fee payment ₹5,000 received from Ali Khan", time: "Yesterday", color: "bg-[#D4AF37]" },
  { text: "Mid-Term exam schedule published", time: "2 days ago", color: "bg-purple-500" },
  { text: "Parent account created for Farida Begum", time: "3 days ago", color: "bg-orange-500" },
];

const upcomingExams = [
  { name: "Mathematics Mid-Term", batch: "Class 10 – Batch A", date: "20 May" },
  { name: "Physics Unit Test", batch: "Class 9 – Batch C", date: "23 May" },
  { name: "Chemistry Lab Exam", batch: "Class 11 – Batch B", date: "28 May" },
  { name: "English Literature", batch: "Class 8 – Batch A", date: "01 Jun" },
];

export default function DashboardOverview() {
  const [stats] = useState({
    totalStudents: 1248,
    totalParents: 982,
    totalTeachers: 42,
    activeCourses: 34,
    activeBatches: 112,
    pendingFees: 4520,
    attendanceAvg: 94.2,
  });

  const kpiCards = [
    { label: "Total Students", value: stats.totalStudents.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/students", change: "+18" },
    { label: "Total Parents", value: stats.totalParents.toLocaleString(), icon: UserCircle, color: "text-purple-600", bg: "bg-purple-50", href: "/parents", change: "+12" },
    { label: "Teachers", value: stats.totalTeachers, icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50", href: "/teachers", change: "+3" },
    { label: "Active Courses", value: stats.activeCourses, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", href: "/courses", change: "+2" },
    { label: "Active Batches", value: stats.activeBatches, icon: Layers, color: "text-orange-600", bg: "bg-orange-50", href: "/batches", change: "+8" },
    { label: "Pending Fees", value: `₹${stats.pendingFees.toLocaleString()}`, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50", href: "/fees", change: "-5%" },
    { label: "Attendance Avg", value: `${stats.attendanceAvg}%`, icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50", href: "/attendance", change: "+2.3%" },
    { label: "This Month", value: "₹58,000", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", href: "/fees", change: "+18%" },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — ATOMUS.edu Admin
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/students" className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 active:scale-95">
            <Plus size={18} />
            Add Student
          </Link>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {kpiCards.map((card, i) => (
          <Link key={i} href={card.href} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer col-span-1">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <card.icon className={card.color} size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mb-1">{card.label}</p>
            <h3 className="text-xl font-black text-[#0B3C5D] leading-tight">{card.value}</h3>
            {card.change && (
              <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${card.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                <ArrowUpRight size={10} />
                {card.change} this month
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#0B3C5D]">Attendance Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">7-month average across all batches</p>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl">
              {stats.attendanceAvg}% avg
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={8} />
                <YAxis domain={[75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Attendance']}
                />
                <Area type="monotone" dataKey="avg" stroke="#0B3C5D" strokeWidth={3} fillOpacity={1} fill="url(#attGrad)" dot={{ fill: '#0B3C5D', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black text-[#0B3C5D]">Performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Student grade distribution</p>
          </div>
          <div className="relative flex items-center justify-center h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={performanceDist} cx="50%" cy="50%" innerRadius={52} outerRadius={70} paddingAngle={6} dataKey="value">
                  {performanceDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#0B3C5D]">72%</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pass Rate</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {performanceDist.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-slate-500">{item.name}</span>
                </div>
                <span className="text-xs font-black text-[#0B3C5D]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Collection Chart + Activity + Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#0B3C5D]">Monthly Fee Collection</h2>
              <p className="text-xs text-slate-400 mt-0.5">Collected vs. pending breakdown</p>
            </div>
            <Link href="/fees" className="text-xs text-[#0B3C5D] font-bold hover:underline">View all</Link>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeCollection} barGap={4} barCategoryGap={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']}
                />
                <Bar dataKey="collected" name="Collected" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 justify-end">
            {[{ color: "bg-[#0B3C5D]", label: "Collected" }, { color: "bg-[#D4AF37]", label: "Pending" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Upcoming Exams */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-[#0B3C5D]">Upcoming Exams</h2>
              <Link href="/marks" className="text-xs text-[#0B3C5D] font-bold hover:underline">All</Link>
            </div>
            <div className="space-y-3">
              {upcomingExams.map((exam, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-2 rounded-xl text-center min-w-[44px]">
                    <p className="text-[10px] font-black uppercase leading-none">{exam.date.split(' ')[1]}</p>
                    <p className="text-sm font-black leading-tight">{exam.date.split(' ')[0]}</p>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[#0B3C5D] leading-tight truncate">{exam.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{exam.batch}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-[#0B3C5D]">Recent Activity</h2>
          <span className="text-xs text-slate-400 font-medium">Last 7 days</span>
        </div>
        <div className="space-y-3">
          {recentActivity.map((act, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className={`w-2 h-2 rounded-full ${act.color} shrink-0`} />
              <p className="text-sm text-slate-600 font-medium flex-1">{act.text}</p>
              <span className="text-[11px] text-slate-400 font-medium shrink-0">{act.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Mark Attendance", href: "/attendance", icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "Record Payment", href: "/fees", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "New Announcement", href: "/announcements", icon: Megaphone, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "View Reports", href: "/reports", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((item, i) => (
          <Link key={i} href={item.href}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
              <item.icon className={item.color} size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
