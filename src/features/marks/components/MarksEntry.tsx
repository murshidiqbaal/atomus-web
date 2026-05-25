"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet, Plus, Save, Loader2, Search, RotateCcw,
  Trophy, ArrowUp, ArrowDown, BarChart3, Zap, Edit3, CalendarClock,
} from "lucide-react";
import {
  useAllSubjectMarks, useExams, useMarks, useSaveMarks,
  useStudentsForExam, useSubjects,
} from "../hooks";
import { useCampuses, useCoursesByCampus, useCourses as useGlobalCourses } from "../../students/hooks";
import { Mark, MarksMap, StudentLite, Grade } from "../types";
import { Card, EmptyState, fieldCls, Label } from "./ui";
import { calcPct, getGrade, GRADE_CFG } from "../utils/grade";
import { MarksMobileCard, MarksRow } from "./MarksRow";

export function MarksEntry({
  onToast,
  onCreateExam,
}: {
  onToast: (type: "success" | "error", msg: string) => void;
  onCreateExam: () => void;
}) {
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [markDate, setMarkDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [marksMap, setMarksMap] = useState<MarksMap>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [bulkValue, setBulkValue] = useState<string>("");

  const { data: campuses = [] } = useCampuses();
  const { data: globalCourses = [] } = useGlobalCourses();
  const { data: campusCourses = [] } = useCoursesByCampus(selectedCampus);
  const courses = selectedCampus ? campusCourses : globalCourses;

  const { data: exams = [] } = useExams(selectedCourse);

  const selectedExamObj = useMemo(
    () => exams.find((e) => e.id === selectedExam) ?? null,
    [exams, selectedExam]
  );

  const { data: subjects = [] } = useSubjects(selectedCourse || selectedExamObj?.course_id || "");
  const defaultTotal = selectedExamObj?.total_marks ?? 100;

  const isDaily = !!selectedExamObj?.is_daily;
  // For non-daily exams, mark_date is always null so we don't fragment storage.
  const activeMarkDate = isDaily ? markDate : null;
  /**
   * "Overall" mode: no subject picked → show a read-only pivot of every
   * student's per-subject marks (and a computed total). Editing requires
   * choosing a specific subject so writes are unambiguous.
   */
  const isOverallView = !selectedSubject;

  const { data: students = [], isLoading: studentsLoading } =
    useStudentsForExam(selectedExamObj);
  const { data: marksData = [], isLoading: marksLoading } = useMarks(
    selectedExam,
    selectedSubject,
    activeMarkDate,
  );
  const { data: allSubjectMarks = [], isLoading: overallLoading } = useAllSubjectMarks(
    isOverallView ? selectedExam : "",
    activeMarkDate,
  );

  const saveMutation = useSaveMarks(selectedExam, selectedSubject, activeMarkDate);

  // ── Sync selectedSubject with exam scope ──────────────────────────
  useEffect(() => {
    if (selectedExamObj?.subject_id) {
      setSelectedSubject(selectedExamObj.subject_id);
    } else {
      setSelectedSubject("");
    }
  }, [selectedExamObj]);

  // ── Sync remote marks → local editable map ───────────────────────
  // Legitimate remote→local sync: server data seeds the editable grid
  // whenever the chosen exam/subject changes. Suppressing the
  // set-state-in-effect lint rule because there is no cleaner option
  // for editable copies of server data.
  useEffect(() => {
    if (!students.length) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setMarksMap({});
      return;
    }
    const map: MarksMap = {};
    for (const s of students) {
      const existing = marksData.find((m) => m.student_id === s.id);
      map[s.id] = {
        id: existing?.id,
        marks_obtained: Number(existing?.marks_obtained ?? 0),
        total_marks: Number(existing?.total_marks ?? defaultTotal),
        remarks: existing?.remarks ?? "",
        dirty: false,
      };
    }
    setMarksMap(map);
    setHasChanges(false);
  }, [students, marksData, defaultTotal, selectedExam, selectedSubject, activeMarkDate]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleMarksChange = useCallback((studentId: string, val: number) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks_obtained: val, dirty: true },
    }));
    setHasChanges(true);
  }, []);

  const handleRemarksChange = useCallback((studentId: string, val: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks: val, dirty: true },
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedExam) return;
    if (isDaily && !markDate) {
      onToast("error", "Pick a date before saving marks for a daily exam.");
      return;
    }
    const records: Mark[] = students.map((s) => {
      const entry = marksMap[s.id];
      return {
        ...(entry?.id ? { id: entry.id } : {}),
        exam_id: selectedExam,
        student_id: s.id,
        subject_id: selectedSubject || null,
        mark_date: activeMarkDate,
        marks_obtained: entry?.marks_obtained ?? 0,
        total_marks: entry?.total_marks ?? defaultTotal,
        remarks: entry?.remarks ?? "",
      };
    });
    saveMutation.mutate(records, {
      onSuccess: () => {
        const suffix = isDaily ? ` (${markDate})` : "";
        onToast("success", `Saved marks for ${records.length} students${suffix}.`);
        setMarksMap((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) next[id] = { ...next[id], dirty: false };
          return next;
        });
        setHasChanges(false);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Failed to save marks.";
        onToast("error", msg);
      },
    });
  }, [selectedExam, students, marksMap, selectedSubject, defaultTotal, saveMutation, onToast, isDaily, markDate, activeMarkDate]);

  // ── Keyboard nav (Enter / Arrow keys jump between rows) ─────────
  const handleKeyDownNav = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number) => {
      const target = e.currentTarget;
      const col = target.dataset.col as "marks" | "remarks";
      const dir =
        e.key === "Enter" || e.key === "ArrowDown" ? 1 :
        e.key === "ArrowUp" ? -1 : 0;

      if (!dir) return;
      e.preventDefault();
      const nextRow = rowIndex + dir;
      const next = document.querySelector<HTMLInputElement>(
        `input[data-row="${nextRow}"][data-col="${col}"]`
      );
      if (next) {
        next.focus();
        next.select();
      } else if (dir === 1 && hasChanges) {
        handleSave();
      }
    },
    [hasChanges, handleSave]
  );

  const handleResetAll = () => {
    setMarksMap((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { ...next[s.id], marks_obtained: 0, remarks: "", dirty: true };
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleBulkApply = () => {
    const v = Number(bulkValue);
    if (!bulkValue || Number.isNaN(v) || v < 0 || v > defaultTotal) {
      onToast("error", `Enter a value between 0 and ${defaultTotal}.`);
      return;
    }
    setMarksMap((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { ...next[s.id], marks_obtained: v, dirty: true };
      }
      return next;
    });
    setHasChanges(true);
    setBulkValue("");
    onToast("success", `Applied ${v} marks to all ${students.length} students.`);
  };

  // ── Analytics ───────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const entries = students.map((s) => marksMap[s.id]).filter(Boolean);
    if (!entries.length) return null;
    const pcts = entries.map((e) => calcPct(e.marks_obtained, e.total_marks || defaultTotal));
    const highest = Math.max(...pcts);
    const lowest = Math.min(...pcts);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const passCount = pcts.filter((p) => p >= 50).length;
    const dist: Record<Grade, number> = {
      Excellent: pcts.filter((p) => p >= 90).length,
      Good: pcts.filter((p) => p >= 75 && p < 90).length,
      Average: pcts.filter((p) => p >= 50 && p < 75).length,
      "Needs Improvement": pcts.filter((p) => p < 50).length,
    };
    return {
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      avg: avg.toFixed(1),
      passRate: ((passCount / entries.length) * 100).toFixed(1),
      dist,
    };
  }, [students, marksMap, defaultTotal]);

  // ── Search ──────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  /**
   * Overall pivot — sums every subject row per student for the active exam
   * (+ active date for daily exams). The pivot is read-only because edits
   * to a "total" cell can't be decomposed back into per-subject scores.
   *
   * `overallSubjects` holds only subjects with at least one mark recorded,
   * so we don't pollute the table with empty columns for subjects no one
   * has been graded on yet. Legacy null-subject "overall" entries get a
   * synthetic "Overall" column appended at the end.
   */
  const overallView = useMemo(() => {
    if (!isOverallView) return null;

    // bucket marks by student + subject (null subject = legacy "overall" row).
    // We also keep the first-seen `entered_by` per cell so the pivot can show
    // attribution (which teacher/admin recorded the score).
    type Bucket = { obtained: number; total: number; enteredBy: { full_name: string; role: "teacher" | "admin" } | null };
    type StudentBucket = { perSubject: Map<string | null, Bucket>; obtainedSum: number; totalSum: number };
    const byStudent = new Map<string, StudentBucket>();
    const subjectIdsWithData = new Set<string | null>();
    const allEntryAuthors = new Set<string>();

    for (const m of allSubjectMarks) {
      const sb = byStudent.get(m.student_id) ?? {
        perSubject: new Map<string | null, Bucket>(),
        obtainedSum: 0,
        totalSum: 0,
      };
      const key = m.subject_id ?? null;
      const cur = sb.perSubject.get(key) ?? { obtained: 0, total: 0, enteredBy: null };
      cur.obtained += Number(m.marks_obtained ?? 0);
      cur.total += Number(m.total_marks ?? 0);
      if (!cur.enteredBy && m.entered_by) {
        cur.enteredBy = { full_name: m.entered_by.full_name, role: m.entered_by.role };
      }
      if (m.entered_by) allEntryAuthors.add(m.entered_by.full_name);
      sb.perSubject.set(key, cur);
      sb.obtainedSum += Number(m.marks_obtained ?? 0);
      sb.totalSum += Number(m.total_marks ?? 0);
      byStudent.set(m.student_id, sb);
      subjectIdsWithData.add(key);
    }

    const namedSubjects = subjects.filter((s) => subjectIdsWithData.has(s.id));
    const hasLegacyOverall = subjectIdsWithData.has(null);

    const rows = filteredStudents.map((s) => {
      const bucket = byStudent.get(s.id);
      const perSubject = namedSubjects.map((sub) => {
        const b = bucket?.perSubject.get(sub.id);
        return {
          subjectId: sub.id,
          subjectName: sub.name,
          obtained: b?.obtained ?? null,
          total: b?.total ?? null,
          enteredBy: b?.enteredBy ?? null,
        };
      });
      const legacyOverall = hasLegacyOverall
        ? bucket?.perSubject.get(null) ?? null
        : null;
      const totalObtained = bucket?.obtainedSum ?? 0;
      const totalOutOf = bucket?.totalSum ?? 0;
      const pct = totalOutOf > 0 ? (totalObtained / totalOutOf) * 100 : 0;
      return {
        student: s,
        perSubject,
        legacyOverall,
        totalObtained,
        totalOutOf,
        pct,
        graded: !!bucket && bucket.perSubject.size > 0,
      };
    });

    return {
      subjects: namedSubjects,
      hasLegacyOverall,
      rows,
      contributors: Array.from(allEntryAuthors).sort(),
    };
  }, [isOverallView, allSubjectMarks, subjects, filteredStudents]);

  /** Stats strip for the Overall view — derived from the pivot, not marksMap. */
  const overallAnalytics = useMemo(() => {
    if (!overallView) return null;
    const graded = overallView.rows.filter((r) => r.graded);
    if (!graded.length) return null;
    const pcts = graded.map((r) => r.pct);
    const highest = Math.max(...pcts);
    const lowest = Math.min(...pcts);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const passCount = pcts.filter((p) => p >= 50).length;
    const dist: Record<Grade, number> = {
      Excellent: pcts.filter((p) => p >= 90).length,
      Good: pcts.filter((p) => p >= 75 && p < 90).length,
      Average: pcts.filter((p) => p >= 50 && p < 75).length,
      "Needs Improvement": pcts.filter((p) => p < 50).length,
    };
    return {
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      avg: avg.toFixed(1),
      passRate: ((passCount / graded.length) * 100).toFixed(1),
      dist,
      gradedCount: graded.length,
    };
  }, [overallView]);

  // ── CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const header = ["roll_number", "student_name", "marks_obtained", "total_marks", "percentage", "grade", "remarks"];
    const rows = students.map((s) => {
      const e = marksMap[s.id];
      const total = e?.total_marks || defaultTotal;
      const pct = calcPct(e?.marks_obtained ?? 0, total);
      return [
        s.roll_number ?? "",
        s.full_name,
        e?.marks_obtained ?? 0,
        total,
        pct.toFixed(2),
        getGrade(pct),
        (e?.remarks ?? "").replace(/[\n\r,]/g, " "),
      ].join(",");
    });
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedExamObj?.name ?? "marks"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loading = studentsLoading || (isOverallView ? overallLoading : marksLoading);
  const canEnter = !!selectedExam;
  const activeAnalytics = isOverallView ? overallAnalytics : analytics;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label optional>Campus</Label>
            <select
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setSelectedCourse("");
                setSelectedExam("");
                setSelectedSubject("");
              }}
              className={fieldCls}
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Course</Label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedExam("");
                setSelectedSubject("");
              }}
              className={fieldCls}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label optional>Subject</Label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={fieldCls}
              disabled={!(selectedCourse || selectedExamObj?.course_id) || !!selectedExamObj?.subject_id}
            >
              <option value="">Overall</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Exam</Label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className={fieldCls}
            >
              <option value="">
                Select exam
              </option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.is_daily ? " · Daily" : ""}
                  {!e.is_daily && e.exam_scope === "course" ? " · Course-wide" : ""}
                </option>
              ))}
            </select>
          </div>

          {isDaily && (
            <div>
              <Label>Mark Date</Label>
              <div className="relative">
                <CalendarClock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none"
                />
                <input
                  type="date"
                  value={markDate}
                  onChange={(e) => setMarkDate(e.target.value || new Date().toISOString().slice(0, 10))}
                  className={`${fieldCls} pl-9`}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Search Student</Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Name or roll…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${fieldCls} pl-9`}
              />
            </div>
          </div>
        </div>

        {selectedExamObj && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap text-[11px]">
            {isDaily ? (
              <span className="inline-flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                <CalendarClock size={11} />
                Daily Exam · {markDate}
              </span>
            ) : (
              <span className="text-slate-400">
                Date:{" "}
                <strong className="text-slate-600">
                  {selectedExamObj.exam_date ?? "—"}
                </strong>
              </span>
            )}
            <span className="text-slate-400">
              Scope:{" "}
              <strong className="text-slate-600 capitalize">
                {selectedExamObj.exam_scope}
              </strong>
            </span>
            <span className="text-slate-400">
              Total Marks:{" "}
              <strong className="text-slate-600">{defaultTotal}</strong>
            </span>
            <span className="text-slate-400">
              Students:{" "}
              <strong className="text-slate-600">
                {filteredStudents.length} / {students.length}
              </strong>
            </span>
            {hasChanges && (
              <span className="ml-auto font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Unsaved changes
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Toolbar — only when editing a specific subject */}
      {canEnter && !isOverallView && students.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Zap size={14} className="text-[#D4AF37]" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Bulk Set
            </span>
            <input
              type="number"
              min={0}
              max={defaultTotal}
              placeholder={`0–${defaultTotal}`}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="w-20 px-2 py-1 text-sm font-bold text-[#0B3C5D] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0B3C5D] text-center"
            />
            <button
              type="button"
              onClick={handleBulkApply}
              className="text-xs font-bold text-[#0B3C5D] hover:underline px-1"
            >
              Apply
            </button>
          </div>

          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Reset All
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <Edit3 size={14} />
            Export CSV
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#0B3C5D]
                       rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20
                       disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {saveMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {hasChanges ? "Save All" : "Saved"}
          </button>
        </div>
      )}

      {/* Overall mode banner — read-only aggregate across all subjects */}
      {canEnter && isOverallView && students.length > 0 && (
        <Card className="px-4 py-3 flex items-start gap-3 bg-gradient-to-br from-[#0B3C5D]/5 to-white border-[#0B3C5D]/10">
          <div className="bg-[#0B3C5D] text-white p-1.5 rounded-lg shrink-0">
            <BarChart3 size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">Overall view</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Showing every student's marks across all subjects of this exam. Pick a specific subject above to enter or edit scores.
            </p>
          </div>
        </Card>
      )}

      {/* Quick analytics strip */}
      {canEnter && activeAnalytics && students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Highest", value: `${activeAnalytics.highest}%`, icon: <ArrowUp size={16} />, accent: "bg-emerald-500" },
            { label: "Lowest", value: `${activeAnalytics.lowest}%`, icon: <ArrowDown size={16} />, accent: "bg-rose-500" },
            { label: "Average", value: `${activeAnalytics.avg}%`, icon: <BarChart3 size={16} />, accent: "bg-[#0B3C5D]" },
            { label: "Pass Rate", value: `${activeAnalytics.passRate}%`, icon: <Trophy size={16} />, accent: "bg-amber-400" },
          ].map((c) => (
            <Card key={c.label} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.accent} text-white flex items-center justify-center`}>
                {c.icon}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
                <p className="text-xl font-black text-slate-800 leading-tight">{c.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Grade Distribution Bar */}
      {canEnter && activeAnalytics && students.length > 0 && (
        <Card className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Grade Distribution — {students.length} students
          </p>
          <div className="flex h-7 rounded-lg overflow-hidden gap-px">
            {(["Excellent", "Good", "Average", "Needs Improvement"] as Grade[]).map((grade) => {
              const count = activeAnalytics.dist[grade];
              const w = students.length > 0 ? (count / students.length) * 100 : 0;
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
                <span className="text-[11px] text-slate-500">
                  {grade} ({activeAnalytics.dist[grade]})
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table / Empty / Loading */}
      {!selectedExam ? (
        <EmptyState
          icon={<FileSpreadsheet size={26} />}
          title="No exam selected"
          hint="Pick an exam or create a new one."
          action={
            <button
              onClick={onCreateExam}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 rounded-xl hover:bg-[#0B3C5D]/20"
            >
              <Plus size={14} />
              Create New Exam
            </button>
          }
        />
      ) : loading ? (
        <Card>
          {Array(8).fill(0).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 animate-pulse"
            >
              <div className="w-12 h-3 bg-slate-100 rounded" />
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-100 rounded w-36" />
                <div className="h-2.5 bg-slate-100 rounded w-20" />
              </div>
              <div className="w-20 h-7 bg-slate-100 rounded-lg" />
              <div className="w-14 h-6 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </Card>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title={
            searchQuery
              ? "No students match your search."
              : "No students in this course."
          }
        />
      ) : isOverallView ? (
        <OverallMarksTable
          overall={overallView}
          studentTotal={students.length}
        />
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 backdrop-blur">
                  <tr className="border-b border-slate-200">
                    {["Roll", "Student", `Marks / ${defaultTotal}`, "Percentage", "Grade", "Remarks"].map((h) => (
                      <th
                        key={h}
                        className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student: StudentLite, idx) => (
                    <MarksRow
                      key={student.id}
                      student={student}
                      rowIndex={idx}
                      entry={
                        marksMap[student.id] ?? {
                          marks_obtained: 0,
                          total_marks: defaultTotal,
                          remarks: "",
                        }
                      }
                      defaultTotal={defaultTotal}
                      onChange={handleMarksChange}
                      onRemarksChange={handleRemarksChange}
                      onKeyDownNav={handleKeyDownNav}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">
                Showing {filteredStudents.length} of {students.length} students
              </p>
              <p className="text-xs text-slate-400 font-medium hidden lg:block">
                Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd>
                {" "}to move to the next row · <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑↓</kbd>
                {" "}to navigate
              </p>
            </div>
          </Card>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {filteredStudents.map((student: StudentLite) => (
              <MarksMobileCard
                key={student.id}
                student={student}
                entry={
                  marksMap[student.id] ?? {
                    marks_obtained: 0,
                    total_marks: defaultTotal,
                    remarks: "",
                  }
                }
                defaultTotal={defaultTotal}
                onChange={handleMarksChange}
                onRemarksChange={handleRemarksChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Overall pivot table — read-only summary across every subject of the
// active exam. Each student shows their score per subject, plus an
// aggregated total, percentage, and grade.
// ────────────────────────────────────────────────────────────────────

type OverallSubjectCell = {
  subjectId: string;
  subjectName: string;
  obtained: number | null;
  total: number | null;
};

type OverallRow = {
  student: StudentLite;
  perSubject: OverallSubjectCell[];
  legacyOverall: { obtained: number; total: number } | null;
  totalObtained: number;
  totalOutOf: number;
  pct: number;
  graded: boolean;
};

type OverallViewModel = {
  subjects: { id: string; name: string }[];
  hasLegacyOverall: boolean;
  rows: OverallRow[];
};

function OverallMarksTable({
  overall, studentTotal,
}: {
  overall: OverallViewModel | null;
  studentTotal: number;
}) {
  if (!overall) {
    return (
      <EmptyState
        icon={<FileSpreadsheet size={26} />}
        title="No marks recorded yet"
        hint="Select a subject above to start entering scores for this exam."
      />
    );
  }

  const { subjects: subs, hasLegacyOverall, rows } = overall;

  if (subs.length === 0 && !hasLegacyOverall) {
    return (
      <EmptyState
        icon={<FileSpreadsheet size={26} />}
        title="No subject-scoped marks yet for this exam"
        hint="Pick a subject from the filter to start entering scores. Aggregated totals will appear here once any subject has marks."
      />
    );
  }

  const gradedCount = rows.filter((r) => r.graded).length;

  return (
    <>
      {/* Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  Roll
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  Student
                </th>
                {subs.map((s) => (
                  <th
                    key={s.id}
                    className="py-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap text-center"
                    title={s.name}
                  >
                    {s.name}
                  </th>
                ))}
                {hasLegacyOverall && (
                  <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-widest text-amber-600 whitespace-nowrap text-center">
                    Overall (legacy)
                  </th>
                )}
                <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-[#0B3C5D] whitespace-nowrap text-right">
                  Total
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap text-right">
                  %
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const grade = row.graded ? getGrade(row.pct) : null;
                return (
                  <tr
                    key={row.student.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-bold text-slate-700 tabular-nums">
                      {row.student.roll_number ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-slate-800 truncate">{row.student.full_name}</p>
                      {row.student.batches?.name && (
                        <p className="text-[11px] text-slate-400 truncate">{row.student.batches.name}</p>
                      )}
                    </td>
                    {row.perSubject.map((c) => (
                      <td key={c.subjectId} className="py-3 px-3 text-center tabular-nums">
                        {c.obtained == null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-700">
                            {c.obtained}
                            <span className="text-[10px] font-semibold text-slate-400">/{c.total}</span>
                          </span>
                        )}
                      </td>
                    ))}
                    {hasLegacyOverall && (
                      <td className="py-3 px-3 text-center tabular-nums">
                        {row.legacyOverall ? (
                          <span className="text-sm font-bold text-amber-700">
                            {row.legacyOverall.obtained}
                            <span className="text-[10px] font-semibold text-amber-400">/{row.legacyOverall.total}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right tabular-nums">
                      {row.graded ? (
                        <span className="text-sm font-black text-[#0B3C5D]">
                          {row.totalObtained}
                          <span className="text-[10px] font-bold text-slate-400">/{row.totalOutOf}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm font-bold text-slate-700">
                      {row.graded ? `${row.pct.toFixed(1)}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {grade ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${GRADE_CFG[grade].bar}`}>
                          {grade}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            Showing {rows.length} of {studentTotal} students · {gradedCount} graded across {subs.length} subject{subs.length === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] text-slate-400 font-medium hidden lg:block">
            Pick a subject filter to enter marks · totals update automatically
          </p>
        </div>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {rows.map((row) => {
          const grade = row.graded ? getGrade(row.pct) : null;
          return (
            <Card key={row.student.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{row.student.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {row.student.roll_number ? `Roll ${row.student.roll_number}` : "No roll"}
                    {row.student.batches?.name ? ` · ${row.student.batches.name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                  <p className="text-base font-black text-[#0B3C5D] leading-tight">
                    {row.graded ? `${row.totalObtained}/${row.totalOutOf}` : "—"}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {row.graded ? `${row.pct.toFixed(1)}%` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {row.perSubject.map((c) => (
                  <div key={c.subjectId} className="bg-slate-50 rounded-lg px-2 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{c.subjectName}</p>
                    <p className="text-xs font-bold text-slate-700 tabular-nums">
                      {c.obtained == null ? "—" : `${c.obtained}/${c.total}`}
                    </p>
                  </div>
                ))}
                {row.legacyOverall && (
                  <div className="bg-amber-50 rounded-lg px-2 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Overall</p>
                    <p className="text-xs font-bold text-amber-700 tabular-nums">
                      {row.legacyOverall.obtained}/{row.legacyOverall.total}
                    </p>
                  </div>
                )}
              </div>

              {grade && (
                <div className="mt-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${GRADE_CFG[grade].bar}`}>
                    {grade}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
