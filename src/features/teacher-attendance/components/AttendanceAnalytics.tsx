"use client";

import { useMemo } from "react";
import {
  Activity, BarChart3, Building2, CheckCircle2, Clock, Loader2,
  PieChart as PieIcon, Sparkles, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie,
  PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import type {
  TeacherAttendanceAnalytics, TeacherAttendanceDTO,
} from "../types";
import { useTeacherAttendanceAnalytics } from "../hooks";
import { isLateLogin } from "../utils/format";
import { Card, EmptyState, StatCard } from "./ui";

const TONE = ["#0B3C5D", "#D4AF37", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4", "#EF4444"];

function buildAnalytics(rows: TeacherAttendanceDTO[]): TeacherAttendanceAnalytics {
  let active = 0, completed = 0, missed = 0, totalMinutes = 0, durationSamples = 0;
  const byDay = new Map<string, { sessions: number; completed: number; missed: number; minutes: number }>();
  const byCampus = new Map<string, { name: string; sessions: number; minutes: number; completed: number }>();
  const bySubject = new Map<string, { name: string; sessions: number; minutes: number }>();
  const byTeacher = new Map<string, { name: string; total: number; punctual: number }>();

  for (const r of rows) {
    if (r.attendance_status === "Active") active++;
    else if (r.attendance_status === "Completed") completed++;
    else if (r.attendance_status === "Missed") missed++;

    const mins = Number(r.total_duration_minutes ?? 0);
    if (mins > 0) {
      totalMinutes += mins;
      durationSamples++;
    }

    const dayKey = r.attendance_date ?? "—";
    const day = byDay.get(dayKey) ?? { sessions: 0, completed: 0, missed: 0, minutes: 0 };
    day.sessions++;
    if (r.attendance_status === "Completed") day.completed++;
    if (r.attendance_status === "Missed") day.missed++;
    day.minutes += mins;
    byDay.set(dayKey, day);

    if (r.campus) {
      const c = byCampus.get(r.campus.id) ?? { name: r.campus.name, sessions: 0, minutes: 0, completed: 0 };
      c.sessions++;
      c.minutes += mins;
      if (r.attendance_status === "Completed") c.completed++;
      byCampus.set(r.campus.id, c);
    }

    if (r.subject) {
      const s = bySubject.get(r.subject.id) ?? { name: r.subject.name, sessions: 0, minutes: 0 };
      s.sessions++;
      s.minutes += mins;
      bySubject.set(r.subject.id, s);
    }

    if (r.teacher && r.attendance_status !== "Missed" && r.start_time) {
      const t = byTeacher.get(r.teacher.id) ?? { name: r.teacher.full_name, total: 0, punctual: 0 };
      t.total++;
      if (!isLateLogin(r.start_time)) t.punctual++;
      byTeacher.set(r.teacher.id, t);
    }
  }

  const total = rows.length;
  const completionDenom = completed + missed;
  return {
    totalSessions: total,
    activeNow: active,
    completed,
    missed,
    avgDurationMinutes: durationSamples ? Math.round(totalMinutes / durationSamples) : 0,
    completionPct: completionDenom ? Math.round((completed / completionDenom) * 100) : 0,
    trend: Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCampus: Array.from(byCampus.entries())
      .map(([id, v]) => ({
        campus_id: id,
        campus_name: v.name,
        sessions: v.sessions,
        minutes: v.minutes,
        completion_pct: v.sessions ? Math.round((v.completed / v.sessions) * 100) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions),
    bySubject: Array.from(bySubject.entries())
      .map(([id, v]) => ({ subject_id: id, subject_name: v.name, sessions: v.sessions, minutes: v.minutes }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8),
    punctualityTop: Array.from(byTeacher.entries())
      .map(([id, v]) => ({
        teacher_id: id,
        teacher_name: v.name,
        total: v.total,
        punctual_pct: v.total ? Math.round((v.punctual / v.total) * 100) : 0,
      }))
      .filter((t) => t.total >= 3)
      .sort((a, b) => b.punctual_pct - a.punctual_pct)
      .slice(0, 6),
  };
}

export function AttendanceAnalytics() {
  const { data: rows = [], isLoading } = useTeacherAttendanceAnalytics();
  const analytics = useMemo(() => buildAnalytics(rows), [rows]);

  if (isLoading) {
    return (
      <Card className="py-16 flex items-center justify-center text-slate-400">
        <Loader2 size={20} className="animate-spin" />
      </Card>
    );
  }

  if (analytics.totalSessions === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={20} />}
        title="No attendance data yet"
        hint="Once teachers start sessions from the Flutter app, analytics will populate here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Now"
          value={analytics.activeNow}
          icon={<Activity size={18} />}
          accent="bg-emerald-500"
          sub="Sessions in progress"
        />
        <StatCard
          label="Avg Duration"
          value={`${Math.floor(analytics.avgDurationMinutes / 60)}h ${analytics.avgDurationMinutes % 60}m`}
          icon={<Clock size={18} />}
          accent="bg-[#0B3C5D]"
          sub="Across last 60 days"
        />
        <StatCard
          label="Completion"
          value={`${analytics.completionPct}%`}
          icon={<CheckCircle2 size={18} />}
          accent="bg-[#D4AF37]"
          sub={`${analytics.completed} done · ${analytics.missed} missed`}
        />
        <StatCard
          label="Total Sessions"
          value={analytics.totalSessions}
          icon={<Sparkles size={18} />}
          accent="bg-violet-500"
          sub="Last 60 days"
        />
      </div>

      {/* Trend */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#0B3C5D]" />
            <p className="text-sm font-bold text-slate-800">Daily Attendance Trend</p>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Last 60 days
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="taTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="taMissed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#0B3C5D" fill="url(#taTotal)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="missed" name="Missed" stroke="#EF4444" fill="url(#taMissed)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Campus breakdown */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#0B3C5D]" />
              <p className="text-sm font-bold text-slate-800">Campus-wise Attendance</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessions</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byCampus} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="campus_name"
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="sessions" name="Sessions" fill="#0B3C5D" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Subject breakdown */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon size={16} className="text-[#0B3C5D]" />
              <p className="text-sm font-bold text-slate-800">Subjects</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.bySubject}
                  dataKey="sessions"
                  nameKey="subject_name"
                  innerRadius={42}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {analytics.bySubject.map((_, i) => (
                    <Cell key={i} fill={TONE[i % TONE.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Punctuality */}
      {analytics.punctualityTop.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <p className="text-sm font-bold text-slate-800">Teacher Punctuality (most punctual)</p>
            <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Sessions starting on time
            </span>
          </div>
          <div className="space-y-3">
            {analytics.punctualityTop.map((t) => (
              <div key={t.teacher_id}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 truncate max-w-[60%]">{t.teacher_name}</span>
                  <span className="text-slate-800 tabular-nums">{t.punctual_pct}% · {t.total} sessions</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${t.punctual_pct}%`,
                      backgroundColor: t.punctual_pct >= 80 ? "#10B981" : t.punctual_pct >= 60 ? "#D4AF37" : "#EF4444",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
