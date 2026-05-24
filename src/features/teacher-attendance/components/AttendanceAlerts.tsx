"use client";

import { useMemo } from "react";
import { AlertTriangle, ChevronRight, Clock, MapPin, XCircle } from "lucide-react";
import type {
  AttendanceAlert, AttendanceAlertKind, TeacherAttendanceDTO, TeacherAttendanceFilters,
} from "../types";
import { useTeacherAttendanceList } from "../hooks";
import { Card } from "./ui";
import { formatDate, formatDurationMinutes, formatTime, SHORT_SESSION_MINUTES } from "../utils/format";

const KIND_META: Record<AttendanceAlertKind, { label: string; tone: string; bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  missing_punch_out: { label: "Missing punch out", tone: "text-amber-700", bg: "bg-amber-50 border-amber-100", icon: Clock },
  short_session: { label: "Unusually short", tone: "text-orange-700", bg: "bg-orange-50 border-orange-100", icon: Clock },
  missed_class: { label: "Missed class", tone: "text-rose-700", bg: "bg-rose-50 border-rose-100", icon: XCircle },
  no_gps: { label: "GPS not captured", tone: "text-slate-700", bg: "bg-slate-100 border-slate-200", icon: MapPin },
};

function buildAlerts(rows: TeacherAttendanceDTO[]): AttendanceAlert[] {
  const out: AttendanceAlert[] = [];
  const now = Date.now();
  const ELEVEN_HOURS = 11 * 60 * 60 * 1000;

  for (const r of rows) {
    const teacher = r.teacher?.full_name ?? "Unknown teacher";

    if (r.attendance_status === "Active" && r.start_time) {
      const elapsed = now - new Date(r.start_time).getTime();
      if (elapsed > ELEVEN_HOURS) {
        out.push({
          id: `${r.id}-missing`,
          kind: "missing_punch_out",
          teacher_name: teacher,
          detail: `Active since ${formatTime(r.start_time)} on ${formatDate(r.attendance_date)} — over 11 hours`,
          occurred_at: r.start_time,
          session_id: r.id,
        });
      }
    }

    if (r.attendance_status === "Missed") {
      out.push({
        id: `${r.id}-missed`,
        kind: "missed_class",
        teacher_name: teacher,
        detail: `Marked missed on ${formatDate(r.attendance_date)}${r.subject ? ` · ${r.subject.name}` : ""}`,
        occurred_at: r.start_time ?? r.created_at,
        session_id: r.id,
      });
    }

    if (
      r.attendance_status === "Completed" &&
      (r.total_duration_minutes ?? 0) > 0 &&
      (r.total_duration_minutes ?? 0) < SHORT_SESSION_MINUTES
    ) {
      out.push({
        id: `${r.id}-short`,
        kind: "short_session",
        teacher_name: teacher,
        detail: `Session only ${formatDurationMinutes(r.total_duration_minutes)} on ${formatDate(r.attendance_date)}`,
        occurred_at: r.start_time ?? r.created_at,
        session_id: r.id,
      });
    }

    if (
      r.attendance_status !== "Missed" &&
      r.start_time &&
      (r.latitude == null || r.longitude == null)
    ) {
      out.push({
        id: `${r.id}-nogps`,
        kind: "no_gps",
        teacher_name: teacher,
        detail: `Started ${formatTime(r.start_time)} without GPS coordinates`,
        occurred_at: r.start_time,
        session_id: r.id,
      });
    }
  }

  return out
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 12);
}

export function AttendanceAlerts({
  filters, onOpenSession,
}: {
  filters: TeacherAttendanceFilters;
  onOpenSession: (id: string) => void;
}) {
  const { data: rows = [] } = useTeacherAttendanceList(filters);
  const alerts = useMemo(() => buildAlerts(rows), [rows]);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
          <AlertTriangle size={14} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 leading-tight">Attendance Warnings</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {alerts.length === 0 ? "All clear — no anomalies detected" : `${alerts.length} item${alerts.length === 1 ? "" : "s"} need attention`}
          </p>
        </div>
      </div>

      <div className="p-4">
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Nothing to flag right now.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => {
              const meta = KIND_META[a.kind];
              const Icon = meta.icon;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => onOpenSession(a.session_id)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border ${meta.bg} hover:shadow-sm transition-all group`}
                  >
                    <Icon size={14} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] font-black uppercase tracking-widest ${meta.tone}`}>
                        {meta.label}
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{a.teacher_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{a.detail}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
