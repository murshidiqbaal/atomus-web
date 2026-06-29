"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, RotateCcw, CheckCircle2, XCircle, Clock, Calendar, MinusCircle,
  Loader2, Users, BookMarked, AlertTriangle, CalendarPlus, Keyboard
} from "lucide-react";
import type {
  AttendanceFilters, AttendanceRecord, AttendanceStatus,
  AttendanceUpsertRow, StudentLite,
} from "../types";
import {
  cycleStatus, isFutureDate,
} from "../types";
import { useSaveAttendance, useTeacherRestrictions } from "../hooks";
import { StudentAttendanceCard } from "./StudentAttendanceCard";
import { Card, EmptyState, fieldCls, STATUS_CFG } from "./ui";

const FILTER_STATUSES = ["All", "Present", "Absent", "Late", "Unmarked"] as const;
type StatusFilter = (typeof FILTER_STATUSES)[number];

const AUTO_SAVE_DELAY_MS = 1000;

interface Props {
  filters: AttendanceFilters;
  students: StudentLite[];
  records: AttendanceRecord[];
  subjects: { id: string; name: string }[];
  isLoading: boolean;
  subjectName?: string;
  onToast: (type: "success" | "error", msg: string) => void;
}

type Pending = Record<string, AttendanceStatus>; // studentId → status

