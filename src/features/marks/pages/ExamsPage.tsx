"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CalendarClock,
  Trophy,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  GraduationCap,
  Calendar,
} from "lucide-react";
import {
  useCampuses,
  useCourses,
  useSubjects,
  useExamCreators,
  useExamsDirectory,
  useDeleteExam,
  useExamToppers,
} from "../hooks";
import {
  CreatorRole,
  Exam,
  ExamDirectoryRow,
  ExamsDirectoryFilters,
} from "../types";
import { ExamModal } from "../components/ExamModal";
import { Card, EmptyState, Label, ToastStack, fieldCls, useToasts } from "../components/ui";

export default function ExamsPage() {
  const [search, setSearch] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [role, setRole] = useState<CreatorRole | "">("");
  const [createdBy, setCreatedBy] = useState("");

  // Modals & Actions state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [expandedToppersExamId, setExpandedToppersExamId] = useState<string | null>(null);

  const { toasts, add: addToast, dismiss: dismissToast } = useToasts();
  const deleteExamMutation = useDeleteExam();

  const filters: ExamsDirectoryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      campus_id: campusId || undefined,
      course_id: courseId || undefined,
      subject_id: subjectId || undefined,
      creator_role: role || undefined,
      created_by: createdBy || undefined,
    }),
    [search, campusId, courseId, subjectId, role, createdBy]
  );

  const { data: campuses = [] } = useCampuses();
  const { data: courses = [] } = useCourses();
  const { data: subjects = [] } = useSubjects(courseId);
  const { data: creators = [] } = useExamCreators();
  const { data: exams = [], isLoading, isFetching, refetch } = useExamsDirectory(filters);

  const filteredCreators = useMemo(
    () => (role ? creators.filter((c) => c.role === role) : creators),
    [creators, role]
  );

  const stats = useMemo(() => {
    const total = exams.length;
    const dailyCount = exams.filter((e) => e.is_daily).length;
    const oneShotCount = total - dailyCount;
    const distinctCreators = new Set(exams.map((e) => e.creator_name || e.created_by).filter(Boolean)).size;

    return {
      total,
      dailyCount,
      oneShotCount,
      distinctCreators,
    };
  }, [exams]);

  function resetFilters() {
    setSearch("");
    setCampusId("");
    setCourseId("");
    setSubjectId("");
    setRole("");
    setCreatedBy("");
  }

  const hasActiveFilters = !!(search || campusId || courseId || subjectId || role || createdBy);

  async function handleDeleteConfirm() {
    if (!examToDelete) return;
    try {
      await deleteExamMutation.mutateAsync(examToDelete.id);
      addToast("success", `Exam "${examToDelete.name}" deleted successfully.`);
      setExamToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete exam.";
      addToast("error", msg);
    }
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Create / Edit Exam Modal */}
      <ExamModal
        isOpen={isCreateModalOpen || !!examToEdit}
        onClose={() => {
          setIsCreateModalOpen(false);
          setExamToEdit(null);
        }}
        examToEdit={examToEdit}
        onToast={addToast}
      />

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Exam</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{examToDelete.name}</strong>?
              All associated student mark records and history for this exam will be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteExamMutation.isPending}
                onClick={handleDeleteConfirm}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteExamMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete Exam
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#0B3C5D] p-3 rounded-2xl text-white shadow-md shadow-blue-900/10">
              <BookMarked size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Exams</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage, edit, update, rename, delete, and view analytics for all tests & exams.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20 active:scale-[0.98]"
          >
            <Plus size={16} />
            Create New Exam
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-[#0B3C5D] rounded-xl shrink-0">
              <BookMarked size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Exams</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-[#D4AF37] rounded-xl shrink-0">
              <CalendarClock size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily / Recurring</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.dailyCount}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">One-Shot Exams</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.oneShotCount}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Creators</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.distinctCreators}</p>
            </div>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Filter & Search Exams</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Reset filters
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Refresh list"
              >
                <RefreshCw size={15} className={isFetching ? "animate-spin text-[#0B3C5D]" : ""} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Label>Search Exam Name</Label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search exam by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${fieldCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <Label>Campus</Label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
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
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setSubjectId("");
                }}
                className={fieldCls}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Subject</Label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!courseId}
                className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">{courseId ? "All Subjects" : "Select Course first"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Creator Role</Label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as CreatorRole | "");
                  setCreatedBy("");
                }}
                className={fieldCls}
              >
                <option value="">All Creator Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Exams Table / Cards */}
        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[#0B3C5D] mx-auto" />
              <p className="text-sm font-semibold text-slate-500">Loading exams directory...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<BookMarked size={28} />}
                title="No exams found"
                hint={
                  hasActiveFilters
                    ? "Try loosening your search query or filters to find exams."
                    : "No exams have been created yet. Click 'Create New Exam' above to get started."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase font-bold tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Exam Name</th>
                    <th className="py-3.5 px-4">Campus</th>
                    <th className="py-3.5 px-4">Course & Subject</th>
                    <th className="py-3.5 px-4">Exam Date</th>
                    <th className="py-3.5 px-4 text-center">Marks</th>
                    <th className="py-3.5 px-4">Creator</th>
                    <th className="py-3.5 px-4">Performance Stats</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {exams.map((exam) => {
                    const isToppersExpanded = expandedToppersExamId === exam.id;

                    return (
                      <React.Fragment key={exam.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors group">
                          {/* Exam Name */}
                          <td className="py-4 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-[#0B3C5D]/10 group-hover:text-[#0B3C5D] transition-colors shrink-0 mt-0.5">
                                <BookMarked size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{exam.name}</span>
                                  {exam.is_daily && (
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                                      Daily
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                                    {exam.exam_scope}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  ID: <code className="text-[10px] font-mono text-slate-500">{exam.id.slice(0, 8)}</code>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Campus */}
                          <td className="py-4 px-4 align-top text-xs font-semibold text-slate-700">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                              {exam.campuses?.name || "All Campuses"}
                            </span>
                          </td>

                          {/* Course & Subject */}
                          <td className="py-4 px-4 align-top text-xs">
                            <p className="font-semibold text-slate-800 truncate">
                              {exam.courses?.name || "All Courses"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {exam.subjects?.name || (exam.batches?.name ? `Batch: ${exam.batches.name}` : "All Subjects")}
                            </p>
                          </td>

                          {/* Exam Date */}
                          <td className="py-4 px-4 align-top text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{exam.exam_date || "No date set"}</span>
                            </div>
                          </td>

                          {/* Total Marks */}
                          <td className="py-4 px-4 align-top text-center">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg">
                              {exam.total_marks}
                            </span>
                          </td>

                          {/* Creator */}
                          <td className="py-4 px-4 align-top text-xs">
                            <p className="font-semibold text-slate-800">
                              {exam.creator_name || "System Admin"}
                            </p>
                            {exam.creator_role && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-400 uppercase">
                                {exam.creator_role}
                              </span>
                            )}
                          </td>

                          {/* Performance Analytics Stats */}
                          <td className="py-4 px-4 align-top text-xs">
                            {exam.stats ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <span className="font-bold text-slate-800">
                                    {exam.stats.student_count ?? 0}
                                  </span>{" "}
                                  students evaluated
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                  <span>Avg: <strong className="text-slate-700">{formatPct(exam.stats.avg_pct)}</strong></span>
                                  <span>Pass: <strong className="text-emerald-600">{formatPct(exam.stats.pass_pct)}</strong></span>
                                  <span>Top: <strong className="text-[#0B3C5D]">{formatPct(exam.stats.top_pct)}</strong></span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No marks submitted yet</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Enter / View Marks */}
                              <Link
                                href={`/marks?examId=${exam.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#0B3C5D] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Enter or View Marks"
                              >
                                <FileSpreadsheet size={13} />
                                <span>Marks</span>
                              </Link>

                              {/* View Toppers Toggle */}
                              <button
                                onClick={() =>
                                  setExpandedToppersExamId(isToppersExpanded ? null : exam.id)
                                }
                                className={`p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors ${
                                  isToppersExpanded ? "bg-amber-50 text-amber-600" : ""
                                }`}
                                title="Toggle Top Performers"
                              >
                                <Trophy size={14} />
                              </button>

                              {/* Edit / Rename */}
                              <button
                                onClick={() => setExamToEdit(exam)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B3C5D] hover:bg-slate-100 transition-colors"
                                title="Edit / Rename Exam"
                              >
                                <Edit2 size={14} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setExamToDelete(exam)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Exam"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Toppers Row */}
                        {isToppersExpanded && (
                          <tr className="bg-amber-50/40">
                            <td colSpan={8} className="p-4 border-b border-amber-100">
                              <ExamToppersSubRow examId={exam.id} examName={exam.name} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function ExamToppersSubRow({ examId, examName }: { examId: string; examName: string }) {
  const { data: toppers = [], isLoading } = useExamToppers(examId, 5);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 p-2">
        <Loader2 size={14} className="animate-spin" />
        Fetching top performers for {examName}...
      </div>
    );
  }

  if (toppers.length === 0) {
    return (
      <div className="text-xs text-amber-800 italic p-2">
        No scored results recorded for {examName} yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
        <Trophy size={14} className="text-amber-600" />
        <span>Top Performers — {examName}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {toppers.map((t: any, idx: number) => (
          <div
            key={t.student_id || idx}
            className="bg-white border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm"
          >
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center shrink-0">
              #{idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{t.student_name || "Student"}</p>
              <p className="text-[11px] text-slate-500">
                Score: <strong className="text-amber-700">{t.marks_obtained}/{t.total_marks}</strong> ({formatPct(t.percentage)})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPct(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "0%";
  const num = Number(val);
  return `${Number(num.toFixed(2))}%`;
}
