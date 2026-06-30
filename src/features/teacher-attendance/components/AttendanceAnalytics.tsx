"use client";

import { useMemo, useState } from "react";
import {
  Activity, BarChart3, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2,
  PieChart as PieIcon, Sparkles, TrendingUp, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie,
  PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import type {
  TeacherAttendanceAnalytics, TeacherAttendanceDTO, TeacherAttendanceFilters,
} from "../types";
import { useTeacherAttendanceAnalytics } from "../hooks";
import { isLatePunchIn } from "../utils/format";
import { Avatar, Card, EmptyState, StatCard } from "./ui";
import { SkeletonGraph } from "@/components/shared/Skeleton";

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
      const s = bySubject.get(r.subject.name) ?? { name: r.subject.name, sessions: 0, minutes: 0 };
      s.sessions++;
      s.minutes += mins;
      bySubject.set(r.subject.name, s);
    }

    if (r.teacher && r.attendance_status !== "Missed" && r.start_time) {
      const t = byTeacher.get(r.teacher.id) ?? { name: r.teacher.full_name, total: 0, punctual: 0 };
      t.total++;
      if (!isLatePunchIn(r.start_time)) t.punctual++;
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
      .map(([name, v]) => ({ subject_id: name, subject_name: name, sessions: v.sessions, minutes: v.minutes }))
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

function getCampusColor(campusName: string) {
  const colors = [
    { bg: "bg-sky-50 border-sky-200 text-sky-800", dot: "bg-sky-500" },
    { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500" },
    { bg: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-500" },
    { bg: "bg-purple-50 border-purple-200 text-purple-800", dot: "bg-purple-500" },
    { bg: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-500" },
    { bg: "bg-indigo-50 border-indigo-200 text-indigo-800", dot: "bg-indigo-500" },
    { bg: "bg-cyan-50 border-cyan-200 text-cyan-800", dot: "bg-cyan-500" },
  ];
  
  let hash = 0;
  for (let i = 0; i < campusName.length; i++) {
    hash = campusName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function AttendanceAnalytics({
  filters,
  onOpenSession,
}: {
  filters: TeacherAttendanceFilters;
  onOpenSession: (id: string) => void;
}) {
  const { data: rows = [], isLoading } = useTeacherAttendanceAnalytics();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Apply filters on client-side dynamically
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filters.campus_id && r.campus_id !== filters.campus_id) return false;
      if (filters.teacher_id && r.teacher_id !== filters.teacher_id) return false;
      if (filters.course_id && r.course_id !== filters.course_id) return false;
      if (filters.subject_id && r.subject_id !== filters.subject_id) return false;
      if (filters.status && r.attendance_status !== filters.status) return false;
      if (filters.date_from && r.attendance_date < filters.date_from) return false;
      if (filters.date_to && r.attendance_date > filters.date_to) return false;
      if (filters.search.trim()) {
        const needle = filters.search.trim().toLowerCase();
        const teacherName = (r.teacher?.full_name ?? "").toLowerCase();
        const subjectName = (r.subject?.name ?? "").toLowerCase();
        const courseName = (r.course?.name ?? "").toLowerCase();
        const campusName = (r.campus?.name ?? "").toLowerCase();
        return (
          teacherName.includes(needle) ||
          subjectName.includes(needle) ||
          courseName.includes(needle) ||
          campusName.includes(needle)
        );
      }
      return true;
    });
  }, [rows, filters]);

  const analytics = useMemo(() => buildAnalytics(filteredRows), [filteredRows]);

  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    return filteredRows.filter(r => r.attendance_date === selectedDate);
  }, [filteredRows, selectedDate]);

  const campusLegend = useMemo(() => {
    const set = new Set<string>();
    for (const r of filteredRows) {
      if (r.campus?.name) {
        set.add(r.campus.name);
      }
    }
    return Array.from(set).sort();
  }, [filteredRows]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 6 = Sat
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(selectedYear, selectedMonth, d));
    }
    return days;
  }, [selectedMonth, selectedYear]);

  const isFiltered = !!(
    filters.search || filters.campus_id || filters.course_id || filters.subject_id ||
    filters.teacher_id || filters.status || filters.date_from || filters.date_to
  );

  const prevMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 0) {
        setSelectedYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setSelectedMonth((prev) => {
      if (prev === 11) {
        setSelectedYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  if (isLoading) {
    return <SkeletonGraph height="h-72" />;
  }

  if (rows.length === 0) {
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
          sub="Across selected days"
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
          sub="Across selected days"
        />
      </div>

      {/* Calendar Card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#0B3C5D]" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Teacher Attendance Calendar</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any day with sessions to view teacher breakdown</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-inner self-start sm:self-auto">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700 min-w-[100px] text-center">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Filter Alert Banner */}
        {isFiltered && (
          <div className="mb-4 bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-[#0B3C5D]">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#D4AF37] animate-pulse" />
              <span>Calendar stats are active for the currently selected filters.</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {campusLegend.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] font-black text-slate-400 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 uppercase tracking-wider">
            <span className="text-slate-400 font-black">Campus Legend:</span>
            {campusLegend.map((campusName) => {
              const color = getCampusColor(campusName);
              return (
                <div key={campusName} className="flex items-center gap-1.5 normal-case font-bold text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                  <span>{campusName}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => {
            if (!day) {
              return (
                <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/20 border border-slate-100/50 rounded-xl" />
              );
            }

            const dateStr = formatLocalDate(day);
            const daySessions = filteredRows.filter((r) => r.attendance_date === dateStr);

            // Group by campus
            const campusCounts = new Map<string, { name: string; count: number }>();
            for (const r of daySessions) {
              const campusId = r.campus_id ?? "unassigned";
              const campusName = r.campus?.name ?? "Other";
              const cur = campusCounts.get(campusId) ?? { name: campusName, count: 0 };
              cur.count++;
              campusCounts.set(campusId, cur);
            }
            const campusList = Array.from(campusCounts.entries());
            const isToday = formatLocalDate(new Date()) === dateStr;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (daySessions.length > 0) {
                    setSelectedDate(dateStr);
                  }
                }}
                className={`min-h-[110px] p-2 md:p-3 bg-white rounded-xl border flex flex-col justify-between transition-all group relative
                  ${daySessions.length > 0 ? "cursor-pointer hover:shadow-md hover:border-slate-300" : ""}
                  ${isToday ? "border-[#0B3C5D] ring-2 ring-[#0B3C5D]/10 bg-slate-50/10" : "border-slate-200"}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold ${isToday ? "text-[#0B3C5D] font-black" : "text-slate-500"}`}>
                    {day.getDate()}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md group-hover:bg-[#0B3C5D]/15 group-hover:text-[#0B3C5D] transition-all">
                      {daySessions.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-2 overflow-hidden">
                  {campusList.slice(0, 3).map(([id, info]) => {
                    const color = getCampusColor(info.name);
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between text-[9px] font-black px-1.5 py-0.5 rounded border leading-tight ${color.bg}`}
                        title={`${info.name}: ${info.count} sessions`}
                      >
                        <span className="truncate max-w-[65px]">{info.name}</span>
                        <span>{info.count}</span>
                      </div>
                    );
                  })}
                  {campusList.length > 3 && (
                    <div className="text-[9px] font-bold text-slate-400 text-center py-0.5">
                      + {campusList.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Attendance Records
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {selectedDateSessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No sessions match current filters for this day.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedDateSessions.map((session) => {
                    const statusTone = 
                      session.attendance_status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : session.attendance_status === "Active"
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "bg-rose-50 text-rose-700 border-rose-100";
                    return (
                      <div key={session.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={session.teacher?.full_name ?? "Teacher"}
                            url={session.teacher?.profile_photo_url}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {session.teacher?.full_name ?? "Unknown Teacher"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <span>{session.course?.name ?? "—"}</span>
                              <span>·</span>
                              <span>{session.subject?.name ?? "—"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-600">
                              {session.campus?.name ?? "Other Campus"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {session.start_time
                                ? new Date(session.start_time).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                : "—"}
                              {session.total_duration_minutes ? ` (${session.total_duration_minutes}m)` : ""}
                            </p>
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${statusTone}`}>
                            {session.attendance_status}
                          </span>

                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              onOpenSession(session.id);
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 hover:bg-[#0B3C5D]/25 rounded-lg transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