export function AttendanceGrid({
  filters, students, records, subjects, isLoading, subjectName, onToast,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Dirty cells waiting for the debounced flush. Cleared on successful save.
  const [pending, setPending] = useState<Pending>({});
  // Cells currently being POSTed — used for status indications.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

  const teacherCtx = useTeacherRestrictions();
  const subjectId = filters.subject_id || null;
  const isOverallMode = !subjectId;
  const futureBlocked = isFutureDate(filters.attendance_date);
  const teacherBlocked = teacherCtx.isTeacher && isOverallMode;
  const editingBlocked = futureBlocked || teacherBlocked;

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const saveMut = useSaveAttendance(
    filters.campus_id, filters.course_id, filters.batch_id || undefined,
    filters.attendance_date, null,
    studentIds,
  );

  // ── Derived: server truth indexed by student_id ────────
  const serverByStudent = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const r of records) {
      if (r.subject_id === subjectId) {
        map[r.student_id] = r.status;
      }
    }
    return map;
  }, [records, subjectId]);

  const markerByStudent = useMemo(() => {
    const map: Record<string, { role: "Teacher" | "Admin" | "System" | null; name: string | null }> = {};
    for (const r of records) {
      if (r.subject_id === subjectId) {
        map[r.student_id] = {
          role: r.attendance_marker_role ?? null,
          name: r.attendance_marker_name ?? null,
        };
      }
    }
    return map;
  }, [records, subjectId]);

  // Track which students have attendance submitted in other subjects on the same day
  const lockedByStudent = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of records) {
      if (r.subject_id !== subjectId) {
        const otherSubName = r.subject_id
          ? subjects.find((sub) => sub.id === r.subject_id)?.name ?? "Other Subject"
          : "Overall Attendance";
        map[r.student_id] = otherSubName;
      }
    }
    return map;
  }, [records, subjectId, subjects]);

  // The status the UI should display: pending edit > server > Unmarked.
  const statusFor = useCallback(
    (studentId: string): AttendanceStatus => {
      return pending[studentId] ?? serverByStudent[studentId] ?? "Unmarked";
    },
    [pending, serverByStudent],
  );

  // ── Page-wide stats ───────────────────────────────────────────
  const stats = useMemo(() => {
    const out = { Present: 0, Absent: 0, Late: 0, Leave: 0, Unmarked: 0 };
    for (const s of students) {
      out[statusFor(s.id)]++;
    }
    return out;
  }, [students, statusFor]);

  const totalCells = students.length;

  // ── Debounced auto-save ────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentLookup = useMemo(
    () => new Map(students.map((s) => [s.id, s] as const)),
    [students],
  );

  // Keep a ref of pending state so flush() can read the latest edits 
  // without triggering timer-resetting rebuilds, avoiding side-effects inside state setters.
  const pendingRef = useRef<Pending>({});
  pendingRef.current = pending;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const cur = pendingRef.current;
    if (Object.keys(cur).length === 0) return;
    if (editingBlocked) return;

    const teacherIdForRow = teacherCtx.isTeacher ? teacherCtx.teacher?.id ?? null : null;
    const rows: AttendanceUpsertRow[] = [];
    const keys: string[] = [];

    for (const [studentId, status] of Object.entries(cur)) {
      const student = studentLookup.get(studentId);
      if (!student) continue;

      rows.push({
        student_id: student.id,
        campus_id: student.campus_id || filters.campus_id || null,
        course_id: student.course_id || filters.course_id || null,
        batch_id: student.batch_id || filters.batch_id || null,
        subject_id: subjectId,
        teacher_id: teacherIdForRow,
        attendance_date: filters.attendance_date,
        status,
        remarks: null,
      });
      keys.push(studentId);
    }

    if (rows.length === 0) return;

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
      },
    });
  }, [
    editingBlocked, teacherCtx, filters, subjectId, studentLookup,
    saveMut, onToast,
  ]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTO_SAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        flush();
      }
    };
  }, [flush]);

  // ── Edit handlers ─────────────────────────────────────────────
  const updateStudentStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    if (editingBlocked) {
      if (futureBlocked) onToast("error", "Future attendance cannot be marked.");
      else if (teacherBlocked) onToast("error", "Teachers can't mark Overall — pick a subject.");
      return;
    }
    if (lockedByStudent[studentId]) {
      onToast("error", `Locked: Already marked in ${lockedByStudent[studentId]}`);
      return;
    }
    setPending((p) => ({ ...p, [studentId]: status }));
    scheduleFlush();
  }, [editingBlocked, futureBlocked, teacherBlocked, lockedByStudent, scheduleFlush, onToast]);

  const markAll = useCallback((status: AttendanceStatus) => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const s of students) {
        if (lockedByStudent[s.id]) continue;
        next[s.id] = status;
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, students, lockedByStudent, scheduleFlush]);

  const resetAll = useCallback(() => {
    if (editingBlocked) return;
    setPending((p) => {
      const next = { ...p };
      for (const s of students) {
        if (lockedByStudent[s.id]) continue;
        next[s.id] = "Unmarked";
      }
      return next;
    });
    scheduleFlush();
  }, [editingBlocked, students, lockedByStudent, scheduleFlush]);

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
        if (statusFor(s.id) !== statusFilter) return false;
      }
      return true;
    });
  }, [students, search, statusFilter, statusFor]);

  // ── Keyboard Navigation ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT"
      ) {
        return;
      }

      const count = visibleStudents.length;
      if (count === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < count - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else {
        const key = e.key.toLowerCase();
        const statusMap: Record<string, AttendanceStatus> = {
          p: "Present",
          a: "Absent",
          l: "Late",
          u: "Unmarked",
        };
        const targetStatus = statusMap[key];
        if (targetStatus) {
          e.preventDefault();
          const currIdx = focusedIndex >= 0 ? focusedIndex : 0;
          if (currIdx < count) {
            const s = visibleStudents[currIdx];
            updateStudentStatus(s.id, targetStatus);
            // Auto advance
            if (currIdx < count - 1) {
              setFocusedIndex(currIdx + 1);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleStudents, focusedIndex, updateStudentStatus]);

  // Reset focus when filters or search change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [search, statusFilter]);

  // ── Guards ────────────────────────────────────────────────────
  if (!filters.attendance_date) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="Pick attendance date"
        hint="The daily attendance register will load once the date is confirmed."
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <ul className="space-y-3">
          {Array(6).fill(0).map((_, i) => (
            <li
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 rounded-2xl animate-pulse bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-100 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              </div>
              <div className="w-48 h-8 rounded-xl bg-slate-100" />
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
        hint="Ensure students are enrolled in the selected course and campus, and check optional batch filters."
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24">
      {/* Save indicators & Keyboard guide */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <BookMarked size={13} className={isOverallMode ? "text-slate-400" : "text-[#0B3C5D]"} />
          <span className="font-extrabold text-slate-700">
            {isOverallMode ? "Overall Attendance" : subjectName || "Subject Session"}
          </span>
          <span className="text-slate-300">·</span>
          <CalendarPlus size={13} className="text-slate-400" />
          <span>{filters.attendance_date}</span>
        </div>
        
        {/* Keyboard shortcut legend */}
        <div className="hidden lg:inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[10px] text-slate-500">
          <Keyboard size={12} className="text-slate-400" />
          <span>Quick keys: <kbd className="bg-white border px-1 rounded shadow-sm text-slate-800">↑</kbd> <kbd className="bg-white border px-1 rounded shadow-sm text-slate-800">↓</kbd> to navigate · <kbd className="bg-white border px-1.5 rounded shadow-sm text-slate-800 font-bold">P</kbd>resent · <kbd className="bg-white border px-1.5 rounded shadow-sm text-slate-800 font-bold">A</kbd>bsent · <kbd className="bg-white border px-1.5 rounded shadow-sm text-slate-800 font-bold">L</kbd>ate</span>
        </div>

        <div className="inline-flex items-center gap-2 text-[11px] font-bold">
          {editingBlocked ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <AlertTriangle size={12} />
              {futureBlocked
                ? "Future date — editing disabled"
                : "Teachers can't mark Overall — pick a subject"}
            </span>
          ) : saveMut.isPending || inFlight.size > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[#0B3C5D] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
              <Loader2 size={12} className="animate-spin" />
              Saving batches…
            </span>
          ) : pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <Loader2 size={12} className="animate-pulse" />
              {pendingCount} pending updates
            </span>
          ) : (
            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">All changes synced</span>
          )}
        </div>
      </div>

      {/* Stat summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Present" count={stats.Present} total={totalCells} status="Present" icon={<CheckCircle2 size={15} />} />
        <StatCard label="Absent"  count={stats.Absent}  total={totalCells} status="Absent"  icon={<XCircle size={15} />} />
        <StatCard label="Late"    count={stats.Late}    total={totalCells} status="Late"    icon={<Clock size={15} />} />
        <StatCard label="Unmarked" count={stats.Unmarked} total={totalCells} status="Unmarked" icon={<MinusCircle size={15} />} />
      </div>

      {/* Toolbar / Actions */}
      <Card className="p-3 border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name or roll…"
              className={`${fieldCls} pl-9 border-slate-200`}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap border border-slate-200/50">
            {FILTER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors
                  ${statusFilter === s
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"}`}
              >
                {s}
                {s !== "All" && (
                  <span className="ml-1 opacity-60 font-mono font-bold">{stats[s as AttendanceStatus]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <BulkButton tone="emerald" disabled={editingBlocked} onClick={() => markAll("Present")}>
              <CheckCircle2 size={13} /> Present All
            </BulkButton>
            <BulkButton tone="rose" disabled={editingBlocked} onClick={() => markAll("Absent")}>
              <XCircle size={13} /> Absent All
            </BulkButton>
            <BulkButton tone="slate" disabled={editingBlocked || (pendingCount === 0 && totalCells === 0)} onClick={resetAll}>
              <RotateCcw size={13} /> Reset All
            </BulkButton>
            <button
              type="button"
              onClick={flush}
              disabled={pendingCount === 0 || editingBlocked || saveMut.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white
                         bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all
                         shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {pendingCount > 0 ? `Save Now (${pendingCount})` : "Saved"}
            </button>
          </div>
        </div>
      </Card>

      {/* Student list */}
      <div className="space-y-2">
        {visibleStudents.length === 0 ? (
          <Card className="py-12 text-center text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200">
            No students match the selected filters.
          </Card>
        ) : (
          visibleStudents.map((s, idx) => (
            <StudentAttendanceCard
              key={s.id}
              student={s}
              status={statusFor(s.id)}
              isFocused={focusedIndex === idx}
              disabled={editingBlocked || !!lockedByStudent[s.id]}
              lockedBySubjectName={lockedByStudent[s.id]}
              markerRole={markerByStudent[s.id]?.role}
              markerName={markerByStudent[s.id]?.name}
              onStatusChange={updateStudentStatus}
            />
          ))
        )}
      </div>

      {/* Sticky mobile floating save bar */}
      {pendingCount > 0 && !editingBlocked && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-4 ring-4 ring-emerald-500/10 shadow-emerald-500/15">
            <div className="flex items-center gap-2.5 pl-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-200">
                  {pendingCount} unsaved updates
                </p>
                <p className="text-[10px] text-slate-400">
                  Autosaves in a moment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  flush();
                }}
                disabled={saveMut.isPending}
                className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
              >
                {saveMut.isPending ? "Saving…" : "Save Now"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <Card className="p-3 flex items-center justify-between gap-2 border-slate-200 shadow-sm transition-all duration-200 hover:shadow">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl ${cfg.bg} text-white flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="text-base font-black text-slate-800 leading-tight tabular-nums mt-0.5">
            {count}
          </p>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-lg shrink-0 tabular-nums">
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
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200/60 hover:bg-emerald-100",
    rose: "text-rose-700 bg-rose-50 border-rose-200/60 hover:bg-rose-100",
    slate: "text-slate-600 bg-slate-50 border-slate-200/60 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
