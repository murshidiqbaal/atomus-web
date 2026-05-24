"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye,
  Loader2, Users,
} from "lucide-react";
import type { TeacherAttendanceDTO, TeacherAttendanceFilters } from "../types";
import { useTeacherAttendanceList } from "../hooks";
import {
  formatDate, formatDateTimeCompact, formatDurationMinutes, formatTime,
} from "../utils/format";
import { Avatar, Card, EmptyState, GpsBadge, StatusBadge } from "./ui";

type SortKey = "date" | "teacher" | "campus" | "subject" | "duration" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 12;

interface Props {
  filters: TeacherAttendanceFilters;
  onOpenSession: (id: string) => void;
}

export function AttendanceTable({ filters, onOpenSession }: Props) {
  const { data: rows = [], isLoading } = useTeacherAttendanceList(filters);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const out = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = sortField(a, sortKey);
      const bv = sortField(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return out;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  const toggle = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
    setPage(1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] p-1.5 rounded-lg">
          <Users size={14} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 leading-tight">Teacher Attendance Records</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {rows.length} session{rows.length === 1 ? "" : "s"} matching current filters
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : pageRows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Users size={20} />}
            title="No records match these filters"
            hint="Adjust filters or expand the date range to see more sessions."
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/60">
                  <ThSort label="Teacher" active={sortKey === "teacher"} dir={sortDir} onClick={() => toggle("teacher")} />
                  <ThSort label="Campus" active={sortKey === "campus"} dir={sortDir} onClick={() => toggle("campus")} />
                  <ThSort label="Subject / Course" active={sortKey === "subject"} dir={sortDir} onClick={() => toggle("subject")} />
                  <ThSort label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggle("date")} />
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <ThSort label="Duration" active={sortKey === "duration"} dir={sortDir} onClick={() => toggle("duration")} />
                  <ThSort label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggle("status")} />
                  <th className="py-3 px-4">GPS</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onOpenSession(row.id)}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={row.teacher?.full_name ?? "?"}
                          url={row.teacher?.profile_photo_url}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {row.teacher?.full_name ?? "Unknown"}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{row.teacher?.email ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{row.campus?.name ?? "—"}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-slate-700 truncate">{row.subject?.name ?? "—"}</p>
                      <p className="text-[11px] text-slate-400 truncate">{row.course?.name ?? ""}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold tabular-nums">{formatDate(row.attendance_date)}</td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums">{formatTime(row.start_time)}</td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums">{row.end_time ? formatTime(row.end_time) : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                      {formatDurationMinutes(row.total_duration_minutes)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.attendance_status} />
                    </td>
                    <td className="py-3 px-4">
                      <GpsBadge status={gpsForRow(row)} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenSession(row.id); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-[#0B3C5D] bg-[#0B3C5D]/5 hover:bg-[#0B3C5D]/10 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pager */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">
              Page {page} of {totalPages} · Showing {pageRows.length} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function ThSort({
  label, active, dir, onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="py-3 px-4">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        ) : (
          <ArrowUpDown size={11} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

function sortField(r: TeacherAttendanceDTO, k: SortKey): string | number {
  switch (k) {
    case "teacher": return (r.teacher?.full_name ?? "").toLowerCase();
    case "campus": return (r.campus?.name ?? "").toLowerCase();
    case "subject": return (r.subject?.name ?? "").toLowerCase();
    case "duration": return Number(r.total_duration_minutes ?? 0);
    case "status": return r.attendance_status;
    case "date":
    default: {
      // combine date + start_time for stable secondary ordering
      const dStr = r.attendance_date ?? "";
      const tStr = r.start_time ?? "";
      return `${dStr} ${tStr}`;
    }
  }
}

function gpsForRow(r: TeacherAttendanceDTO): "Verified" | "Outside" | "Unknown" {
  if (r.latitude != null && r.longitude != null) {
    if (r.attendance_status === "Missed") return "Outside";
    return "Verified";
  }
  return "Unknown";
}

