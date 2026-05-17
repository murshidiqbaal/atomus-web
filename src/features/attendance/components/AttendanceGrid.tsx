"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, RotateCcw, CheckCircle2, XCircle, Clock, Calendar, MinusCircle,
  Loader2, Users, BookMarked, AlertTriangle, CalendarPlus,
} from "lucide-react";
import type {
  AttendanceFilters, AttendanceRecord, AttendanceStatus,
  AttendanceUpsertRow, StudentLite,
} from "../types";
import {
  cycleStatus, defaultPeriods, isFutureDate, DEFAULT_PERIOD_COUNT,
} from "../types";
import { useSaveAttendance, useTeacherRestrictions } from "../hooks";
import { StudentPeriodCard } from "./StudentPeriodCard";
import { Card, EmptyState, fieldCls, STATUS_CFG } from "./ui";

const FILTER_STATUSES = ["All", "Present", "Absent", "Late", "Leave", "Unmarked"] as const;
type StatusFilter = (typeof FILTER_STATUSES)[number];

const AUTO_SAVE_DELAY_MS = 800;

interface Props {
  filters: AttendanceFilters;
  students: StudentLite[];
  records: AttendanceRecord[];
  isLoading: boolean;
  subjectName?: string;
  onToast: (type: "success" | "error", msg: string) => void;
}

type Pending = Record<string, AttendanceStatus>; // cellKey → status

