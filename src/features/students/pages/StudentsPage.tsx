"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Users, RotateCcw, Filter, ChevronRight, Download } from "lucide-react";
import { useStudents, useCourses, useAllBatches } from "../hooks";
import { StudentWithRelations, StudentFilters } from "../types";
import StudentRow from "../components/StudentRow";
import StudentModal from "../components/StudentModal";

const PAGE_SIZE = 15;

const GENDERS    = ["Male", "Female", "Other"];
const ACQ_STATUS = ["Active", "Inactive", "Graduated", "Dropped"];

const STATUS_BADGE: Record<string, string> = {
  Active:    "bg-emerald-100 text-emerald-700",
  Inactive:  "bg-slate-100 text-slate-500",
  Graduated: "bg-blue-100 text-blue-700",
  Dropped:   "bg-rose-100 text-rose-600",
};

function StatCard({ label, value, sub, trend }: { label: string; value: number; sub?: string; trend?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-[#0B3C5D] mt-2 tracking-tight">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

function MobileCard({ student, onEdit }: { student: StudentWithRelations; onEdit: (s: StudentWithRelations) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-4">
        <div className="relative">
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-lg font-black border border-[#0B3C5D]/10">
              {student.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${student.is_active !== false ? "bg-emerald-500" : "bg-slate-300"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-black text-slate-900 truncate">{student.full_name}</p>
            {student.academic_status && (
              <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${STATUS_BADGE[student.academic_status] ?? "bg-slate-100 text-slate-500"}`}>
                {student.academic_status}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="font-mono font-bold text-[#0B3C5D] bg-[#0B3C5D]/5 px-1.5 py-0.5 rounded-md">{student.roll_number}</span>
            {student.courses?.name && <span>· {student.courses.name}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Batch</p>
          <p className="text-xs font-semibold text-slate-700 truncate">{student.batches?.name ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Attendance</p>
          <p className="text-xs font-semibold text-slate-700">
            {student.attendance_percentage != null ? `${Math.round(student.attendance_percentage)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex -space-x-2">
          {/* Action buttons could go here or more stats */}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(student)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Edit</button>
          <a href={`/students/${student.id}`} className="px-4 py-2 text-xs font-bold text-white bg-[#0B3C5D] rounded-xl flex items-center gap-1.5 shadow-md shadow-[#0B3C5D]/10">
            Profile <ChevronRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-0 animate-pulse">
      <div className="h-12 bg-slate-50 border-b border-slate-100" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-slate-50 items-center">
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="h-3 bg-slate-50 rounded w-1/6" />
          </div>
          <div className="h-8 bg-slate-50 rounded w-24" />
          <div className="h-8 bg-slate-50 rounded w-24" />
          <div className="h-8 bg-slate-50 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export default function StudentsPage() {
  const { data: students = [], isLoading } = useStudents();
  const { data: courses = [] }             = useCourses();
  const { data: allBatches = [] }          = useAllBatches();

  const [filters, setFilters] = useState<StudentFilters>({
    search: "", course_id: "", batch_id: "", gender: "", academic_status: "", status: "all",
  });
  const [page, setPage]         = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<StudentWithRelations | null>(null);

  function setFilter<K extends keyof StudentFilters>(key: K, val: StudentFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", course_id: "", batch_id: "", gender: "", academic_status: "", status: "all" });
    setPage(1);
  }

  const hasActiveFilters =
    filters.search || filters.course_id || filters.batch_id ||
    filters.gender || filters.academic_status || filters.status !== "all";

  const availableBatches = useMemo(
    () => filters.course_id ? allBatches.filter((b) => b.course_id === filters.course_id) : allBatches,
    [allBatches, filters.course_id]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      total:      students.length,
      active:     students.filter((s) => s.academic_status === "Active").length,
      inactive:   students.filter((s) => s.academic_status === "Inactive").length,
      withParent: students.filter((s) => s.parent_id).length,
      newMonth:   students.filter((s) => s.created_at?.startsWith(thisMonth)).length,
    };
  }, [students]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return students.filter((s) => {
      if (q && !s.full_name.toLowerCase().includes(q) && !s.roll_number.toLowerCase().includes(q)) return false;
      if (filters.course_id && s.course_id !== filters.course_id) return false;
      if (filters.batch_id && s.batch_id !== filters.batch_id) return false;
      if (filters.gender && s.gender !== filters.gender) return false;
      if (filters.academic_status && s.academic_status !== filters.academic_status) return false;
      if (filters.status === "active"   && s.academic_status !== "Active") return false;
      if (filters.status === "inactive" && s.academic_status === "Active") return false;
      return true;
    });
  }, [students, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(s: StudentWithRelations) { setEditing(s); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="bg-[#0B3C5D] p-3 rounded-2xl shadow-lg shadow-[#0B3C5D]/20 transform hover:scale-105 transition-transform">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Management</h1>
            <p className="text-sm text-slate-400 font-medium">Manage and monitor {students.length} active enrollments</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95">
            <Download size={16} />
            Export
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Plus size={18} />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Students" value={stats.total} trend="+12% this year" />
        <StatCard label="Active Status"  value={stats.active}     sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`} />
        <StatCard label="Parent Linked"  value={stats.withParent} sub="Accounts auto-linked" />
        <StatCard label="Monthly New"   value={stats.newMonth}   trend="New admissions" />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-4 focus:ring-[#0B3C5D]/5 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                <select
                  value={filters.course_id}
                  onChange={(e) => { setFilter("course_id", e.target.value); setFilter("batch_id", ""); }}
                  className="px-3 py-2 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="w-px h-6 bg-slate-100" />
                <select
                  value={filters.batch_id}
                  onChange={(e) => setFilter("batch_id", e.target.value)}
                  className="px-3 py-2 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">All Batches</option>
                  {availableBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value as StudentFilters["status"])}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
              >
                <option value="all">Every Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-2xl text-sm font-black transition-colors"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-black text-lg">No students matching your search</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto font-medium">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="mt-6 text-[#0B3C5D] font-black text-sm hover:underline">Clear all filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      {[
                        "Student Profile", "Roll", "Academic Path", "Batch Details",
                        "Parent/Guard.", "Status", "Performance", "Progress", "Active", "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap
                            ${h.includes("Path") || h.includes("Batch") ? "hidden lg:table-cell" : ""}
                            ${h.includes("Parent") ? "hidden xl:table-cell" : ""}
                            ${h.includes("Performance") || h.includes("Progress") ? "hidden md:table-cell" : ""}
                          `}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((s) => (
                      <StudentRow key={s.id} student={s} onEdit={openEdit} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-5 bg-slate-50/30 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> students
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-xs font-black rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-all active:scale-95"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1 mx-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .map((p, i, arr) => (
                          <div key={p} className="flex items-center">
                            {i > 0 && arr[i-1] !== p - 1 && <span className="px-1 text-slate-300">...</span>}
                            <button
                              onClick={() => setPage(p)}
                              className={`w-9 h-9 text-xs font-black rounded-xl transition-all active:scale-90 ${
                                p === page ? "bg-[#0B3C5D] text-white shadow-lg shadow-[#0B3C5D]/20" : "hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-xs font-black rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 transition-all active:scale-95"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden p-4 space-y-4 bg-slate-50/30">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
              ))
            : paginated.map((s) => <MobileCard key={s.id} student={s} onEdit={openEdit} />)}
          
          {!isLoading && filtered.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 pb-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 shadow-sm">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <span className="text-xs font-black text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0B3C5D] text-white shadow-lg shadow-[#0B3C5D]/20 disabled:opacity-40">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {modalOpen && <StudentModal student={editing} onClose={closeModal} />}
    </div>
  );
}
