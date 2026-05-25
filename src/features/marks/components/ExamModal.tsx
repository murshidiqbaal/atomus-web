"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, CalendarClock, Loader2, Plus, X } from "lucide-react";
import { useCourses, useCreateExam, useSubjects } from "../hooks";
import { Label, fieldCls } from "./ui";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse: string;
  onCreated: (examId: string) => void;
  onToast: (type: "success" | "error", msg: string) => void;
};

export function ExamModal(props: Props) {
  if (!props.isOpen) return null;
  // Re-mount fresh on every open via the parent toggling isOpen.
  // Initial state inside the form is owned by useState defaults.
  return <ExamModalContent {...props} />;
}

function ExamModalContent({
  onClose,
  defaultCourse,
  onCreated,
  onToast,
}: Props) {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState(defaultCourse);
  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [totalMarks, setTotalMarks] = useState(100);
  const [isDaily, setIsDaily] = useState(false);
  const [error, setError] = useState("");

  const { data: courses = [] } = useCourses();
  const { data: subjects = [] } = useSubjects(courseId);
  const create = useCreateExam();

  useEffect(() => {
    setSubjectId("");
  }, [courseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !courseId || !examDate) {
      setError("Please fill all required fields.");
      return;
    }
    setError("");
    try {
      const exam = await create.mutateAsync({
        name: name.trim(),
        course_id: courseId,
        batch_id: null,
        exam_scope: "course",
        exam_date: examDate,
        total_marks: totalMarks,
        is_daily: isDaily,
        subject_id: subjectId || null,
      });
      onCreated(exam.id);
      onToast(
        "success",
        isDaily
          ? `Daily exam "${exam.name}" created — enter marks per day from the Marks tab.`
          : `Exam "${exam.name}" created.`,
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create exam.";
      setError(msg);
      onToast("error", msg);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Create Exam</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Set course and marks to start entering scores.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div>
              <Label>Exam Name</Label>
              <input
                type="text"
                placeholder="e.g. Mid-Term 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldCls}
                autoFocus
              />
            </div>

            <div>
              <Label>Course</Label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
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
              <Label>Subject (Optional)</Label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={fieldCls}
                disabled={!courseId}
              >
                <option value="">Overall / Multi-subject (general)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isDaily ? "Start Date" : "Exam Date"}</Label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <Label>Total Marks (default)</Label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value)))}
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Daily exam toggle */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                isDaily
                  ? "border-[#D4AF37] bg-[#D4AF37]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isDaily}
                onChange={(e) => setIsDaily(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#0B3C5D]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className={isDaily ? "text-[#D4AF37]" : "text-slate-400"} />
                  <span className="text-sm font-bold text-slate-800">Daily Exam</span>
                  {isDaily && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                      Recurring
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Enter marks for this exam on different dates without creating a new exam each day. Marks are stored per-day under the same exam record.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-lg
                         hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20 disabled:opacity-60
                         disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {create.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
