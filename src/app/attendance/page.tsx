"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck, Search, Users, CheckCircle2, XCircle, Clock,
  MinusCircle, Loader2, Save, RefreshCw, RotateCcw,
} from "lucide-react";
import { academicRepository } from "@/lib/repositories/academic_repository";
import { studentRepository } from "@/lib/repositories/student_repository";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────
type AttendanceStatus = "Present" | "Absent" | "Late" | "Unmarked";
type AttendanceMap = Record<string, AttendanceStatus>;

const STATUS_CYCLE: AttendanceStatus[] = ["Unmarked", "Present", "Absent", "Late"];

function nextStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

const STATUS_CFG: Record<AttendanceStatus, {
  circle: string; ring: string; label: string; row: string; badge: string; icon: React.ReactNode;
}> = {
  Present: {
    circle: "bg-[#0B3C5D]",
    ring:   "ring-blue-200",
    label:  "text-[#0B3C5D]",
    row:    "bg-blue-50/40",
    badge:  "bg-blue-50 text-[#0B3C5D] border-blue-100",
    icon:   <CheckCircle2 size={14} />,
  },
  Absent: {
    circle: "bg-rose-500",
    ring:   "ring-rose-200",
    label:  "text-rose-600",
    row:    "bg-rose-50/40",
    badge:  "bg-rose-50 text-rose-600 border-rose-100",
    icon:   <XCircle size={14} />,
  },
  Late: {
    circle: "bg-amber-400",
    ring:   "ring-amber-200",
    label:  "text-amber-600",
    row:    "bg-amber-50/40",
    badge:  "bg-amber-50 text-amber-600 border-amber-100",
    icon:   <Clock size={14} />,
  },
  Unmarked: {
    circle: "bg-slate-300",
    ring:   "ring-slate-200",
    label:  "text-slate-400",
    row:    "",
    badge:  "bg-slate-50 text-slate-400 border-slate-100",
    icon:   <MinusCircle size={14} />,
  },
};

// ── Status Circle ─────────────────────────────────────────────────
const StatusCircle = React.memo(function StatusCircle({
  status,
  onToggle,
}: {
  status: AttendanceStatus;
  onToggle: () => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <button
      onClick={onToggle}
      title={`${status} — click to change`}
      className={`w-9 h-9 rounded-full shrink-0 ${cfg.circle} ring-4 ${cfg.ring}
        transition-all duration-150 hover:scale-110 active:scale-90 focus:outline-none`}
    />
  );
});

// ── Summary Card ──────────────────────────────────────────────────
function SummaryCard({
  label, count, total, color, icon,
}: {
  label: string; count: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{count}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-500">{pct}%</p>
        <div className="w-14 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Attendance Row ────────────────────────────────────────────────
const AttendanceRow = React.memo(function AttendanceRow({
  student,
  status,
  onToggle,
}: {
  student: any;
  status: AttendanceStatus;
  onToggle: () => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <tr className={`border-b border-slate-100 transition-colors ${cfg.row} hover:brightness-95`}>
      {/* Student info */}
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              status === "Unmarked"
                ? "bg-slate-100 text-slate-500"
                : `${cfg.circle} text-white`
            }`}
          >
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{student.full_name}</p>
            <p className="text-[11px] font-mono text-slate-400">{student.roll_number || student.admission_number || "—"}</p>
          </div>
        </div>
      </td>

      {/* Status badge */}
      <td className="py-3.5 px-5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cfg.badge}`}
        >
          {cfg.icon}
          {status}
        </span>
      </td>

      {/* Status circle (clickable) */}
      <td className="py-3.5 px-5">
        <div className="flex justify-end">
          <StatusCircle status={status} onToggle={onToggle} />
        </div>
      </td>
    </tr>
  );
});

// ── Mobile Card ───────────────────────────────────────────────────
const MobileCard = React.memo(function MobileCard({
  student,
  status,
  onToggle,
}: {
  student: any;
  status: AttendanceStatus;
  onToggle: () => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        status === "Unmarked" ? "border-slate-100 bg-white" : `border-transparent ${cfg.row}`
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
          status === "Unmarked" ? "bg-slate-100 text-slate-500" : `${cfg.circle} text-white`
        }`}
      >
        {student.full_name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{student.full_name}</p>
        <p className="text-[11px] font-mono text-slate-400">{student.roll_number || "—"}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold ${cfg.label}`}>{status}</span>
        <StatusCircle status={status} onToggle={onToggle} />
      </div>
    </div>
  );
});

