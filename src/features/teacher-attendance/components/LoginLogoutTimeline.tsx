"use client";

import { useMemo } from "react";
import {
  Activity, BookOpen, Building2, Clock, LogIn, LogOut, MapPin,
} from "lucide-react";
import type { TeacherAttendanceFilters } from "../types";
import { useTeacherAttendanceList } from "../hooks";
import {
  formatDate, formatDurationMinutes, formatTime,
} from "../utils/format";
import { Avatar, Card, EmptyState, StatusBadge } from "./ui";

interface Props {
  filters: TeacherAttendanceFilters;
  limit?: number;
  onOpenSession: (id: string) => void;
}

export function LoginLogoutTimeline({ filters, limit = 25, onOpenSession }: Props) {
  const { data: rows = [] } = useTeacherAttendanceList(filters);

  const items = useMemo(() => {
    return [...rows]
      .filter((r) => r.start_time)
      .sort((a, b) => {
        const av = new Date(a.start_time ?? a.attendance_date).getTime();
        const bv = new Date(b.start_time ?? b.attendance_date).getTime();
        return bv - av;
      })
      .slice(0, limit);
  }, [rows, limit]);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-violet-50 text-violet-600 p-1.5 rounded-lg">
          <Activity size={14} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 leading-tight">Login / Logout Timeline</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Recent teacher sessions chronologically</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={<Clock size={20} />} title="No session activity for this window" />
        </div>
      ) : (
        <div className="p-5">
          <ol className="relative border-l-2 border-dashed border-slate-200 space-y-4 pl-5">
            {items.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#0B3C5D] ring-4 ring-white" />
                <button
                  onClick={() => onOpenSession(r.id)}
                  className="w-full text-left bg-white border border-slate-100 rounded-2xl p-3 hover:border-[#0B3C5D]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={r.teacher?.full_name ?? "?"}
                      url={r.teacher?.profile_photo_url}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {r.teacher?.full_name ?? "Unknown"}
                        </p>
                        <StatusBadge status={r.attendance_status} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                        <BookOpen size={11} className="text-[#0B3C5D]" />
                        {r.subject?.name ?? "—"} · {r.course?.name ?? "—"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <Building2 size={11} />
                        {r.campus?.name ?? "—"} · {formatDate(r.attendance_date)}
                      </p>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <TimeChip
                          icon={<LogIn size={11} />}
                          label="Login"
                          value={formatTime(r.start_time)}
                          tone="emerald"
                        />
                        <TimeChip
                          icon={<LogOut size={11} />}
                          label="Logout"
                          value={r.end_time ? formatTime(r.end_time) : "—"}
                          tone="rose"
                        />
                        <TimeChip
                          icon={<Clock size={11} />}
                          label="Duration"
                          value={formatDurationMinutes(r.total_duration_minutes)}
                          tone="slate"
                        />
                      </div>

                      {r.latitude != null && r.longitude != null && (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 inline-flex items-center gap-1">
                          <MapPin size={10} />
                          GPS captured
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}

function TimeChip({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "rose" | "slate";
}) {
  const palette =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : "bg-slate-100 text-slate-600";
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${palette}`}>
      <span>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 leading-none">{label}</p>
        <p className="text-[11px] font-bold tabular-nums truncate leading-tight">{value}</p>
      </div>
    </div>
  );
}

