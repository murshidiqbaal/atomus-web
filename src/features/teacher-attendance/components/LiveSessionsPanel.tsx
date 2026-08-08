"use client";

import {
  BookOpen, Building2, ChevronRight, Clock, Loader2, Radio,
  RefreshCw, UserCheck,
} from "lucide-react";
import type { ActiveSessionModel } from "../types";
import { ACTIVE_SESSIONS_REFETCH_MS, useActiveSessions } from "../hooks";
import type { TeacherAttendanceFilters } from "../types";
import { Avatar, Card, EmptyState, GhostButton, GpsBadge, StatusBadge } from "./ui";
import { SessionTimer } from "./SessionTimer";
import { formatTime, MAX_SESSION_MS } from "../utils/format";

interface Props {
  filters: TeacherAttendanceFilters;
  onOpenSession: (sessionId: string) => void;
}

export function LiveSessionsPanel({ filters, onOpenSession }: Props) {
  const { data: sessions = [], isLoading, isFetching, refetch, dataUpdatedAt } =
    useActiveSessions(filters);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" aria-hidden />
          <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
            <Radio size={14} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 leading-tight">Currently Active Teachers</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Live · Auto-closed after 4h max · Auto-refresh every {Math.round(ACTIVE_SESSIONS_REFETCH_MS / 1000)}s
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <Clock size={12} />
            {dataUpdatedAt ? `Updated ${formatTime(new Date(dataUpdatedAt).toISOString())}` : "—"}
          </span>
          <GhostButton onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">Refresh</span>
          </GhostButton>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={20} />}
            title="No teachers are currently in session"
            hint="Active sessions started from the teacher app automatically punch out after 4 hours."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <LiveSessionCard
                key={s.id}
                session={s}
                onOpen={() => onOpenSession(s.id)}
                onExpire={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LiveSessionCard({
  session, onOpen, onExpire,
}: { session: ActiveSessionModel; onOpen: () => void; onExpire?: () => void }) {
  const rawElapsed = Math.max(0, Date.now() - session.startedAtEpochMs);
  const pct = Math.min(100, Math.round((rawElapsed / MAX_SESSION_MS) * 100));
  const isNearLimit = pct >= 85;

  return (
    <button
      onClick={onOpen}
      className="group relative overflow-hidden text-left bg-gradient-to-br from-white to-emerald-50/40
                 rounded-2xl border border-emerald-100/80 p-4 hover:border-emerald-300 hover:shadow-md
                 transition-all active:scale-[0.99]"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={16} className="text-slate-400" />
      </div>

      <div className="flex items-start gap-3">
        <Avatar name={session.teacherName} url={session.teacherPhoto} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-800 truncate">{session.teacherName}</p>
          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
            <BookOpen size={11} className="text-[#0B3C5D]" />
            {session.subjectName} · {session.courseName}
          </p>
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
            <Building2 size={11} />
            {session.campusName}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Running</p>
          <p className="text-lg font-black text-emerald-600 leading-tight">
            <SessionTimer startedAtEpochMs={session.startedAtEpochMs} onExpire={onExpire} />
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Since {formatTime(session.startedAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={session.status} />
          <GpsBadge status={session.gps} />
        </div>
      </div>

      {/* 4-hour max progress bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-semibold">
          <span>Max 4h Limit</span>
          <span className={isNearLimit ? "text-amber-600 font-bold" : ""}>{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isNearLimit ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}
