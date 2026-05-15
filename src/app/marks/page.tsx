"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet, Plus, Save, Trophy, AlertCircle,
  CheckCircle2, XCircle, Loader2, Search, X,
  RotateCcw, ArrowUp, ArrowDown, BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { academicRepository } from "@/lib/repositories/academic_repository";
import { studentRepository } from "@/lib/repositories/student_repository";

// ── Grade logic ──────────────────────────────────────────────────
type Grade = "Excellent" | "Good" | "Average" | "Needs Improvement";
type MarkEntry = { marks_obtained: number; total_marks: number; remarks: string; id?: string };
type MarksMap = Record<string, MarkEntry>;

function getGrade(pct: number): Grade {
  if (pct >= 90) return "Excellent";
  if (pct >= 75) return "Good";
  if (pct >= 50) return "Average";
  return "Needs Improvement";
}

const GRADE_CFG: Record<Grade, { badge: string; bar: string }> = {
  "Excellent":          { badge: "bg-emerald-50 text-emerald-700 border border-emerald-100", bar: "bg-emerald-500" },
  "Good":               { badge: "bg-blue-50 text-[#0B3C5D] border border-blue-100",         bar: "bg-[#0B3C5D]"  },
  "Average":            { badge: "bg-amber-50 text-amber-600 border border-amber-100",        bar: "bg-amber-400"  },
  "Needs Improvement":  { badge: "bg-rose-50 text-rose-600 border border-rose-100",           bar: "bg-rose-500"   },
};

function calcPct(entry: MarkEntry) {
  return entry.total_marks > 0 ? (entry.marks_obtained / entry.total_marks) * 100 : 0;
}

// ── Toast ────────────────────────────────────────────────────────
type Toast = { id: number; type: "success" | "error"; message: string };

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto
            ${t.type === "success" ? "bg-white border-emerald-200 text-emerald-800" : "bg-white border-rose-200 text-rose-800"}`}
        >
          {t.type === "success"
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : <XCircle size={16} className="text-rose-500 shrink-0" />}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-40 hover:opacity-80">×</button>
        </div>
      ))}
    </div>
  );
}

// ── Marks Row (memoized) ─────────────────────────────────────────
const MarksRow = React.memo(function MarksRow({
  student, entry, defaultTotal, onChange, onRemarksChange,
}: {
  student: any;
  entry: MarkEntry;
  defaultTotal: number;
  onChange: (studentId: string, val: number) => void;
  onRemarksChange: (studentId: string, val: string) => void;
}) {
  const pct = calcPct(entry);
  const grade = getGrade(pct);
  const cfg = GRADE_CFG[grade];
  const total = entry.total_marks || defaultTotal;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] text-xs font-bold flex items-center justify-center shrink-0">
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{student.full_name}</p>
            <p className="text-[11px] font-mono text-slate-400">{student.roll_number || "—"}</p>
          </div>
        </div>
      </td>

      <td className="py-3 px-5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={total}
            value={entry.marks_obtained || ""}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Math.min(Math.max(0, Number(e.target.value)), total);
              onChange(student.id, v);
            }}
            onFocus={(e) => e.target.select()}
            className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#0B3C5D]
                       outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-center"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap">/ {total}</span>
        </div>
      </td>

      <td className="py-3 px-5">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${cfg.bar} rounded-full transition-all`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums w-10">{pct.toFixed(1)}%</span>
        </div>
      </td>

      <td className="py-3 px-5">
        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}>
          {grade}
        </span>
      </td>

      <td className="py-3 px-5">
        <input
          type="text"
          placeholder="Add remark…"
          value={entry.remarks}
          onChange={(e) => onRemarksChange(student.id, e.target.value)}
          className="w-full text-sm text-slate-600 bg-transparent border-b border-transparent
                     hover:border-slate-200 focus:border-[#0B3C5D] focus:outline-none transition-all py-1 min-w-[120px]"
        />
      </td>
    </tr>
  );
});

