"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2, Plus, X, Users, BookOpen } from "lucide-react";
import { useBatches, useCourses, useCreateExam } from "../hooks";
import { ExamScope } from "../types";
import { Label, fieldCls } from "./ui";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse: string;
  defaultBatch: string;
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
  defaultBatch,
  onCreated,
  onToast,
}: Props) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ExamScope>("batch");
  const [courseId, setCourseId] = useState(defaultCourse);
  const [batchId, setBatchId] = useState(defaultBatch);
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [totalMarks, setTotalMarks] = useState(100);
  const [error, setError] = useState("");

  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches(courseId);
  const create = useCreateExam();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !courseId || !examDate) {
      setError("Please fill all required fields.");
      return;
    }
    if (scope === "batch" && !batchId) {
      setError("Select a batch — or switch to Course scope.");
      return;
    }
    setError("");
    try {
      const exam = await create.mutateAsync({
        name: name.trim(),
        course_id: courseId,
        batch_id: scope === "batch" ? batchId : null,
        exam_scope: scope,
        exam_date: examDate,
        total_marks: totalMarks,
      });
      onCreated(exam.id);
      onToast("success", `Exam "${exam.name}" created.`);
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
              Set scope, course and marks to start entering scores.
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
              <Label>Exam Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "batch", label: "Single Batch", icon: <Users size={14} /> },
                    { key: "course", label: "Entire Course", icon: <BookOpen size={14} /> },
                  ] as { key: ExamScope; label: string; icon: React.ReactNode }[]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScope(opt.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-xl border transition-all
                      ${scope === opt.key
                        ? "bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-md shadow-blue-900/20"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0B3C5D]/40 hover:text-[#0B3C5D]"}`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {scope === "course"
                  ? "Exam will apply to all batches in the selected course."
                  : "Exam will apply only to the selected batch."}
              </p>
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Course</Label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setBatchId("");
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
                <Label optional={scope === "course"}>Batch</Label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  disabled={!courseId || scope === "course"}
                  className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {scope === "course"
                      ? "All batches in course"
                      : courseId
                      ? "Select batch"
                      : "Select course first"}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Exam Date</Label>
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
