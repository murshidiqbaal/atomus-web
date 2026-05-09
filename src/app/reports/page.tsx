"use client";

import React from "react";
import { BarChart3, TrendingUp, PieChart, Download, FileText, Calendar } from "lucide-react";

export default function ReportsAnalytics() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Advanced Analytics</h1>
          <p className="text-foreground/70 mt-1">Deep insights into student performance, attendance, and center growth.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-md active:scale-95">
            <Download size={18} />
            Export Full Data
          </button>
        </div>
      </header>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: "Performance Report", desc: "Detailed exam-wise analysis", icon: BarChart3, color: "text-blue-600" },
          { label: "Attendance Audit", desc: "Monthly attendance trends", icon: Calendar, color: "text-emerald-600" },
          { label: "Fee Collection", desc: "Revenue & pending dues", icon: PieChart, color: "text-purple-600" },
          { label: "Batch Efficiency", desc: "Performance by batch", icon: TrendingUp, color: "text-orange-600" },
        ].map((report, i) => (
          <div key={i} className="bg-surface p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className={`w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <report.icon className={report.color} size={24} />
            </div>
            <h3 className="font-bold text-foreground mb-1">{report.label}</h3>
            <p className="text-xs text-foreground/50">{report.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Visualization Placeholder */}
        <div className="bg-surface rounded-2xl border border-border/50 p-8 min-h-[400px] flex flex-col shadow-sm">
           <h2 className="text-xl font-bold text-foreground mb-6">Course Performance Distribution</h2>
           <div className="flex-1 bg-background/50 rounded-xl border border-dashed border-border flex items-center justify-center italic text-foreground/30">
              [ Bar Chart Component: Average Marks by Course ]
           </div>
        </div>

        {/* Attendance Trends Placeholder */}
        <div className="bg-surface rounded-2xl border border-border/50 p-8 min-h-[400px] flex flex-col shadow-sm">
           <h2 className="text-xl font-bold text-foreground mb-6">Attendance Trends (Monthly)</h2>
           <div className="flex-1 bg-background/50 rounded-xl border border-dashed border-border flex items-center justify-center italic text-foreground/30">
              [ Area Chart Component: Monthly Attendance % ]
           </div>
        </div>
      </div>
    </div>
  );
}
