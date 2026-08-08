"use client";

import React, { useMemo, useState } from "react";
import {
  X, FileSpreadsheet, Search, RefreshCw, Trophy, Users,
  ChevronRight, BookOpen, Layers, ShieldCheck,
  GraduationCap, Calendar, TrendingUp, BarChart3,
} from "lucide-react";
import {
  useBatches, useCourses, useExamCreators, useExamToppers, useExamsDirectory,
} from "../hooks";
import {
  CreatorRole, ExamDirectoryRow, ExamsDirectoryFilters,
} from "../types";
import { Card, EmptyState, fieldCls, Label } from "./ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ExamsDirectoryModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return <ExamsDirectoryContent onClose={onClose} />;
}

function ExamsDirectoryContent({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [role, setRole] = useState<CreatorRole | "">("");
  const [createdBy, setCreatedBy] = useState("");
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const filters: ExamsDirectoryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      course_id: courseId || undefined,
      batch_id: batchId || undefined,
      creator_role: role || undefined,
      created_by: createdBy || undefined,
    }),
    [search, courseId, batchId, role, createdBy],
  );

  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches(courseId);
  const { data: creators = [] } = useExamCreators();
  const { data: exams = [], isLoading, refetch } = useExamsDirectory(filters);

  const filteredCreators = useMemo(
    () => (role ? creators.filter((c) => c.role === role) : creators),
    [creators, role],
  );

  function resetFilters() {
    setSearch("");
    setCourseId("");
    setBatchId("");
    setRole("");
    setCreatedBy("");
  }

  const hasActiveFilters = !!(search || courseId || batchId || role || createdBy);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0B3C5D] text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Exams Directory</h2>
              <p className="text-[11px] text-white/70 font-semibold mt-0.5">
                Every exam created across admins & teachers · analytics & toppers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Exam name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${fieldCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <Label>Course</Label>
              <select
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setBatchId(""); }}
                className={fieldCls}
              >
                <option value="">All courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <Label>Batch</Label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={!courseId}
                className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">{courseId ? "All batches" : "Pick course first"}</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <Label>Creator Role</Label>
              <select
                value={role}
                onChange={(e) => {
                  const v = e.target.value as CreatorRole | "";
                  setRole(v);
                  setCreatedBy(""); // reset specific person on role change
                }}
                className={fieldCls}
              >
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div>
              <Label>Creator</Label>
              <select
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className={fieldCls}
              >
                <option value="">All creators</option>
                {filteredCreators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role}) · {c.exam_count}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-slate-500 font-semibold">
                {exams.length} exam{exams.length === 1 ? "" : "s"} match
              </p>
              <button
                onClick={resetFilters}
                className="text-[11px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw size={32} className="text-[#0B3C5D] animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Loading exam directory…</p>
            </div>
          ) : exams.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet size={26} />}
              title="No exams match"
              hint="Adjust the filters above or create a new exam."
            />
          ) : (
            <ul className="space-y-2">
              {exams.map((exam) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  expanded={expandedExamId === exam.id}
                  onToggle={() =>
                    setExpandedExamId((cur) => (cur === exam.id ? null : exam.id))
                  }
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 shrink-0">
          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck size={12} /> Admin view · capped at 500 most-recent exams
          </p>
          <button
            onClick={() => refetch()}
            className="text-[11px] font-bold text-[#0B3C5D] hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Exam row + expandable analytics panel
// ──────────────────────────────────────────────────────────────────

function ExamRow({
  exam,
  expanded,
  onToggle,
}: {
  exam: ExamDirectoryRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const stats = exam.stats;
  const avg = stats?.avg_pct ?? null;
  const top = stats?.top_pct ?? null;
  const pass = stats?.pass_pct ?? null;
  const count = stats?.student_count ?? 0;
  const date = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "—";

  return (
    <li className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center shrink-0">
          <FileSpreadsheet size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">{exam.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
              <BookOpen size={11} />
              {exam.courses?.name ?? "—"}
            </span>
            {exam.batches?.name ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <Layers size={11} />
                  {exam.batches.name}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-bold uppercase">course-wide</span>
              </>
            )}
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
              <Calendar size={11} />
              {date}
            </span>
          </div>
        </div>

        {/* Creator chip */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <CreatorChip
            name={exam.creator_name}
            role={exam.creator_role}
          />
        </div>

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 mr-1">
          <Pill label="Avg" value={fmtPct(avg)} tone="blue" />
          <Pill label="Top" value={fmtPct(top)} tone="gold" />
          <Pill label="N" value={count.toString()} tone="slate" />
        </div>

        <ChevronRight
          size={16}
          className={`text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && <ExamAnalyticsPanel exam={exam} />}
    </li>
  );
}

function ExamAnalyticsPanel({ exam }: { exam: ExamDirectoryRow }) {
  const stats = exam.stats;
  const { data: toppers = [], isLoading } = useExamToppers(exam.id, 10);

  return (
    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/40 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <MiniStat
          icon={<TrendingUp size={14} />}
          label="Average"
          value={fmtPct(stats?.avg_pct ?? null)}
          accent="bg-[#0B3C5D]"
        />
        <MiniStat
          icon={<Trophy size={14} />}
          label="Top score"
          value={fmtPct(stats?.top_pct ?? null)}
          accent="bg-[#D4AF37]"
        />
        <MiniStat
          icon={<BarChart3 size={14} />}
          label="Lowest"
          value={fmtPct(stats?.low_pct ?? null)}
          accent="bg-rose-500"
        />
        <MiniStat
          icon={<ShieldCheck size={14} />}
          label="Pass rate"
          value={fmtPct(stats?.pass_pct ?? null)}
          accent="bg-emerald-500"
        />
        <MiniStat
          icon={<Users size={14} />}
          label="Students"
          value={(stats?.student_count ?? 0).toString()}
          accent="bg-indigo-500"
        />
      </div>

      {/* Toppers */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
          <Trophy size={13} className="text-[#D4AF37]" />
          Toppers
        </p>
        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <RefreshCw size={16} className="animate-spin inline-block mr-2" />
            Loading toppers…
          </div>
        ) : toppers.length === 0 ? (
          <Card className="py-6 text-center">
            <GraduationCap size={20} className="mx-auto text-slate-300 mb-1" />
            <p className="text-xs text-slate-400 font-bold">
              No marks entered for this exam yet.
            </p>
          </Card>
        ) : (
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {toppers.map((t, i) => (
              <li
                key={t.studentId}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white
                  ${i === 0 ? "bg-[#D4AF37]" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-200 text-slate-600"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{t.studentName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {t.rollNumber ? `#${t.rollNumber}` : "—"}
                    {t.batchName ? ` · ${t.batchName}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#0B3C5D] tabular-nums">
                    {t.percentage.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold tabular-nums">
                    {t.marksObtained}/{t.totalMarks}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Small presentational helpers
// ──────────────────────────────────────────────────────────────────

function CreatorChip({
  name,
  role,
}: {
  name: string | null;
  role: CreatorRole | null;
}) {
  if (!name && !role) {
    return (
      <span className="text-[10px] font-bold text-slate-400 uppercase">unknown</span>
    );
  }
  const tone =
    role === "admin"
      ? "bg-[#0B3C5D]/10 text-[#0B3C5D] border-[#0B3C5D]/20"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${tone}`}>
      {role === "admin" ? <ShieldCheck size={10} /> : <GraduationCap size={10} />}
      {name ?? role}
    </span>
  );
}

function Pill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "gold" | "slate";
}) {
  const tones: Record<string, string> = {
    blue: "bg-[#0B3C5D]/5 text-[#0B3C5D]",
    gold: "bg-[#D4AF37]/10 text-[#a08221]",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className={`px-2.5 py-1 rounded-lg ${tones[tone]} text-center min-w-[52px]`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xs font-black tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg ${accent} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-black text-slate-800 tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `${Number(Number(v).toFixed(2))}%`;
}