export function AttendanceGrid({
  filters, students, records, isLoading, subjectName, onToast,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Dirty cells waiting for the debounced flush. Cleared on successful save.
  const [pending, setPending] = useState<Pending>({});
  // Cells currently being POSTed — used for the pulsing indicator.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

  const periods = useMemo(() => defaultPeriods(DEFAULT_PERIOD_COUNT), []);

  const teacherCtx = useTeacherRestrictions();
  const subjectId = filters.subject_id || null;
  const isOverallMode = !subjectId;
  const futureBlocked = isFutureDate(filters.attendance_date);
  const teacherBlocked = teacherCtx.isTeacher && isOverallMode;
  const editingBlocked = futureBlocked || teacherBlocked;

  const saveMut = useSaveAttendance(
    filters.campus_id, filters.course_id, filters.batch_id,
    filters.attendance_date, subjectId,
  );

  // ── Derived: server truth indexed by (student, period) ────────
  const serverByCell = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const r of records) {
      map[`${r.student_id}|${r.period_number}`] = r.status;
    }
    return map;
  }, [records]);

  // The status the UI should display: pending edit > server > Unmarked.
  const statusFor = useCallback(
    (studentId: string, period: number): AttendanceStatus => {
      const k = `${studentId}|${period}`;
      return pending[k] ?? serverByCell[k] ?? "Unmarked";
    },
    [pending, serverByCell],
  );

  // Build a per-student period→status snapshot for the visible card.
  const snapshotFor = useCallback(
    (studentId: string): Record<number, AttendanceStatus> => {
      const out: Record<number, AttendanceStatus> = {};
      for (const p of periods) out[p.number] = statusFor(studentId, p.number);
      return out;
    },
    [periods, statusFor],
  );

  const pendingPeriodsFor = useCallback(
    (studentId: string): Set<number> => {
      const set = new Set<number>();
      for (const p of periods) {
        if (inFlight.has(`${studentId}|${p.number}`)) set.add(p.number);
      }
      return set;
    },
    [periods, inFlight],
  );

  // ── Page-wide stats (across every visible student × period cell) ─
  const stats = useMemo(() => {
    const out = { Present: 0, Absent: 0, Late: 0, Leave: 0, Unmarked: 0 };
    for (const s of students) {
      for (const p of periods) {
        out[statusFor(s.id, p.number)]++;
      }
    }
    return out;
  }, [students, periods, statusFor]);

  const totalCells = students.length * periods.length;

  // ── Debounced auto-save ────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentLookup = useMemo(
    () => new Map(students.map((s) => [s.id, s] as const)),
    [students],
  );

  const flush = useCallback(() => {
    timerRef.current = null;

    setPending((cur) => {
      if (Object.keys(cur).length === 0) return cur;
      if (editingBlocked) return cur;

      const teacherIdForRow = teacherCtx.isTeacher ? teacherCtx.teacher?.id ?? null : null;
      const rows: AttendanceUpsertRow[] = [];
      const keys: string[] = [];

      for (const [k, status] of Object.entries(cur)) {
        const [studentId, pStr] = k.split("|");
        const student = studentLookup.get(studentId);
        if (!student) continue;
        const period = Number(pStr);
        const periodMeta = periods.find((p) => p.number === period);

        rows.push({
          student_id: student.id,
          campus_id: student.campus_id || filters.campus_id || null,
          course_id: student.course_id || filters.course_id || null,
          batch_id: student.batch_id || filters.batch_id || null,
          subject_id: subjectId,
          teacher_id: teacherIdForRow,
          attendance_date: filters.attendance_date,
          period_number: period,
          period_label: periodMeta?.label ?? null,
          status,
          remarks: null,
        });
        keys.push(k);
      }

      if (rows.length === 0) return cur;

      setInFlight((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.add(k);
        return next;
      });

      saveMut.mutate(rows, {
        onSuccess: () => {
          setInFlight((prev) => {
            const next = new Set(prev);
            for (const k of keys) next.delete(k);
            return next;
          });
          setPending((p) => {
            const next = { ...p };
            for (const k of keys) {
              // Only drop if the user hasn't tapped this cell again since
              // the save started (would have a different status value).
              if (next[k] !== undefined && next[k] === cur[k]) delete next[k];
            }
            return next;
          });
        },
        onError: (err) => {
          setInFlight((prev) => {
            const next = new Set(prev);
            for (const k of keys) next.delete(k);
            return next;
          });
          onToast("error", err instanceof Error ? err.message : "Failed to save.");
          // Leave the pending entries so the user can retry by tapping again
          // or via the explicit Save button.
        },
      });

      // Return cur unchanged — entries cleared on save success above.
      return cur;
    });
  }, [
    editingBlocked, teacherCtx, periods, filters, subjectId, studentLookup,
    saveMut, onToast,
  ]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTO_SAVE_DELAY_MS);
  }, [flush]);

  // Flush any outstanding edits when the user leaves the page or switches
  // filters (which unmounts the grid via the parent's `key`).
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        flush();
      }
    };
  }, [flush]);

  // ── Edit handlers ─────────────────────────────────────────────
  const cycleCell = useCallback((studentId: string, period: number) => {
    if (editingBlocked) {
      if (futureBlocked) onToast("error", "Future attendance cannot be marked.");
      else if (teacherBlocked) onToast("error", "Teachers can't mark Overall — pick a subject.");
      return;
    }
    const k = `${studentId}|${period}`;
    const current = pending[k] ?? serverByCell[k] ?? "Unmarked";
    const next = cycleStatus(current);
    setPending((p) => ({ ...p, [k]: next }));
    scheduleFlush();
  }, [
    editingBlocked, futureBlocked, teacherBlocked, pending, serverByCell,
    scheduleFlush, onToast,
  ]);

  const markRow = useCallback((studentId: string, status: AttendanceStatus) => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const period of periods) {
        next[`${studentId}|${period.number}`] = status;
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, periods, scheduleFlush]);

  const resetRow = useCallback((studentId: string) => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const period of periods) {
        next[`${studentId}|${period.number}`] = "Unmarked";
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, periods, scheduleFlush]);

  const markAll = useCallback((status: AttendanceStatus) => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const s of students) {
        for (const period of periods) {
          next[`${s.id}|${period.number}`] = status;
        }
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, students, periods, scheduleFlush]);

  const resetAll = useCallback(() => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const s of students) {
        for (const period of periods) {
          next[`${s.id}|${period.number}`] = "Unmarked";
        }
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, students, periods, scheduleFlush]);

  const pendingCount = Object.keys(pending).length;

  // ── Search & filter ───────────────────────────────────────────
  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const inName = s.full_name.toLowerCase().includes(q);
        const inRoll = (s.roll_number ?? "").toLowerCase().includes(q);
        if (!inName && !inRoll) return false;
      }
      if (statusFilter !== "All") {
        // Match if ANY period in the row matches the filter status.
        let hit = false;
        for (const p of periods) {
          if (statusFor(s.id, p.number) === statusFilter) { hit = true; break; }
        }
        if (!hit) return false;
      }
      return true;
    });
  }, [students, search, statusFilter, periods, statusFor]);

  // ── Guards ────────────────────────────────────────────────────
  if (!filters.attendance_date) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="Pick attendance date"
        hint="The hourly attendance grid will appear once you've selected a date."
      />
    );
  }
  if (!filters.batch_id) {
    return (
      <EmptyState
        icon={<Users size={26} />}
        title="Pick a batch to start"
        hint="Select campus → course → batch and the students will load."
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="p-3">
        <ul className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-3 py-3.5 border border-slate-100 rounded-2xl animate-pulse"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-100 rounded w-44" />
                <div className="h-2.5 bg-slate-100 rounded w-24" />
              </div>
              <div className="flex gap-2">
                {Array(DEFAULT_PERIOD_COUNT).fill(0).map((_, j) => (
                  <div key={j} className="w-11 h-11 rounded-full bg-slate-100" />
                ))}
              </div>
            </li>
          ))}
        </ul>
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Mode + auto-save banner */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <BookMarked size={13} className={isOverallMode ? "text-slate-400" : "text-[#0B3C5D]"} />
          <span className="font-semibold text-slate-700">
            {isOverallMode ? "Overall attendance" : subjectName || "Subject attendance"}
          </span>
          <span className="text-slate-300">·</span>
          <CalendarPlus size={12} className="text-slate-400" />
          <span>{filters.attendance_date}</span>
          <span className="text-slate-300">·</span>
          <span>{DEFAULT_PERIOD_COUNT} periods</span>
        </div>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold">
          {editingBlocked ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <AlertTriangle size={12} />
              {futureBlocked
                ? "Future date — editing disabled"
                : "Teachers can't mark Overall — pick a subject"}
            </span>
          ) : saveMut.isPending || inFlight.size > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[#0B3C5D] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </span>
          ) : pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <Loader2 size={12} className="animate-pulse" />
              {pendingCount} pending
            </span>
          ) : (
            <span className="text-emerald-600">All changes saved</span>
          )}
        </div>
      </div>

      {/* Stat summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <StatCard label="Present" count={stats.Present} total={totalCells} status="Present" icon={<CheckCircle2 size={14} />} />
        <StatCard label="Absent"  count={stats.Absent}  total={totalCells} status="Absent"  icon={<XCircle size={14} />} />
        <StatCard label="Late"    count={stats.Late}    total={totalCells} status="Late"    icon={<Clock size={14} />} />
        <StatCard label="Leave"   count={stats.Leave}   total={totalCells} status="Leave"   icon={<CalendarPlus size={14} />} />
        <StatCard label="Unmarked" count={stats.Unmarked} total={totalCells} status="Unmarked" icon={<MinusCircle size={14} />} />
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
                {s}
                {s !== "All" && (
                  <span className="ml-1 opacity-60">{stats[s as AttendanceStatus]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <BulkButton tone="emerald" disabled={editingBlocked} onClick={() => markAll("Present")}>
              <CheckCircle2 size={13} /> All Present
            </BulkButton>
            <BulkButton tone="rose" disabled={editingBlocked} onClick={() => markAll("Absent")}>
              <XCircle size={13} /> All Absent
            </BulkButton>
            <BulkButton tone="slate" disabled={editingBlocked || pendingCount === 0 && totalCells === 0} onClick={resetAll}>
              <RotateCcw size={13} /> Reset all
            </BulkButton>
            <button
              type="button"
              onClick={flush}
              disabled={pendingCount === 0 || editingBlocked || saveMut.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-white
                         bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all
                         shadow-md shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {pendingCount > 0 ? `Save now (${pendingCount})` : "Saved"}
            </button>
          </div>
        </div>
      </Card>

      {/* Cards */}
      <ul className="space-y-2">
        {visibleStudents.length === 0 ? (
          <Card className="py-8 text-center text-sm text-slate-400">
            No students match the current filters.
          </Card>
        ) : (
          visibleStudents.map((s) => (
            <StudentPeriodCard
              key={s.id}
              student={s}
              periods={periods}
              statusByPeriod={snapshotFor(s.id)}
              pendingPeriods={pendingPeriodsFor(s.id)}
              disabled={editingBlocked}
              onCellTap={cycleCell}
              onMarkRow={markRow}
              onResetRow={resetRow}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function StatCard({
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
    <Card className="p-2.5 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg ${cfg.bg} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="text-base font-black text-slate-800 leading-tight tabular-nums">
          {count}
        </p>
      </div>
      <span className="text-[11px] font-bold text-slate-500 tabular-nums">
        {pct}%
      </span>
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