// ── Mobile Card (memoized) ────────────────────────────────────────
const MobileCard = React.memo(function MobileCard({
  student, entry, defaultTotal, onChange, onRemarksChange,
}: {
  student: any;
  entry: MarkEntry;
  defaultTotal: number;
  onChange: (studentId: string, val: number) => void;
  onRemarksChange: (studentId: string, val: string) => void;
}) {
  const pct = calcPct(entry);
  const grade = getGrade(pct);
  const cfg = GRADE_CFG[grade];
  const total = entry.total_marks || defaultTotal;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] text-xs font-bold flex items-center justify-center">
            {student.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{student.full_name}</p>
            <p className="text-[10px] font-mono text-slate-400">{student.roll_number || "—"}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badge}`}>{grade}</span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={total}
          value={entry.marks_obtained || ""}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Math.min(Math.max(0, Number(e.target.value)), total);
            onChange(student.id, v);
          }}
          onFocus={(e) => e.target.select()}
          className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold
                     text-[#0B3C5D] outline-none focus:border-[#0B3C5D] transition-all text-center"
        />
        <span className="text-xs text-slate-400">/ {total}</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-600 tabular-nums">{pct.toFixed(1)}%</span>
        </div>
      </div>

      <input
        type="text"
        placeholder="Remark (optional)…"
        value={entry.remarks}
        onChange={(e) => onRemarksChange(student.id, e.target.value)}
        className="w-full text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5
                   outline-none focus:border-[#0B3C5D] transition-all"
      />
    </div>
  );
});

// ── Add Exam Modal ────────────────────────────────────────────────
function AddExamModal({
  isOpen, onClose, defaultCourse, defaultBatch, courses, onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse: string;
  defaultBatch: string;
  courses: { id: string; name: string }[];
  onCreated: (exam: any) => void;
}) {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState(defaultCourse);
  const [batchId, setBatchId] = useState(defaultBatch);
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCourseId(defaultCourse);
      setBatchId(defaultBatch);
      setName("");
      setError("");
    }
  }, [isOpen, defaultCourse, defaultBatch]);

  useEffect(() => {
    if (!courseId) { setBatches([]); return; }
    supabase.from("batches").select("id, name").eq("course_id", courseId).order("name")
      .then(({ data }) => setBatches(data ?? []));
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !courseId || !batchId || !examDate) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const exam = await academicRepository.createExam({
        name: name.trim(),
        course_id: courseId,
        batch_id: batchId,
        exam_date: examDate,
        total_marks: totalMarks,
      });
      onCreated(exam);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to create exam.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inp = "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Create Exam</h2>
            <p className="text-xs text-slate-400 mt-0.5">Add a new exam to start entering marks.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Exam Name</label>
              <input
                type="text"
                placeholder="e.g. Mid-Term Mathematics 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setBatchId(""); }}
                  className={inp}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  disabled={!courseId}
                  className={`${inp} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">{courseId ? "Select batch" : "Select course first"}</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Exam Date</label>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Marks</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value)))}
                  className={inp}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-lg
                         hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20 disabled:opacity-60
                         disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function MarksPage() {
  const qc = useQueryClient();
  const toastId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [marksMap, setMarksMap] = useState<MarksMap>({});

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Queries ──────────────────────────────────────────────────────
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["batches", selectedCourse],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("id, name")
        .eq("course_id", selectedCourse).order("name");
      return data ?? [];
    },
    enabled: !!selectedCourse,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => academicRepository.getSubjects(),
    staleTime: Infinity,
  });

  const { data: exams = [], refetch: refetchExams } = useQuery({
    queryKey: ["exams", selectedCourse, selectedBatch],
    queryFn: () => academicRepository.getExams(selectedCourse, selectedBatch),
    enabled: !!selectedCourse && !!selectedBatch,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["students-batch", selectedBatch],
    queryFn: () => studentRepository.getStudentsByBatch(selectedBatch),
    enabled: !!selectedBatch,
    staleTime: 60_000,
  });

  const { data: marksData = [], isLoading: marksLoading } = useQuery({
    queryKey: ["marks", selectedExam],
    queryFn: () => academicRepository.getMarks(selectedExam),
    enabled: !!selectedExam,
    staleTime: 10_000,
  });

  const selectedExamObj = useMemo(
    () => (exams as any[]).find((e) => e.id === selectedExam) ?? null,
    [exams, selectedExam]
  );
  const defaultTotal: number = selectedExamObj?.total_marks ?? 100;

  // ── Sync marks map when query data changes ────────────────────────
  useEffect(() => {
    if (!(students as any[]).length) return;
    const map: MarksMap = {};
    (students as any[]).forEach((s) => {
      const existing = (marksData as any[]).find(
        (m) => m.student_id === s.id &&
          (!selectedSubject || m.subject_id === selectedSubject)
      );
      map[s.id] = {
        marks_obtained: existing?.marks_obtained ?? 0,
        total_marks: existing?.total_marks ?? defaultTotal,
        remarks: existing?.remarks ?? "",
        id: existing?.id,
      };
    });
    setMarksMap(map);
    setHasChanges(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, marksData, selectedExam, selectedSubject]);

  // ── Save mutation ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (records: any[]) => academicRepository.updateMarks(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marks", selectedExam] });
      addToast("success", "Marks saved successfully.");
      setHasChanges(false);
    },
    onError: (err: any) => {
      addToast("error", err.message ?? "Failed to save marks.");
    },
  });

  // ── Stable handlers ──────────────────────────────────────────────
  const handleMarksChange = useCallback((studentId: string, val: number) => {
    setMarksMap((prev) => ({ ...prev, [studentId]: { ...prev[studentId], marks_obtained: val } }));
    setHasChanges(true);
  }, []);

  const handleRemarksChange = useCallback((studentId: string, val: string) => {
    setMarksMap((prev) => ({ ...prev, [studentId]: { ...prev[studentId], remarks: val } }));
    setHasChanges(true);
  }, []);

  const handleSave = () => {
    const records = (students as any[]).map((s) => {
      const entry = marksMap[s.id];
      return {
        ...(entry?.id ? { id: entry.id } : {}),
        exam_id: selectedExam,
        student_id: s.id,
        subject_id: selectedSubject || null,
        marks_obtained: entry?.marks_obtained ?? 0,
        total_marks: entry?.total_marks ?? defaultTotal,
        remarks: entry?.remarks ?? "",
      };
    });
    saveMutation.mutate(records);
  };

  const handleResetAll = () => {
    setMarksMap((prev) => {
      const next = { ...prev };
      (students as any[]).forEach((s) => {
        next[s.id] = { ...next[s.id], marks_obtained: 0, remarks: "" };
      });
      return next;
    });
    setHasChanges(true);
  };

  const handleExamCreated = useCallback(
    (exam: any) => {
      refetchExams();
      setSelectedExam(exam.id);
      addToast("success", `Exam "${exam.name}" created.`);
    },
    [refetchExams, addToast]
  );

  const handleCourseChange = (id: string) => {
    setSelectedCourse(id);
    setSelectedBatch("");
    setSelectedExam("");
  };

  const handleBatchChange = (id: string) => {
    setSelectedBatch(id);
    setSelectedExam("");
  };

  // ── Analytics ────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const entries = (students as any[]).map((s) => marksMap[s.id]).filter(Boolean);
    if (!entries.length) return null;
    const pcts = entries.map(calcPct);
    const highest = Math.max(...pcts);
    const lowest = Math.min(...pcts);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const passCount = pcts.filter((p) => p >= 50).length;
    return {
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      avg: avg.toFixed(1),
      passRate: ((passCount / entries.length) * 100).toFixed(1),
      dist: {
        Excellent:          pcts.filter((p) => p >= 90).length,
        Good:               pcts.filter((p) => p >= 75 && p < 90).length,
        Average:            pcts.filter((p) => p >= 50 && p < 75).length,
        "Needs Improvement": pcts.filter((p) => p < 50).length,
      },
    };
  }, [students, marksMap]);

  // ── Search ───────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students as any[];
    const q = searchQuery.toLowerCase();
    return (students as any[]).filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const loading = studentsLoading || marksLoading;
  const canEnter = !!selectedExam;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />

      <AddExamModal
        isOpen={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        defaultCourse={selectedCourse}
        defaultBatch={selectedBatch}
        courses={courses as any[]}
        onCreated={handleExamCreated}
      />

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3C5D] tracking-tight">Marks</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {selectedExamObj
                ? `${selectedExamObj.name} · ${filteredStudents.length} students`
                : "Select course, batch and exam to enter marks"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExamModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#D4AF37]
                         bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl hover:bg-[#D4AF37]/20 transition-colors"
            >
              <Plus size={15} />
              New Exam
            </button>

            {canEnter && (
              <>
                <button
                  onClick={handleResetAll}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600
                             bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
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
                    : <Save size={15} />}
                  {hasChanges ? "Save All" : "Saved"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
              >
                <option value="">Select course</option>
                {(courses as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => handleBatchChange(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all disabled:opacity-50"
              >
                <option value="">{selectedCourse ? "Select batch" : "Select course first"}</option>
                {(batches as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Subject <span className="normal-case font-normal text-slate-300 tracking-normal">(optional)</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
              >
                <option value="">All subjects</option>
                {(subjects as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Exam</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                disabled={!selectedBatch}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all disabled:opacity-50"
              >
                <option value="">{selectedBatch ? "Select exam" : "Select batch first"}</option>
                {(exams as any[]).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name or roll…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {selectedExamObj && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap text-[11px]">
              <span className="text-slate-400">
                Date: <strong className="text-slate-600">{selectedExamObj.exam_date ?? "—"}</strong>
              </span>
              <span className="text-slate-400">
                Total Marks: <strong className="text-slate-600">{defaultTotal}</strong>
              </span>
              {hasChanges && (
                <span className="ml-auto font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
          )}
        </div>

        {/* Analytics */}
        {canEnter && analytics && (students as any[]).length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Highest Score", value: `${analytics.highest}%`, icon: <ArrowUp size={16} className="text-white" />,    color: "bg-emerald-500" },
                { label: "Lowest Score",  value: `${analytics.lowest}%`,  icon: <ArrowDown size={16} className="text-white" />,  color: "bg-rose-500"   },
                { label: "Class Average", value: `${analytics.avg}%`,     icon: <BarChart3 size={16} className="text-white" />,  color: "bg-[#0B3C5D]"  },
                { label: "Pass Rate",     value: `${analytics.passRate}%`, icon: <Trophy size={16} className="text-white" />,    color: "bg-amber-400"  },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                    <p className="text-xl font-black text-slate-800 leading-tight">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Grade Distribution — {(students as any[]).length} students
              </p>
              <div className="flex h-7 rounded-lg overflow-hidden gap-px">
                {(["Excellent", "Good", "Average", "Needs Improvement"] as Grade[]).map((grade) => {
                  const count = analytics.dist[grade];
                  const w = (students as any[]).length > 0
                    ? (count / (students as any[]).length) * 100
                    : 0;
                  if (w === 0) return null;
                  return (
                    <div
                      key={grade}
                      className={`${GRADE_CFG[grade].bar} flex items-center justify-center text-white text-[10px] font-bold`}
                      style={{ width: `${w}%` }}
                      title={`${grade}: ${count}`}
                    >
                      {w > 8 ? count : ""}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {(["Excellent", "Good", "Average", "Needs Improvement"] as Grade[]).map((grade) => (
                  <div key={grade} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm ${GRADE_CFG[grade].bar}`} />
                    <span className="text-[11px] text-slate-500">{grade} ({analytics.dist[grade]})</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Marks table / state */}
        {!selectedBatch ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet size={26} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              Select course → batch → exam to start entering marks.
            </p>
          </div>

        ) : !selectedExam ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <p className="text-sm font-medium text-slate-400 mb-3">No exam selected.</p>
            <button
              onClick={() => setExamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#0B3C5D]
                         bg-[#0B3C5D]/10 rounded-xl hover:bg-[#0B3C5D]/20 transition-colors"
            >
              <Plus size={14} />
              Create First Exam
            </button>
          </div>

        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-36" />
                  <div className="h-2.5 bg-slate-100 rounded w-20" />
                </div>
                <div className="w-20 h-7 bg-slate-100 rounded-lg" />
                <div className="w-16 h-3 bg-slate-100 rounded" />
                <div className="w-14 h-6 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>

        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <p className="text-sm font-medium text-slate-400">
              {searchQuery ? "No students match your search." : "No students in this batch."}
            </p>
          </div>

        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {["Student", `Marks / ${defaultTotal}`, "Percentage", "Grade", "Remarks"].map((h) => (
                        <th key={h} className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <MarksRow
                        key={student.id}
                        student={student}
                        entry={marksMap[student.id] ?? { marks_obtained: 0, total_marks: defaultTotal, remarks: "" }}
                        defaultTotal={defaultTotal}
                        onChange={handleMarksChange}
                        onRemarksChange={handleRemarksChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                <p className="text-xs text-slate-400 font-medium">
                  Showing {filteredStudents.length} of {(students as any[]).length} students
                </p>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filteredStudents.map((student) => (
                <MobileCard
                  key={student.id}
                  student={student}
                  entry={marksMap[student.id] ?? { marks_obtained: 0, total_marks: defaultTotal, remarks: "" }}
                  defaultTotal={defaultTotal}
                  onChange={handleMarksChange}
                  onRemarksChange={handleRemarksChange}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
