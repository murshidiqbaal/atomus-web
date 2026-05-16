"use client";

import React, { useMemo, useState } from "react";
import {
  Trophy, RotateCcw, ArrowUp, ArrowDown, BarChart3, Medal,
} from "lucide-react";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  useAllExams, useBatches, useCourses, useSubjects, useToppers,
} from "../hooks";
import { Card, EmptyState, fieldCls, Label, StatCard } from "./ui";
import { GRADE_CFG } from "../utils/grade";
import { TopperRow } from "../types";

function rankColor(rank: number) {
  if (rank === 0) return "bg-[#D4AF37] text-white";
  if (rank === 1) return "bg-slate-300 text-slate-800";
  if (rank === 2) return "bg-amber-600/80 text-white";
  return "bg-slate-100 text-slate-600";
}

function ToppersLeaderboard({ rows, isLoading }: { rows: TopperRow[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        {Array(6).fill(0).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 animate-pulse"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100" />
            <div className="flex-1 h-3 bg-slate-100 rounded w-1/3" />
            <div className="w-16 h-3 bg-slate-100 rounded" />
          </div>
        ))}
      </Card>
    );
  }
  if (!rows.length) {
    return (
      <EmptyState
        icon={<Trophy size={26} />}
        title="No toppers yet"
        hint="Marks must be entered against your filters to populate the leaderboard."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-12">
                Rank
              </th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Student
              </th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Batch
              </th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Score
              </th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cfg = GRADE_CFG[
                r.percentage >= 90 ? "Excellent"
                : r.percentage >= 75 ? "Good"
                : r.percentage >= 50 ? "Average"
                : "Needs Improvement"
              ];
              return (
                <tr
                  key={`${r.studentId}-${i}`}
                  className="border-b border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="py-3 px-4">
                    <div className={`w-8 h-8 rounded-full ${rankColor(i)} flex items-center justify-center text-xs font-black`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-semibold text-slate-800">{r.studentName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{r.rollNumber ?? "—"}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.batchName ?? "—"}</td>
                  <td className="py-3 px-4 text-sm font-bold text-[#0B3C5D] tabular-nums">
                    {r.marksObtained}<span className="text-slate-400 font-normal"> / {r.totalMarks}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.bar} rounded-full`}
                          style={{ width: `${Math.min(r.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums w-12">
                        {r.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function MarksAnalytics() {
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches(course);
  const { data: subjects = [] } = useSubjects(course);
  const { data: exams = [] } = useAllExams();

  // Filter exams locally based on course/batch
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (course && e.course_id !== course) return false;
      if (batch && e.batch_id && e.batch_id !== batch) return false;
      return true;
    });
  }, [exams, course, batch]);

  const filters = {
    course_id: course || undefined,
    batch_id: batch || undefined,
    exam_id: exam || undefined,
    subject_id: subject || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: 25,
  };

  const { data: toppers = [], isLoading } = useToppers(filters);

  const summary = useMemo(() => {
    if (!toppers.length) return null;
    const pcts = toppers.map((t) => t.percentage);
    const max = Math.max(...pcts);
    const min = Math.min(...pcts);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const passRate = (pcts.filter((p) => p >= 50).length / pcts.length) * 100;
    // top batch from top results
    const map = new Map<string, { sum: number; n: number }>();
    for (const t of toppers) {
      const name = t.batchName ?? "—";
      const cur = map.get(name) ?? { sum: 0, n: 0 };
      cur.sum += t.percentage;
      cur.n += 1;
      map.set(name, cur);
    }
    let topBatch = "—";
    let topBatchAvg = 0;
    for (const [name, v] of map) {
      const a = v.sum / v.n;
      if (a > topBatchAvg) {
        topBatchAvg = a;
        topBatch = name;
      }
    }
    return {
      highest: max.toFixed(1),
      lowest: min.toFixed(1),
      avg: avg.toFixed(1),
      passRate: passRate.toFixed(1),
      topBatch,
      topBatchAvg: topBatchAvg.toFixed(1),
    };
  }, [toppers]);

  const top10 = useMemo(
    () =>
      toppers.slice(0, 10).map((t) => ({
        name: t.studentName.length > 16 ? `${t.studentName.slice(0, 14)}…` : t.studentName,
        Percentage: Number(t.percentage.toFixed(1)),
      })),
    [toppers]
  );

  const resetFilters = () => {
    setCourse(""); setBatch(""); setExam(""); setSubject(""); setDateFrom(""); setDateTo("");
  };

  const hasFilters = course || batch || exam || subject || dateFrom || dateTo;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-1">
            <Label>Course</Label>
            <select value={course} onChange={(e) => { setCourse(e.target.value); setBatch(""); setExam(""); setSubject(""); }} className={fieldCls}>
              <option value="">All</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Batch</Label>
            <select value={batch} onChange={(e) => setBatch(e.target.value)} className={fieldCls} disabled={!course}>
              <option value="">All</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Exam</Label>
            <select value={exam} onChange={(e) => setExam(e.target.value)} className={fieldCls}>
              <option value="">All</option>
              {filteredExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Subject</Label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldCls} disabled={!course}>
              <option value="">All</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <Label>From</Label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <Label>To</Label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={fieldCls} />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">
              {toppers.length} student records match
            </p>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0B3C5D]"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Highest"
          value={summary ? `${summary.highest}%` : "—"}
          icon={<ArrowUp size={18} />}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Lowest"
          value={summary ? `${summary.lowest}%` : "—"}
          icon={<ArrowDown size={18} />}
          accent="bg-rose-500"
        />
        <StatCard
          label="Average"
          value={summary ? `${summary.avg}%` : "—"}
          icon={<BarChart3 size={18} />}
          accent="bg-[#0B3C5D]"
        />
        <StatCard
          label="Pass Rate"
          value={summary ? `${summary.passRate}%` : "—"}
          icon={<Trophy size={18} />}
          accent="bg-amber-400"
        />
        <StatCard
          label="Top Batch"
          value={summary?.topBatch ?? "—"}
          sub={summary ? `${summary.topBatchAvg}% avg` : "No data"}
          icon={<Medal size={18} />}
          accent="bg-[#D4AF37]"
        />
      </div>

      {/* Chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-[#D4AF37]" />
          <p className="text-sm font-bold text-slate-800">Top 10 Performers</p>
        </div>
        {top10.length === 0 ? (
          <EmptyState icon={<Trophy size={26} />} title="No data" hint="Adjust filters or enter marks." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 10, right: 10, left: -15, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="Percentage" radius={[8, 8, 0, 0]}>
                  {top10.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#D4AF37" : i < 3 ? "#0B3C5D" : "#4FA3D9"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-800">Topper Leaderboard</p>
          <p className="text-[11px] text-slate-400">Top {toppers.length} records</p>
        </div>
        <ToppersLeaderboard rows={toppers} isLoading={isLoading} />
      </div>
    </div>
  );
}
