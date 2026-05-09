"use client";

import React, { useEffect, useState } from "react";
import { Users, UserCircle, BookOpen, Layers, CreditCard, CalendarCheck, TrendingUp, Plus } from "lucide-react";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParents: 0,
    activeCourses: 0,
    activeBatches: 0,
    pendingFees: 0,
    attendanceAvg: 92.4
  });

  useEffect(() => {
    // Simulate data fetching
    setStats({
      totalStudents: 1248,
      totalParents: 982,
      activeCourses: 34,
      activeBatches: 112,
      pendingFees: 4520,
      attendanceAvg: 94.2
    });
  }, []);

  const kpiCards = [
    { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Parents", value: stats.totalParents, icon: UserCircle, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Courses", value: stats.activeCourses, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Batches", value: stats.activeBatches, icon: Layers, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Pending Fees", value: `$${stats.pendingFees}`, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Attendance Avg", value: `${stats.attendanceAvg}%`, icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-foreground/70 mt-1">Tuition center overview and real-time performance analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95">
            <Plus size={18} />
            Quick Action
          </button>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-surface p-6 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
              <card.icon className={card.color} size={24} />
            </div>
            <p className="text-sm font-medium text-foreground/60 mb-1">{card.label}</p>
            <h3 className="text-2xl font-bold text-foreground">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Analytics Placeholder */}
        <div className="xl:col-span-2 bg-surface rounded-2xl border border-border/50 p-8 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">Student Performance Trend</h2>
              <p className="text-sm text-foreground/60">Average test scores across all batches</p>
            </div>
            <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          
          <div className="flex-1 bg-background/50 rounded-xl border border-dashed border-border flex items-center justify-center">
            <div className="text-center space-y-2">
              <TrendingUp size={48} className="text-foreground/20 mx-auto" />
              <p className="text-foreground/40 font-medium italic">Performance Analytics Chart Rendering...</p>
            </div>
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          {/* Upcoming Exams */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Upcoming Exams</h2>
            <div className="space-y-4">
              {[
                { name: "Mathematics Mid-Term", batch: "Batch A", date: "Oct 15" },
                { name: "Physics Unit Test", batch: "Batch C", date: "Oct 18" },
                { name: "Chemistry Lab", batch: "Batch B", date: "Oct 22" },
              ].map((exam, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-background transition-colors border border-transparent hover:border-border">
                  <div className="bg-accent/10 text-accent p-2.5 rounded-lg text-sm font-bold w-12 text-center">
                    {exam.date.split(' ')[1]}
                    <br />
                    <span className="text-[10px] uppercase">{exam.date.split(' ')[0]}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{exam.name}</h4>
                    <p className="text-xs text-foreground/60">{exam.batch}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { text: "Attendance marked for Batch A", time: "2 hours ago" },
                { text: "New student 'Sarah Khan' enrolled", time: "5 hours ago" },
                { text: "Fee payment received from John Doe", time: "Yesterday" },
              ].map((act, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground/80">{act.text}</p>
                    <p className="text-[11px] text-foreground/40 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
