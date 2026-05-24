"use client";

import { useMemo, useState } from "react";
import {
  Activity, BarChart3, Building2, CalendarRange,
  ChevronRight, Timer, Users,
} from "lucide-react";
import type { RangePreset, TeacherAttendanceFilters } from "../types";
import { EMPTY_FILTERS } from "../types";
import { useActiveSessions } from "../hooks";
import { isoDaysAgo, todayIso } from "../utils/format";
import { ToastStack, useToasts } from "../components/ui";
import { LiveSessionsPanel } from "../components/LiveSessionsPanel";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceTable } from "../components/AttendanceTable";
import { PunchInPunchOutTimeline } from "../components/PunchInPunchOutTimeline";
import { AttendanceAnalytics } from "../components/AttendanceAnalytics";
import { TeacherPerformanceInsights } from "../components/TeacherPerformanceInsights";
import { AttendanceAlerts } from "../components/AttendanceAlerts";
import { SessionDetailsModal } from "../components/SessionDetailsModal";

type Tab = "live" | "records" | "timeline" | "analytics" | "performance";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabDef[] = [
  { id: "live",        label: "Live Sessions",  icon: Activity },
  { id: "records",     label: "Records",        icon: Users },
  { id: "timeline",    label: "Timeline",       icon: Timer },
  { id: "analytics",   label: "Analytics",      icon: BarChart3 },
  { id: "performance", label: "Performance",    icon: Building2 },
];

const RANGE_PRESETS: { v: RangePreset; label: string }[] = [
  { v: "today", label: "Today" },
  { v: "week",  label: "7 days" },
  { v: "month", label: "30 days" },
  { v: "all",   label: "All" },
];

function applyRange(filters: TeacherAttendanceFilters, range: RangePreset): TeacherAttendanceFilters {
  if (range === "all") return { ...filters, date_from: "", date_to: "" };
  if (range === "today") return { ...filters, date_from: todayIso(), date_to: todayIso() };
  const days = range === "week" ? 6 : 29;
  return { ...filters, date_from: isoDaysAgo(days), date_to: todayIso() };
}

function deriveRange(filters: TeacherAttendanceFilters): RangePreset | null {
  if (!filters.date_from && !filters.date_to) return "all";
  const today = todayIso();
  if (filters.date_from === today && filters.date_to === today) return "today";
  if (filters.date_to === today && filters.date_from === isoDaysAgo(6)) return "week";
  if (filters.date_to === today && filters.date_from === isoDaysAgo(29)) return "month";
  return null;
}

export default function TeacherAttendancePage() {
  const [active, setActive] = useState<Tab>("live");
  const [filters, setFilters] = useState<TeacherAttendanceFilters>(() =>
    applyRange(EMPTY_FILTERS, "month"),
  );
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const { toasts, add, dismiss } = useToasts();

  const range = useMemo(() => deriveRange(filters), [filters]);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <SessionDetailsModal
        sessionId={openSessionId}
        onClose={() => setOpenSessionId(null)}
        onToast={add}
      />

      <div className="p-4 lg:p-6 max-w-[1500px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
              <Timer size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Teacher Attendance Monitor
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time sessions · punch-in/out history · geofenced attendance · per-teacher performance.
              </p>
            </div>
          </div>

          {/* Range pills */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm self-start sm:self-auto">
            <CalendarRange size={13} className="text-slate-400 ml-1" />
            {RANGE_PRESETS.map((p) => {
              const isActive = range === p.v;
              return (
                <button
                  key={p.v}
                  onClick={() => setFilters((prev) => applyRange(prev, p.v))}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-colors ${
                    isActive
                      ? "bg-[#0B3C5D] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-1 px-1">
          <nav className="inline-flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#0B3C5D] text-white shadow-md shadow-[#0B3C5D]/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <AttendanceFilters value={filters} onChange={setFilters} />

        {/* Content */}
        {active === "live" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <LiveSessionsPanel
                filters={filters}
                onOpenSession={setOpenSessionId}
              />
              <ActiveClassesMonitor
                filters={filters}
                onSeeAll={() => setActive("records")}
              />
            </div>
            <div className="space-y-4">
              <AttendanceAlerts filters={filters} onOpenSession={setOpenSessionId} />
            </div>
          </div>
        )}

        {active === "records" && (
          <AttendanceTable filters={filters} onOpenSession={setOpenSessionId} />
        )}

        {active === "timeline" && (
          <PunchInPunchOutTimeline filters={filters} onOpenSession={setOpenSessionId} />
        )}

        {active === "analytics" && (
          <AttendanceAnalytics />
        )}

        {active === "performance" && (
          <TeacherPerformanceInsights />
        )}
      </div>
    </>
  );
}

/**
 * Lightweight summary panel under the live sessions — shows campus-by-campus
 * counts of currently-active classes for at-a-glance monitoring.
 */
function ActiveClassesMonitor({
  filters, onSeeAll,
}: {
  filters: TeacherAttendanceFilters;
  onSeeAll: () => void;
}) {
  const { data: sessions = [] } = useActiveSessions(filters);

  const byCampus = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const s of sessions) {
      const key = s.campusId ?? "unassigned";
      const cur = map.get(key) ?? { name: s.campusName, count: 0 };
      cur.count++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sessions]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
          <Activity size={14} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 leading-tight">Active Classes Monitor</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Campus-by-campus rollup of live sessions</p>
        </div>
        <button
          onClick={onSeeAll}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3C5D] hover:underline"
        >
          See all records <ChevronRight size={11} />
        </button>
      </div>

      <div className="p-4">
        {byCampus.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No active classes right now.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {byCampus.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-3 bg-gradient-to-br from-slate-50 to-white border border-slate-100"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Building2 size={10} />
                  Campus
                </p>
                <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{c.name}</p>
                <p className="text-lg font-black text-[#0B3C5D] mt-1">
                  {c.count} <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">active</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

