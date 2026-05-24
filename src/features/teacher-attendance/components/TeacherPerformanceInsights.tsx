"use client";

import { useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, ShieldCheck, Users,
} from "lucide-react";
import type {
  TeacherAttendanceDTO, TeacherPerformanceRow,
} from "../types";
import { useTeacherAttendanceAnalytics } from "../hooks";
import { isLatePunchIn } from "../utils/format";
import { Avatar, Card, EmptyState } from "./ui";

function buildPerformance(rows: TeacherAttendanceDTO[]): TeacherPerformanceRow[] {
  const map = new Map<string, TeacherPerformanceRow & {
    daySet: Set<string>;
    photo: string | null;
  }>();

  for (const r of rows) {
    if (!r.teacher) continue;
    const id = r.teacher.id;
    const existing = map.get(id);
    const entry = existing ?? {
      teacher_id: id,
      teacher_name: r.teacher.full_name,
      teacher_photo: r.teacher.profile_photo_url,
      campus_name: r.campus?.name ?? "—",
      total_sessions: 0,
      completed_sessions: 0,
      missed_sessions: 0,
      active_sessions: 0,
      total_minutes: 0,
      avg_minutes_per_session: 0,
      avg_daily_hours: 0,
      consistency_pct: 0,
      late_punch_in_count: 0,
      punctual_pct: 0,
      daySet: new Set<string>(),
      photo: r.teacher.profile_photo_url,
    };

    entry.total_sessions++;
    if (r.attendance_status === "Completed") entry.completed_sessions++;
    if (r.attendance_status === "Missed") entry.missed_sessions++;
    if (r.attendance_status === "Active") entry.active_sessions++;
    entry.total_minutes += Number(r.total_duration_minutes ?? 0);
    if (r.start_time && isLatePunchIn(r.start_time)) entry.late_punch_in_count++;
    entry.daySet.add(r.attendance_date);

    map.set(id, entry);
  }

  return Array.from(map.values())
    .map((e) => {
      const completedOrMissed = e.completed_sessions + e.missed_sessions;
      const punctualDenom = e.total_sessions - e.missed_sessions;
      return {
        teacher_id: e.teacher_id,
        teacher_name: e.teacher_name,
        teacher_photo: e.photo,
        campus_name: e.campus_name,
        total_sessions: e.total_sessions,
        completed_sessions: e.completed_sessions,
        missed_sessions: e.missed_sessions,
        active_sessions: e.active_sessions,
        total_minutes: e.total_minutes,
        avg_minutes_per_session: e.total_sessions ? Math.round(e.total_minutes / e.total_sessions) : 0,
        avg_daily_hours: e.daySet.size ? Math.round((e.total_minutes / e.daySet.size / 60) * 10) / 10 : 0,
        consistency_pct: completedOrMissed ? Math.round((e.completed_sessions / completedOrMissed) * 100) : 0,
        late_punch_in_count: e.late_punch_in_count,
        punctual_pct: punctualDenom > 0 ? Math.round(((punctualDenom - e.late_punch_in_count) / punctualDenom) * 100) : 0,
      } satisfies TeacherPerformanceRow;
    })
    .sort((a, b) => b.total_sessions - a.total_sessions);
}

export function TeacherPerformanceInsights() {
  const { data: rows = [], isLoading } = useTeacherAttendanceAnalytics();
  const perf = useMemo(() => buildPerformance(rows), [rows]);

  if (isLoading) {
    return (
      <Card className="py-16 flex items-center justify-center text-slate-400">
        <Loader2 size={20} className="animate-spin" />
      </Card>
    );
  }

  if (perf.length === 0) {
    return (
      <EmptyState
        icon={<Users size={20} />}
        title="No teacher performance data yet"
        hint="Data appears once teachers complete sessions from the Flutter app."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {perf.map((t) => <PerformanceCard key={t.teacher_id} row={t} />)}
    </div>
  );
}

function PerformanceCard({ row }: { row: TeacherPerformanceRow }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={row.teacher_name} url={row.teacher_photo} size={42} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-800 truncate">{row.teacher_name}</p>
          <p className="text-[11px] text-slate-400 truncate">{row.campus_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sessions</p>
          <p className="text-lg font-black text-slate-800 leading-tight">{row.total_sessions}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat
          icon={<CheckCircle2 size={12} />}
          label="Done"
          value={row.completed_sessions.toString()}
          tone="emerald"
        />
        <MiniStat
          icon={<AlertTriangle size={12} />}
          label="Missed"
          value={row.missed_sessions.toString()}
          tone="rose"
        />
        <MiniStat
          icon={<Clock size={12} />}
          label="Avg/Day"
          value={`${row.avg_daily_hours}h`}
          tone="indigo"
        />
      </div>

      <div className="mt-3 space-y-2">
        <Meter label="Consistency" pct={row.consistency_pct} />
        <Meter label="Punctuality" pct={row.punctual_pct} tone="gold" />
      </div>

      {row.late_punch_in_count > 0 && (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
          <ShieldCheck size={11} />
          {row.late_punch_in_count} late punch-in{row.late_punch_in_count === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}

function MiniStat({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "rose" | "indigo";
}) {
  const palette =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : "bg-indigo-50 text-indigo-700";
  return (
    <div className={`${palette} rounded-lg py-1.5 px-2`}>
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold opacity-80">{icon}{label}</div>
      <p className="text-sm font-black tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function Meter({ label, pct, tone = "blue" }: { label: string; pct: number; tone?: "blue" | "gold" }) {
  const color = tone === "gold"
    ? (pct >= 80 ? "#D4AF37" : pct >= 60 ? "#F59E0B" : "#EF4444")
    : (pct >= 80 ? "#10B981" : pct >= 60 ? "#0B3C5D" : "#EF4444");
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-700 tabular-nums">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
