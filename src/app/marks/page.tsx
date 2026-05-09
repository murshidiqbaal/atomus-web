"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Plus, Upload, Save, Trophy, AlertTriangle } from "lucide-react";

export default function MarksManagement() {
  const [selectedExam, setSelectedExam] = useState("Mid-Term Assessment 2026");
  
  const studentMarks = [
    { id: 's1', name: 'Zainab Ahmed', marks: 85, total: 100, performance: 'Excellent' },
    { id: 's2', name: 'Omar Farooq', marks: 72, total: 100, performance: 'Good' },
    { id: 's3', name: 'Sarah Khan', marks: 45, total: 100, performance: 'Average' },
    { id: 's4', name: 'Michael Chen', marks: 92, total: 100, performance: 'Excellent' },
    { id: 's5', name: 'Emily Davis', marks: 32, total: 100, performance: 'At Risk' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Academic Grading</h1>
          <p className="text-foreground/70 mt-1">Record and analyze student performance across subjects.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            <Upload size={18} />
            Bulk Import
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95">
            <Save size={18} />
            Publish Results
          </button>
        </div>
      </header>

      {/* Grading Context */}
      <div className="bg-surface p-6 rounded-2xl border border-border/50 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-foreground/50 uppercase mb-2">Active Exam</label>
          <select 
            className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-medium bg-background focus:outline-none"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option>Mid-Term Assessment 2026</option>
            <option>Unit Test - Physics</option>
            <option>Final Term Evaluation</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-foreground/50 uppercase mb-2">Subject</label>
          <select className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-medium bg-background focus:outline-none">
            <option>Mathematics</option>
            <option>Physics</option>
            <option>Chemistry</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-foreground/50 uppercase mb-2">Max Marks</label>
          <input type="number" defaultValue={100} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-medium bg-background focus:outline-none" />
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50 w-[300px]">Student</th>
              <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Marks Obtained</th>
              <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Percentage</th>
              <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Evaluation</th>
              <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {studentMarks.map((row) => (
              <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-4 px-6">
                  <div className="font-bold text-foreground text-sm">{row.name}</div>
                  <div className="text-[11px] text-foreground/40">{row.id}</div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      defaultValue={row.marks}
                      className="w-20 px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <span className="text-foreground/40 text-sm font-medium">/ {row.total}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-foreground/80">{(row.marks / row.total * 100).toFixed(1)}%</span>
                </td>
                <td className="py-4 px-6">
                  <EvaluationBadge status={row.performance} />
                </td>
                <td className="py-4 px-6">
                  <input 
                    type="text" 
                    placeholder="Add comment..."
                    className="w-full px-3 py-1.5 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-sm transition-all"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvaluationBadge({ status }: { status: string }) {
  const styles: any = {
    'Excellent': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Good': 'bg-blue-50 text-blue-700 border-blue-100',
    'Average': 'bg-orange-50 text-orange-700 border-orange-100',
    'At Risk': 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${styles[status]}`}>
      {status}
    </span>
  );
}
