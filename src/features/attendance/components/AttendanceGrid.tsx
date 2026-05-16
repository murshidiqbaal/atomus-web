"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Search, RotateCcw, CheckCircle2, XCircle, Clock, Calendar, MinusCircle,
  Save, Loader2, Users,
} from "lucide-react";
import type {
  AttendanceFilters, AttendanceRecord, AttendanceStatus, StudentLite,
} from "../types";
import { STATUS_KEY } from "../types";
import { useSaveAttendance } from "../hooks";
import { AttendanceRow } from "./AttendanceRow";
import { Card, EmptyState, fieldCls, STATUS_CFG } from "./ui";

interface RowState {
  status: AttendanceStatus;
  remarks: string;
}

const FILTER_STATUSES = ["All", "Present", "Absent", "Late", "Unmarked"] as const;
type StatusFilter = (typeof FILTER_STATUSES)[number];

interface Props {
  filters: AttendanceFilters;
  students: StudentLite[];
  records: AttendanceRecord[];
  isLoading: boolean;
  subjectName?: string;
  onToast: (type: "success" | "error", msg: string) => void;
}

export function AttendanceGrid({
  filters, students, records, isLoading, subjectName, onToast,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [overrides, setOverrides] = useState<Record<string, RowState>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  const subjectId = filters.subject_id || null;
  const saveMut = useSaveAttendance(filters.campus_id, filters.course_id, filters.batch_id, filters.attendance_date, subjectId);

  // Server-side truth derived from the records query.
  const serverMap = useMemo(() => {
    const map: Record<string, RowState> = {};
    for (const r of records) {
      map[r.student_id] = { status: r.status, remarks: r.remarks ?? "" };
    }
    return map;
  }, [records]);

  const defaultRemarks = subjectName ? subjectName : "";

  // What the UI shows: server values with local edits layered on top.
  const display = useMemo(() => {
    const out: Record<string, RowState> = {};
    for (const s of students) {
      out[s.id] = overrides[s.id] ?? serverMap[s.id] ?? { status: "Unmarked", remarks: defaultRemarks };
    }
    return out;
  }, [students, serverMap, overrides, defaultRemarks]);

  const hasChanges = useMemo(() => {
    for (const id in overrides) {
      const o = overrides[id];
      const srv = serverMap[id] ?? { status: "Unmarked", remarks: defaultRemarks };
      if (o.status !== srv.status || (o.remarks ?? "") !== (srv.remarks ?? "")) return true;
    }
    return false;
  }, [overrides, serverMap, defaultRemarks]);

  // Reset overrides whenever the (batch, date, subject) tuple shifts.
  // The parent re-mounts the grid in that case by changing its key, so
  // overrides start fresh per session.

  const setStatus = useCallback((studentId: string, next: AttendanceStatus) => {
    setOverrides((p) => ({
      ...p,
      [studentId]: { ...(p[studentId] ?? { status: next, remarks: serverMap[studentId]?.remarks ?? defaultRemarks }), status: next },
    }));
  }, [serverMap, defaultRemarks]);

  const setRemarks = useCallback((studentId: string, next: string) => {
    setOverrides((p) => ({
      ...p,
      [studentId]: { ...(p[studentId] ?? { status: serverMap[studentId]?.status ?? "Unmarked", remarks: next }), remarks: next },
    }));
  }, [serverMap]);

  const bulk = useCallback((status: AttendanceStatus) => {
    setOverrides((p) => {
      const next = { ...p };
      for (const s of students) {
        const cur = next[s.id] ?? serverMap[s.id] ?? { status: "Unmarked", remarks: defaultRemarks };
        next[s.id] = { ...cur, status };
      }
      return next;
    });
  }, [students, serverMap, defaultRemarks]);

  const reset = useCallback(() => {
    setOverrides({});
  }, []);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!filters.attendance_date) return;
    const rows = students.map((s) => {
      const d = display[s.id];
      return {
        student_id: s.id,
        campus_id: s.campus_id || filters.campus_id,
        course_id: s.course_id || filters.course_id,
        batch_id: s.batch_id || filters.batch_id,
        subject_id: filters.subject_id || null,
        attendance_date: filters.attendance_date,
        status: d.status,
        remarks: d.remarks?.trim() || null,
      };
    });
    saveMut.mutate(rows, {
      onSuccess: () => {
        onToast("success", `Saved attendance for ${rows.length} student${rows.length === 1 ? "" : "s"}.`);
        setOverrides({});
      },
      onError: (err) => {
        onToast("error", err instanceof Error ? err.message : "Failed to save attendance.");
      },
    });
  }, [students, display, filters, saveMut, onToast]);

  // ── Keyboard nav: ArrowUp/Down moves focus; P/A/L/V sets status. ─
  // Listener lives on the <table> so each row doesn't need its own handler.
  const handleTableKey = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const tr = (e.target as HTMLElement).closest("tr[data-row]") as HTMLTableRowElement | null;
    if (!tr) return;
    const rowIndex = Number(tr.dataset.row);
    const ids = filteredIds;
    const id = ids[rowIndex];
    if (!id) return;

    const key = e.key;
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter") {
      e.preventDefault();
      const delta = key === "ArrowUp" ? -1 : 1;
      const nextIdx = Math.max(0, Math.min(ids.length - 1, rowIndex + delta));
      tableRef.current?.querySelector<HTMLTableRowElement>(`tr[data-row="${nextIdx}"]`)?.focus();
      return;
    }
    const mapped = STATUS_KEY[key];
    if (mapped) {
      e.preventDefault();
      setStatus(id, mapped);
    }
  };

  // ── Search & status filter ─────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const inName = s.full_name.toLowerCase().includes(q);
        const inRoll = (s.roll_number ?? "").toLowerCase().includes(q);
        if (!inName && !inRoll) return false;
      }
      if (statusFilter !== "All" && display[s.id].status !== statusFilter) return false;
      return true;
    });
  }, [students, search, statusFilter, display]);

  const filteredIds = filtered.map((s) => s.id);

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const out = { Present: 0, Absent: 0, Late: 0, Unmarked: 0 };
    for (const s of students) out[display[s.id].status]++;
    return out;
  }, [students, display]);

  const total = students.length;

  if (!filters.attendance_date) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="Pick attendance date"
        hint="The attendance grid will appear once you've selected a date."
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-100 rounded w-44" />
              <div className="h-2.5 bg-slate-100 rounded w-24" />
            </div>
            <div className="flex gap-1">
              {Array(4).fill(0).map((_, j) => <div key={j} className="w-8 h-8 rounded-full bg-slate-100" />)}
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users size={26} />}
        title="No students found"
        hint="Adjust your campus, course, or batch selection, or add students first."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Present" count={stats.Present} total={total} status="Present" icon={<CheckCircle2 size={16} />} />
        <SummaryCard label="Absent" count={stats.Absent} total={total} status="Absent" icon={<XCircle size={16} />} />
        <SummaryCard label="Late" count={stats.Late} total={total} status="Late" icon={<Clock size={16} />} />
        <SummaryCard label="Unmarked" count={stats.Unmarked} total={total} status="Unmarked" icon={<MinusCircle size={16} />} />
      </div>

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll…"
              className={`${fieldCls} pl-9`}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
            {FILTER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors
                  ${statusFilter === s
                    ? "bg-white text-[#0B3C5D] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"}`}
              >
                {s}{s !== "All" && <span className="ml-1 opacity-60">{stats[s as AttendanceStatus]}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <BulkButton onClick={() => bulk("Present")} tone="emerald"><CheckCircle2 size={13} /> All Present</BulkButton>
            <BulkButton onClick={() => bulk("Absent")} tone="rose"><XCircle size={13} /> All Absent</BulkButton>
            <BulkButton onClick={reset} tone="slate" disabled={!hasChanges}><RotateCcw size={13} /> Reset edits</BulkButton>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveMut.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-white
                         bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all
                         shadow-md shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {hasChanges ? "Save" : "Saved"}
            </button>
          </div>
        </div>
        {hasChanges && (
          <p className="mt-2 text-[11px] font-bold text-amber-600">
            Unsaved changes — press Save or use Ctrl+S.
          </p>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {filtered.length} of {total} students
          </p>
          <p className="hidden md:block text-[11px] text-slate-400">
            Tip: <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">P</kbd>{" "}/{" "}
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">A</kbd>{" "}/{" "}
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">L</kbd>{" "}
            to set status · <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd> to navigate
          </p>
        </div>
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table
            ref={tableRef}
            onKeyDown={handleTableKey}
            className="w-full text-left border-collapse"
          >
            <thead className="sticky top-0 z-10 bg-slate-50 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-24">Roll</th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Student</th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-56">Status</th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-slate-400">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <AttendanceRow
                    key={s.id}
                    rowIndex={idx}
                    student={s}
                    status={display[s.id].status}
                    remarks={display[s.id].remarks}
                    onStatus={setStatus}
                    onRemarks={setRemarks}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  label, count, total, status, icon,
}: {
  label: string;
  count: number;
  total: number;
  status: AttendanceStatus;
  icon: React.ReactNode;
}) {
  const cfg = STATUS_CFG[status];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Card className="p-3 flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-lg ${cfg.bg} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-lg font-black text-slate-800 leading-tight tabular-nums">{count}</p>
      </div>
      <span className="text-[11px] font-bold text-slate-500 tabular-nums">{pct}%</span>
    </Card>
  );
}

function BulkButton({
  children, onClick, tone, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: "emerald" | "rose" | "slate";
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    rose: "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
