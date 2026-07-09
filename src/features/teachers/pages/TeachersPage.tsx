"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, GraduationCap, RotateCcw, CheckCircle2, AlertCircle, X,
  Users, Building2, Sparkles,
} from "lucide-react";
import { Teacher } from "../types";
import {
  useTeachers, useTeacherCampuses, useTeacherCourses, useTeacherCoursesByCampus,
  useTeacherSubjects, useTeacherBatches, useTeacherBatchesByCampus,
  useToggleTeacherStatus, useDeleteTeacher, useResetTeacherPassword,
} from "../hooks";
import TeacherRow from "../components/TeacherRow";
import TeacherCard from "../components/TeacherCard";
import TeacherModal from "../components/TeacherModal";

const PAGE_SIZE = 12;

interface Filters {
  search: string;
  status: "all" | Teacher["account_status"];
  campus_id: string;
  course_id: string;
  subject_id: string;
  batch_id: string;
}

function StatCard({ icon, label, value, sub, tone = "blue" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "gold" | "violet";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    gold: "bg-[#D4AF37]/15 text-[#D4AF37]",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <div className={`w-9 h-9 ${tones[tone]} rounded-xl flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-[#0B3C5D] mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export default function TeachersPage() {
  const { data: teachers = [], isLoading } = useTeachers();
  const { data: campuses = [] }    = useTeacherCampuses();
  const { data: allCourses = [] }  = useTeacherCourses();
  const { data: subjects = [] }    = useTeacherSubjects();
  const { data: allBatches = [] }  = useTeacherBatches();
  const toggleStatus  = useToggleTeacherStatus();
  const deleteTeacher = useDeleteTeacher();
  const resetPassword = useResetTeacherPassword();

  const [filters, setFilters] = useState<Filters>({
    search: "", status: "all", campus_id: "", course_id: "", subject_id: "", batch_id: "",
  });
  const [page, setPage] = useState(1);

  // When a campus is picked, narrow courses & batches to that campus.
  const { data: campusCourses = [] } = useTeacherCoursesByCampus(filters.campus_id);
  const { data: campusBatches = [] } = useTeacherBatchesByCampus(filters.campus_id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters((p) => {
      const next = { ...p, [key]: val };
      if (key === "campus_id") {
        next.course_id = ""; next.subject_id = ""; next.batch_id = "";
      }
      if (key === "course_id") { next.subject_id = ""; next.batch_id = ""; }
      return next;
    });
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", status: "all", campus_id: "", course_id: "", subject_id: "", batch_id: "" });
    setPage(1);
  }

  const hasActiveFilters =
    filters.search || filters.status !== "all" ||
    filters.campus_id || filters.course_id || filters.subject_id || filters.batch_id;

  const courseOptions = filters.campus_id ? campusCourses : allCourses;
  const batchOptionsRaw = filters.campus_id ? campusBatches : allBatches;

  const subjectOptions = useMemo(
    () => (filters.course_id ? subjects.filter((s) => s.course_id === filters.course_id) : subjects),
    [subjects, filters.course_id]
  );
  const batchOptions = useMemo(
    () => (filters.course_id ? batchOptionsRaw.filter((b) => b.course_id === filters.course_id) : batchOptionsRaw),
    [batchOptionsRaw, filters.course_id]
  );

  const uniqueBatchOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof batchOptions = [];
    for (const b of batchOptions) {
      const norm = b.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(b);
      }
    }
    return list;
  }, [batchOptions]);

  const selectedBatchName = useMemo(() => {
    if (!filters.batch_id) return null;
    return allBatches.find((b) => b.id === filters.batch_id)?.name;
  }, [filters.batch_id, allBatches]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return teachers.filter((t) => {
      if (filters.status !== "all" && t.account_status !== filters.status) return false;
      if (filters.campus_id && t.campus_id !== filters.campus_id) return false;
      if (filters.course_id && !(t.teacher_courses ?? []).some((c) => c.courses?.id === filters.course_id)) return false;
      if (filters.subject_id && !(t.teacher_subjects ?? []).some((s) => s.subjects?.id === filters.subject_id)) return false;
      if (filters.batch_id) {
        if (selectedBatchName) {
          if (!(t.teacher_batches ?? []).some((b) => b.batches?.name === selectedBatchName)) return false;
        } else {
          if (!(t.teacher_batches ?? []).some((b) => b.batches?.id === filters.batch_id)) return false;
        }
      }

      if (!q) return true;
      return (
        t.full_name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.qualification ?? "").toLowerCase().includes(q) ||
        (t.subject_specialization ?? "").toLowerCase().includes(q) ||
        (t.phone_number ?? "").includes(filters.search)
      );
    });
  }, [teachers, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const campusCounts = new Map<string, { name: string; count: number }>();
    for (const t of teachers) {
      if (!t.campus_id) continue;
      const cur = campusCounts.get(t.campus_id);
      const name = t.campuses?.name ?? "—";
      campusCounts.set(t.campus_id, { name, count: (cur?.count ?? 0) + 1 });
    }
    let topCampus: { name: string; count: number } | null = null;
    for (const v of campusCounts.values()) {
      if (!topCampus || v.count > topCampus.count) topCampus = v;
    }
    const specialists = teachers.filter(
      (t) => (t.subject_specialization?.trim().length ?? 0) > 0,
    ).length;
    return {
      total: teachers.length,
      active: teachers.filter((t) => t.account_status === "Active").length,
      specialists,
      topCampus,
      campusCount: campusCounts.size,
    };
  }, [teachers]);

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(t: Teacher) { setEditing(t); setModalOpen(true); }

  async function handleToggle(t: Teacher) {
    const next = t.account_status === "Active" ? "Disabled" : "Active";
    try {
      await toggleStatus.mutateAsync({ id: t.id, status: next });
      notify("success", `${t.full_name} is now ${next}`);
    } catch (e: any) { notify("error", e?.message ?? "Failed"); }
  }

  async function handleReset(t: Teacher) {
    if (!confirm(`Send password reset email to ${t.email}?`)) return;
    const ok = await resetPassword.mutateAsync(t.email);
    notify(ok ? "success" : "error", ok ? `Reset link sent to ${t.email}` : "Reset failed");
  }

  async function handleDelete(t: Teacher) {
    if (!confirm(`Delete ${t.full_name}? This removes their assignments.`)) return;
    try {
      await deleteTeacher.mutateAsync(t.id);
      notify("success", "Teacher removed");
    } catch (e: any) { notify("error", e?.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-[80] max-w-sm px-4 py-3 rounded-2xl shadow-xl border flex items-start gap-2 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <p className="text-sm font-bold leading-snug">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100 shrink-0"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Teachers</h1>
            <p className="text-xs text-slate-400">{teachers.length} teacher account{teachers.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0B3C5D] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 transition-colors shadow-md shadow-blue-900/20"
        >
          <Plus size={16} />
          Add Teacher
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          tone="blue"
          icon={<Users size={18} />}
          label="Total Teachers"
          value={stats.total}
          sub={`${stats.campusCount} campus${stats.campusCount === 1 ? "" : "es"} assigned`}
        />
        <StatCard
          tone="emerald"
          icon={<GraduationCap size={18} />}
          label="Active"
          value={stats.active}
          sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`}
        />
        <StatCard
          tone="gold"
          icon={<Building2 size={18} />}
          label="Top Campus"
          value={stats.topCampus ? stats.topCampus.name : "—"}
          sub={stats.topCampus ? `${stats.topCampus.count} teacher${stats.topCampus.count === 1 ? "" : "s"}` : "No assignments yet"}
        />
        <StatCard
          tone="violet"
          icon={<Sparkles size={18} />}
          label="Subject Specialists"
          value={stats.specialists}
          sub={`${stats.total - stats.specialists} general`}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, qualification, subject..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
          </div>

          <select
            value={filters.campus_id}
            onChange={(e) => setFilter("campus_id", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">All Campuses</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.course_id}
            onChange={(e) => setFilter("course_id", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">{filters.campus_id ? "All Courses (campus)" : "All Courses"}</option>
            {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.subject_id}
            onChange={(e) => setFilter("subject_id", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select
            value={filters.batch_id}
            onChange={(e) => setFilter("batch_id", e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 bg-white transition-all"
          >
            <option value="">All Batches</option>
            {uniqueBatchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <div className="flex gap-1.5">
            {(["all", "Active", "Pending", "Disabled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter("status", s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.status === s ? "bg-[#0B3C5D] text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-50">
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden sm:block">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">No teachers found</p>
            <p className="text-slate-400 text-sm mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "Add your first teacher to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {["Teacher", "Campus", "Contact / Login", "Subjects", "Batches", "Exp.", "Status", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap
                          ${i === 1 ? "hidden md:table-cell" : ""}
                          ${i === 2 ? "hidden md:table-cell" : ""}
                          ${i === 3 ? "hidden lg:table-cell" : ""}
                          ${i === 4 ? "hidden xl:table-cell" : ""}
                          ${i === 5 ? "hidden md:table-cell" : ""}
                          ${i === 7 ? "text-right" : ""}
                        `}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => (
                    <TeacherRow
                      key={t.id}
                      teacher={t}
                      onEdit={openEdit}
                      onToggleStatus={handleToggle}
                      onResetPassword={handleReset}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${p === page ? "bg-[#0B3C5D] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sm:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />)
          : paginated.map((t) => (
              <TeacherCard key={t.id} teacher={t} onEdit={openEdit} onToggleStatus={handleToggle} onDelete={handleDelete} />
            ))}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center">
            <GraduationCap size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-semibold text-sm">No teachers found</p>
          </div>
        )}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Prev</button>
            <span className="px-4 py-2 text-sm font-bold text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
          </div>
        )}
      </div>

      {modalOpen && (
        <TeacherModal teacher={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />
      )}
    </div>
  );
}