// ── Toast ─────────────────────────────────────────────────────────
type Toast = { id: number; type: "success" | "error"; message: string };

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto
            ${t.type === "success"
              ? "bg-white border-emerald-200 text-emerald-800"
              : "bg-white border-rose-200 text-rose-800"
            }`}
        >
          {t.type === "success"
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : <XCircle size={16} className="text-rose-500 shrink-0" />
          }
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-40 hover:opacity-80">×</button>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function AttendancePage() {
  const qc = useQueryClient();
  const toastId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "All">("All");
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [hasChanges, setHasChanges] = useState(false);

  // ── Toast helpers
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Load courses
  useEffect(() => {
    supabase.from("courses").select("id, name").order("name")
      .then(({ data }) => setCourses(data ?? []));
  }, []);

  // ── Load batches when course changes
  useEffect(() => {
    if (!selectedCourse) { setBatches([]); setSelectedBatch(""); return; }
    supabase.from("batches").select("id, name").eq("course_id", selectedCourse).order("name")
      .then(({ data }) => setBatches(data ?? []));
    setSelectedBatch("");
  }, [selectedCourse]);

  // ── Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["students-batch", selectedBatch],
    queryFn: () => studentRepository.getStudentsByBatch(selectedBatch),
    enabled: !!selectedBatch,
    staleTime: 60_000,
  });

  // ── Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance", selectedBatch, selectedDate],
    queryFn: () => academicRepository.getAttendance(selectedBatch, selectedDate),
    enabled: !!selectedBatch && !!selectedDate,
    staleTime: 10_000,
  });

  // ── Sync attendance map when data loads or batch/date changes
  useEffect(() => {
    if (!students.length) return;
    const map: AttendanceMap = {};
    students.forEach((s: any) => {
      const rec = (attendanceRecords as any[]).find((r) => r.student_id === s.id);
      map[s.id] = (rec?.status as AttendanceStatus) ?? "Unmarked";
    });
    setAttendanceMap(map);
    setHasChanges(false);
  }, [students, attendanceRecords]);

  // ── Save mutation
  const saveMutation = useMutation({
    mutationFn: (records: any[]) => academicRepository.updateAttendance(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", selectedBatch, selectedDate] });
      addToast("success", "Attendance saved successfully.");
      setHasChanges(false);
    },
    onError: (err: any) => {
      addToast("error", err.message ?? "Failed to save attendance.");
    },
  });

  // ── Toggle status (optimistic)
  const handleToggle = useCallback((studentId: string) => {
    setAttendanceMap((prev) => {
      const current = prev[studentId] ?? "Unmarked";
      return { ...prev, [studentId]: nextStatus(current) };
    });
    setHasChanges(true);
  }, []);

  // ── Bulk actions
  const markAllPresent = useCallback(() => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((s: any) => { next[s.id] = "Present"; });
      return next;
    });
    setHasChanges(true);
  }, [students]);

  const resetAll = useCallback(() => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((s: any) => { next[s.id] = "Unmarked"; });
      return next;
    });
    setHasChanges(true);
  }, [students]);

  // ── Save handler
  const handleSave = () => {
    const records = students.map((s: any) => ({
      student_id: s.id,
      batch_id: selectedBatch,
      attendance_date: selectedDate,
      status: attendanceMap[s.id] ?? "Unmarked",
    }));
    saveMutation.mutate(records);
  };

  // ── Derived stats
  const stats = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Late: 0, Unmarked: 0 };
    Object.values(attendanceMap).forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; });
    return counts;
  }, [attendanceMap]);

  // ── Filtered students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter((s: any) => {
      const matchSearch =
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" || attendanceMap[s.id] === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, searchQuery, statusFilter, attendanceMap]);

  const loading = studentsLoading || attendanceLoading;
  const total = students.length;

  // ── Render
  return (
    <>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3C5D] tracking-tight">Attendance</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {selectedBatch
                ? loading
                  ? "Loading…"
                  : `${total} students · ${selectedDate}`
                : "Select a course and batch to begin"}
            </p>
          </div>

          {selectedBatch && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={markAllPresent}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#0B3C5D] bg-blue-50
                           border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <CheckCircle2 size={15} />
                Mark All Present
              </button>
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 bg-slate-100
                           border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <RotateCcw size={15} />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#0B3C5D]
                           rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20
                           disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {saveMutation.isPending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Save size={15} />
                }
                {hasChanges ? "Save Changes" : "Saved"}
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Course */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none
                           focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
              >
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Batch */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none
                           focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedCourse ? "Select batch" : "Select course first"}</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none
                           focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
              />
            </div>

            {/* Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name or roll number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none
                             focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status filter pills */}
          {selectedBatch && !loading && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {(["All", "Present", "Absent", "Late", "Unmarked"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    statusFilter === s
                      ? "bg-[#0B3C5D] text-white border-[#0B3C5D]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s}
                  {s !== "All" && (
                    <span className="ml-1 opacity-70">
                      {s === "Present" ? stats.Present
                        : s === "Absent" ? stats.Absent
                        : s === "Late" ? stats.Late
                        : stats.Unmarked}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary cards */}
        {selectedBatch && !loading && total > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Present"
              count={stats.Present}
              total={total}
              color="bg-[#0B3C5D]"
              icon={<CheckCircle2 size={18} className="text-white" />}
            />
            <SummaryCard
              label="Absent"
              count={stats.Absent}
              total={total}
              color="bg-rose-500"
              icon={<XCircle size={18} className="text-white" />}
            />
            <SummaryCard
              label="Late"
              count={stats.Late}
              total={total}
              color="bg-amber-400"
              icon={<Clock size={18} className="text-white" />}
            />
            <SummaryCard
              label="Unmarked"
              count={stats.Unmarked}
              total={total}
              color="bg-slate-300"
              icon={<MinusCircle size={18} className="text-white" />}
            />
          </div>
        )}

        {/* Main content */}
        {!selectedBatch ? (
          // Empty state
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <CalendarCheck size={26} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Select a course and batch to start marking attendance.</p>
          </div>
        ) : loading ? (
          // Loading skeleton
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-40" />
                  <div className="h-2.5 bg-slate-100 rounded w-24" />
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          // No results
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              {searchQuery || statusFilter !== "All" ? "No students match your filters." : "No students in this batch."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {filteredStudents.length} of {total} students
                </p>
                {hasChanges && (
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Student</th>
                      <th className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                      <th className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">
                        Toggle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student: any) => (
                      <AttendanceRow
                        key={student.id}
                        student={student}
                        status={attendanceMap[student.id] ?? "Unmarked"}
                        onToggle={() => handleToggle(student.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {filteredStudents.length} students
                </p>
                {hasChanges && (
                  <span className="text-[11px] font-bold text-amber-600">Unsaved changes</span>
                )}
              </div>
              {filteredStudents.map((student: any) => (
                <MobileCard
                  key={student.id}
                  student={student}
                  status={attendanceMap[student.id] ?? "Unmarked"}
                  onToggle={() => handleToggle(student.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
