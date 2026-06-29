"use client";

import { useMemo, useState } from "react";
import {
  Search, Activity, RotateCcw, Calendar, AppWindow,
  Monitor, RefreshCw, ChevronLeft, ChevronRight,
  BookOpen, Building2, Clock, Smartphone, Info
} from "lucide-react";
import { useParentActivityLogs, useParentActivityMetrics } from "../hooks";
import { useCampuses, useCourses } from "@/features/courses/hooks";

const PAGE_SIZE = 15;

function StatCard({ icon, label, value, sub, tone = "blue" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "gold";
}) {
  const tones: Record<string, string> = {
    blue:    "bg-blue-50/50 text-blue-600 border-blue-100/60",
    emerald: "bg-emerald-50/50 text-emerald-600 border-emerald-100/60",
    amber:   "bg-amber-50/50 text-amber-600 border-amber-100/60",
    rose:    "bg-rose-50/50 text-rose-600 border-rose-100/60",
    gold:    "bg-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/15",
  };
  
  return (
    <div className={`bg-white rounded-3xl border ${tones[tone]} px-6 py-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}>
      <div className={`w-10 h-10 ${tones[tone]} rounded-2xl flex items-center justify-center mb-4 border`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-3xl font-black text-[#0B3C5D] mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-tight">{sub}</p>}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 items-center border-b border-slate-50">
          <div className="h-5 bg-slate-100 rounded-lg w-1/4 animate-pulse" />
          <div className="h-5 bg-slate-100 rounded-lg w-1/6 animate-pulse" />
          <div className="h-5 bg-slate-100 rounded-lg w-1/6 animate-pulse" />
          <div className="h-5 bg-slate-100 rounded-lg w-12 animate-pulse" />
          <div className="h-5 bg-slate-100 rounded-lg w-12 animate-pulse" />
          <div className="h-5 bg-slate-100 rounded-lg w-16 animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function ParentActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [activeToday, setActiveToday] = useState(false);
  const [page, setPage] = useState(1);

  // Queries
  const { data: campuses = [] } = useCampuses(true); // active only
  const { data: courses = [] } = useCourses();
  
  const queryParams = useMemo(() => ({
    search: search.trim() || undefined,
    date: date || undefined,
    campusId: campusId || undefined,
    courseId: courseId || undefined,
    activeToday: activeToday || undefined,
    page,
    limit: PAGE_SIZE
  }), [search, date, campusId, courseId, activeToday, page]);

  const {
    data: logsData,
    isLoading: isLogsLoading,
    isRefetching: isLogsRefetching,
    refetch: refetchLogs
  } = useParentActivityLogs(queryParams);

  const {
    data: metrics,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics
  } = useParentActivityMetrics();

  const totalPages = Math.ceil((logsData?.count || 0) / PAGE_SIZE) || 1;

  function resetFilters() {
    setSearch("");
    setDate("");
    setCampusId("");
    setCourseId("");
    setActiveToday(false);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

  function formatDuration(minutes: number) {
    if (minutes === undefined || minutes === null || minutes <= 0) return "0s";
    const totalSeconds = Math.round(minutes * 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  }

  function formatDateTime(isoString: string) {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  const isRefreshDisabled = isLogsLoading || isLogsRefetching || isMetricsLoading;

  return (
    <div className="p-6 space-y-8 max-w-[1500px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-[#0B3C5D] w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-[#0B3C5D]/20 ring-4 ring-[#0B3C5D]/5">
            <Activity size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Parent Activity Tracking</h1>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
              Monitor app session durations and login activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchLogs();
              refetchMetrics();
            }}
            disabled={isRefreshDisabled}
            className="flex items-center gap-2 bg-slate-100 text-[#0B3C5D] px-5 py-3 rounded-[1.25rem] text-sm font-black hover:bg-slate-200 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} className={isRefreshDisabled ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Activity size={20} />}
          label="Active Parents Today"
          value={isMetricsLoading ? "..." : metrics?.today_active ?? 0}
          sub="Parents logged in today"
          tone="emerald"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Weekly Active Parents"
          value={isMetricsLoading ? "..." : metrics?.weekly_active ?? 0}
          sub="Unique parents (last 7d)"
          tone="blue"
        />
        <StatCard
          icon={<AppWindow size={20} />}
          label="Monthly Active Parents"
          value={isMetricsLoading ? "..." : metrics?.monthly_active ?? 0}
          sub="Unique parents (last 30d)"
          tone="gold"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Avg Session Duration"
          value={isMetricsLoading ? "..." : formatDuration(metrics?.avg_session_duration ?? 0)}
          sub="Average app usage time"
          tone="amber"
        />
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            Filter Activity Logs
          </h2>
          {(search || date || campusId || courseId || activeToday) && (
            <button
              onClick={resetFilters}
              className="text-xs font-black text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by parent name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.1rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-semibold"
            />
          </div>

          {/* Date */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.1rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-semibold text-slate-600"
            />
          </div>

          {/* Campus */}
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.1rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-semibold text-slate-600 appearance-none"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div className="relative">
            <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.1rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-semibold text-slate-600 appearance-none"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkbox for active today */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id="active-today"
            type="checkbox"
            checked={activeToday}
            onChange={(e) => {
              setActiveToday(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 text-[#0B3C5D] border-slate-300 rounded focus:ring-[#0B3C5D]/20 cursor-pointer"
          />
          <label htmlFor="active-today" className="text-xs font-black text-slate-600 select-none cursor-pointer uppercase tracking-wider">
            Show Active Today Only
          </label>
        </div>
      </div>

      {/* Logs Table Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            Activity Log Entries
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {logsData?.count ?? 0} Total
            </span>
          </h3>
        </div>

        {isLogsLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : !logsData?.logs.length ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
              <Info size={24} />
            </div>
            <h4 className="text-base font-black text-[#0B3C5D] tracking-tight">No Logs Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-semibold leading-relaxed">
              We couldn't find any parent activity records matching your filter criteria. Try resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">
                  <th className="px-6 py-4">Parent Name</th>
                  <th className="px-6 py-4">Opened At</th>
                  <th className="px-6 py-4">Last Seen</th>
                  <th className="px-6 py-4">Active Duration</th>
                  <th className="px-6 py-4">Device</th>
                  <th className="px-6 py-4">App Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                {logsData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-[#0B3C5D]">{log.parent_name || 'Unknown Parent'}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(log.opened_at)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDateTime(log.last_seen_at)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/10 text-[#a3801f]">
                        <Clock size={12} />
                        {formatDuration(log.session_duration_minutes)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Smartphone size={14} className="text-slate-400" />
                        {log.device_platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 bg-slate-100 text-xs px-2 py-0.5 rounded font-bold">
                        v{log.app_version}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {logsData && logsData.count > 0 && (
          <div className="px-6 py-5 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-400 font-bold">
              Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, logsData.count)} of {logsData.count} logs
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Render simple pagination: always show current page, first, last, and neighbors
                if (
                  totalPages > 5 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - page) > 1
                ) {
                  if (pageNum === 2 && page > 3) return <span key={pageNum} className="text-slate-300 px-1 text-xs">...</span>;
                  if (pageNum === totalPages - 1 && page < totalPages - 2) return <span key={pageNum} className="text-slate-300 px-1 text-xs">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      page === pageNum
                        ? "bg-[#0B3C5D] text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
