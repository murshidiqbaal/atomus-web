"use client";

import { useMemo, useState } from "react";
import { Plus, Search, BookMarked, RotateCcw } from "lucide-react";
import { useSubjects, useCourses } from "../hooks";
import { Subject, SubjectFilters } from "../types";
import SubjectRow from "../components/SubjectRow";
import SubjectModal from "../components/SubjectModal";

const PAGE_SIZE = 15;

const CLASS_LEVELS = ["8", "9", "10", "+1", "+2"];
const SUBJECT_TYPES = ["Core", "Theory", "Practical", "Language"];

const TYPE_CFG: Record<string, string> = {
  Core:       "bg-blue-100 text-blue-700",
  Theory:     "bg-violet-100 text-violet-700",
  Practical:  "bg-teal-100 text-teal-700",
  Language:   "bg-amber-100 text-amber-700",
};

const LEVEL_CFG: Record<string, string> = {
  "8":  "bg-slate-100 text-slate-600",
  "9":  "bg-slate-100 text-slate-600",
  "10": "bg-slate-100 text-slate-600",
  "+1": "bg-indigo-100 text-indigo-700",
  "+2": "bg-indigo-100 text-indigo-700",
};

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-[#0B3C5D] mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface MobileCardProps {
  subject: Subject;
  onEdit: (s: Subject) => void;
}

function MobileCard({ subject, onEdit }: MobileCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/8 px-2 py-0.5 rounded-lg">
              {subject.subject_code}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${LEVEL_CFG[subject.class_level] ?? "bg-slate-100 text-slate-600"}`}>
              Class {subject.class_level}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800 mt-1.5">{subject.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subject.courses?.name ?? "—"}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg ${TYPE_CFG[subject.subject_type] ?? ""}`}>
          {subject.subject_type}
        </span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${subject.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {subject.is_active ? "Active" : "Inactive"}
        </span>
        <button
          onClick={() => onEdit(subject)}
          className="text-xs font-bold text-[#0B3C5D] hover:underline"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: courses = [] } = useCourses();

  const [filters, setFilters] = useState<SubjectFilters>({
    search: "",
    course_id: "",
    class_level: "",
    subject_type: "",
    status: "all",
  });
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  function setFilter<K extends keyof SubjectFilters>(key: K, value: SubjectFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", course_id: "", class_level: "", subject_type: "", status: "all" });
    setPage(1);
  }

  const hasActiveFilters =
    filters.search ||
    filters.course_id ||
    filters.class_level ||
    filters.subject_type ||
    filters.status !== "all";

  const filtered = useMemo(() => {
    const s = filters.search.toLowerCase();
    return subjects.filter((sub) => {
      if (s && !sub.name.toLowerCase().includes(s) && !sub.subject_code.toLowerCase().includes(s)) return false;
      if (filters.course_id && sub.course_id !== filters.course_id) return false;
      if (filters.class_level && sub.class_level !== filters.class_level) return false;
      if (filters.subject_type && sub.subject_type !== filters.subject_type) return false;
      if (filters.status === "active" && !sub.is_active) return false;
      if (filters.status === "inactive" && sub.is_active) return false;
      return true;
    });
  }, [subjects, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: subjects.length,
    active: subjects.filter((s) => s.is_active).length,
    inactive: subjects.filter((s) => !s.is_active).length,
    core: subjects.filter((s) => s.subject_type === "Core").length,
  }), [subjects]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Subjects</h1>
            <p className="text-xs text-slate-400">{subjects.length} total subjects</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0B3C5D] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 transition-colors"
        >
          <Plus size={16} />
          Add Subject
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`} />
        <StatCard label="Inactive" value={stats.inactive} />
        <StatCard label="Core Subjects" value={stats.core} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or code..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
          </div>

          {/* Course */}
          <select
            value={filters.course_id}
            onChange={(e) => setFilter("course_id", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Subject Type */}
          <select
            value={filters.subject_type}
            onChange={(e) => setFilter("subject_type", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">All Types</option>
            {SUBJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value as SubjectFilters["status"])}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden sm:block">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">No subjects found</p>
            <p className="text-slate-400 text-sm mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "Add your first subject"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Course</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Class</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((subject) => (
                    <SubjectRow key={subject.id} subject={subject} onEdit={openEdit} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                          p === page
                            ? "bg-[#0B3C5D] text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-semibold">No subjects found</div>
        ) : (
          paginated.map((subject) => (
            <MobileCard key={subject.id} subject={subject} onEdit={openEdit} />
          ))
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm font-bold text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && <SubjectModal subject={editing} onClose={closeModal} />}
    </div>
  );
}
