"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Users, RotateCcw, Filter, ChevronRight, Download, GraduationCap, Building2, BookOpen, CheckCircle2, Upload, Trash2, X, AlertCircle } from "lucide-react";
import { useStudents, useCourses, useAllBatches, useCampuses, useCoursesByCampus, useDeleteStudent } from "../hooks";
import { StudentWithRelations, StudentFilters } from "../types";
import StudentRow from "../components/StudentRow";
import StudentModal from "../components/StudentModal";
import BulkImportPanel from "../components/BulkImportPanel";

const PAGE_SIZE = 15;

const GENDERS    = ["Male", "Female", "Other"];
const ACQ_STATUS = ["Active", "Inactive", "Graduated", "Dropped"];

const STATUS_BADGE: Record<string, string> = {
  Active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Inactive:  "bg-slate-100 text-slate-500 border-slate-200",
  Graduated: "bg-blue-100 text-blue-700 border-blue-200",
  Dropped:   "bg-rose-100 text-rose-600 border-rose-200",
};

function StatCard({ 
  label, 
  value, 
  sub, 
  trend, 
  icon: Icon,
  color = "blue"
}: { 
  label: string; 
  value: number; 
  sub?: string; 
  trend?: string;
  icon: any;
  color?: "blue" | "gold" | "emerald" | "slate"
}) {
  const colors = {
    blue:    "text-[#0B3C5D] bg-[#0B3C5D]/5 border-[#0B3C5D]/10",
    gold:    "text-[#D4AF37] bg-[#D4AF37]/5 border-[#D4AF37]/10",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    slate:   "text-slate-600 bg-slate-50 border-slate-100",
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${colors[color]} transition-transform group-hover:scale-110 duration-300`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</p>
        <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 font-semibold">{sub}</p>}
      </div>
    </div>
  );
}

function MobileCard({ student, onEdit, onDelete }: { student: StudentWithRelations; onEdit: (s: StudentWithRelations) => void; onDelete: (s: StudentWithRelations) => void }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4 shadow-sm active:scale-[0.98] transition-all">
      <div className="flex items-start gap-4">
        <div className="relative">
          {student.image_url ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(student.image_url!, "_blank");
              }}
              className="cursor-pointer focus:outline-none block"
              title="View full image"
            >
              <img src={student.image_url} alt={student.full_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
            </button>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-xl font-black border border-[#0B3C5D]/10">
              {student.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${student.academic_status === "Active" ? "bg-emerald-500" : "bg-slate-300"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <p className="text-base font-black text-slate-900 truncate tracking-tight">{student.full_name}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-bold uppercase tracking-wider">
            <span className="text-[#0B3C5D]">{student.roll_number}</span>
            <span>·</span>
            <span className="truncate">{student.campuses?.name ?? "No Campus"}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</p>
          <p className="text-xs font-bold text-slate-700 truncate">{student.courses?.name ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider border ${STATUS_BADGE[student.academic_status ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
            {student.academic_status ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button onClick={() => onEdit(student)} className="flex-1 px-4 py-3 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Edit</button>
        <button onClick={() => onDelete(student)} className="px-4 py-3 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors" title="Delete">
          <Trash2 size={16} />
        </button>
        <a href={`/students/${student.id}`} className="flex-1 px-4 py-3 text-xs font-black text-white bg-[#0B3C5D] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#0B3C5D]/20">
          Profile <ChevronRight size={14} />
        </a>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-0 animate-pulse">
      <div className="h-14 bg-slate-50 border-b border-slate-100" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-5 border-b border-slate-50 items-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="h-3 bg-slate-50 rounded w-1/6" />
          </div>
          <div className="h-10 bg-slate-50 rounded w-32" />
          <div className="h-10 bg-slate-50 rounded w-32" />
          <div className="h-10 bg-slate-50 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export default function StudentsPage() {
  const { data: students = [], isLoading } = useStudents();
  const { data: campuses = [] }            = useCampuses();
  const { data: courses = [] }             = useCourses();
  const { data: allBatches = [] }          = useAllBatches();
  const deleteStudent = useDeleteStudent();

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDelete(s: StudentWithRelations) {
    if (!confirm(`Delete ${s.full_name}? This will remove all their records.`)) return;
    try {
      await deleteStudent.mutateAsync(s.id);
      notify("success", "Student removed successfully");
    } catch (e: any) {
      notify("error", e?.message ?? "Delete failed");
    }
  }

  const [filters, setFilters] = useState<StudentFilters>({
    search: "", campus_id: "", course_id: "", batch_id: "", gender: "", academic_status: "", status: "all",
  });
  const [page, setPage]         = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<StudentWithRelations | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // When a campus is picked, fetch only its linked courses (via campus_courses).
  const { data: campusCourses = [] } = useCoursesByCampus(filters.campus_id);

  function setFilter<K extends keyof StudentFilters>(key: K, val: StudentFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "campus_id") { next.course_id = ""; next.batch_id = ""; }
      if (key === "course_id") { next.batch_id = ""; }
      return next;
    });
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", campus_id: "", course_id: "", batch_id: "", gender: "", academic_status: "", status: "all" });
    setPage(1);
  }

  const hasActiveFilters =
    filters.search || filters.campus_id || filters.course_id || filters.batch_id ||
    filters.gender || filters.academic_status || filters.status !== "all";

  const availableCourses = useMemo(
    () => (filters.campus_id ? campusCourses : courses),
    [courses, campusCourses, filters.campus_id],
  );

  const availableBatches = useMemo(
    () => {
      let b = allBatches;
      if (filters.campus_id) b = b.filter(x => x.campus_id === filters.campus_id);
      if (filters.course_id) b = b.filter(x => x.course_id === filters.course_id);
      return b;
    },
    [allBatches, filters.campus_id, filters.course_id]
  );

  const uniqueAvailableBatches = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof availableBatches = [];
    for (const b of availableBatches) {
      const norm = b.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(b);
      }
    }
    return list;
  }, [availableBatches]);

  const selectedBatchName = useMemo(() => {
    if (!filters.batch_id) return null;
    return allBatches.find((b) => b.id === filters.batch_id)?.name;
  }, [filters.batch_id, allBatches]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.academic_status === "Active").length;
    
    // Campus-wise
    const campusCounts: Record<string, number> = {};
    students.forEach(s => {
      const name = s.campuses?.name || "Unassigned";
      campusCounts[name] = (campusCounts[name] || 0) + 1;
    });
    const topCampus = Object.entries(campusCounts).sort((a, b) => b[1] - a[1])[0];

    // Course-wise
    const courseCounts: Record<string, number> = {};
    students.forEach(s => {
      const name = s.courses?.name || "Unassigned";
      courseCounts[name] = (courseCounts[name] || 0) + 1;
    });
    const topCourse = Object.entries(courseCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      active,
      topCampus: topCampus ? { name: topCampus[0], count: topCampus[1] } : null,
      topCourse: topCourse ? { name: topCourse[0], count: topCourse[1] } : null,
    };
  }, [students]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return students.filter((s) => {
      if (q && !s.full_name.toLowerCase().includes(q) && !s.roll_number.toLowerCase().includes(q)) return false;
      if (filters.campus_id && s.campus_id !== filters.campus_id) return false;
      if (filters.course_id && s.course_id !== filters.course_id) return false;
      if (filters.batch_id) {
        if (selectedBatchName) {
          if (s.batches?.name !== selectedBatchName) return false;
        } else {
          if (s.batch_id !== filters.batch_id) return false;
        }
      }
      if (filters.gender && s.gender !== filters.gender) return false;
      if (filters.academic_status && s.academic_status !== filters.academic_status) return false;
      if (filters.status !== "all" && s.academic_status !== filters.status) return false;
      return true;
    });
  }, [students, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (showBulkImport) {
    return (
      <div className="p-4 sm:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BulkImportPanel onBack={() => setShowBulkImport(false)} />
      </div>
    );
  }

  const handleExport = () => {
    if (filtered.length === 0) {
      notify("error", "No student records available to export");
      return;
    }

    const headers = [
      "Roll Number",
      "Admission Number",
      "Student Name",
      "Gender",
      "Date of Birth",
      "Email",
      "Phone Number",
      "Address",
      "Campus",
      "Course",
      "Batch",
      "Joining Date",
      "Academic Status",
      "Attendance Percentage",
      "Performance Status",
      "Parent Name",
      "Parent Phone",
      "Parent Email"
    ];

    const rows = filtered.map(s => [
      s.roll_number || "",
      s.admission_number || "",
      s.full_name || "",
      s.gender || "",
      s.dob || "",
      s.email || "",
      s.phone_number || "",
      s.address || "",
      s.campuses?.name || "",
      s.courses?.name || "",
      s.batches?.name || "",
      s.joining_date || "",
      s.academic_status || "",
      s.attendance_percentage != null ? `${s.attendance_percentage}%` : "",
      s.progress_status || "",
      s.parents?.full_name || "",
      s.parents?.phone_number || "",
      s.parents?.email || ""
    ]);

    // Client-side CSV creation and download
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `students_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("success", `Successfully exported ${filtered.length} student records`);
  };

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(s: StudentWithRelations) { setEditing(s); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] max-w-sm px-6 py-4 rounded-[2rem] shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === "success" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 transition-opacity"><X size={16} /></button>
        </div>
      )}
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="bg-[#0B3C5D] p-4 rounded-[2rem] shadow-2xl shadow-[#0B3C5D]/30 transform hover:scale-105 transition-all duration-500">
              <Users size={28} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-[8px] font-black text-white leading-none">ER</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Student Directory
              <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/20 uppercase tracking-widest font-black">Admin</span>
            </h1>
            <p className="text-sm text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
              <Building2 size={14} className="text-[#D4AF37]" />
              Multi-campus Student Information System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Download size={18} />
            Data Export
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Upload size={18} className="text-[#0B3C5D]" />
            Bulk Student Import
          </button>
          <button
            onClick={openAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0B3C5D] text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Enroll New Student
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Enrollment" 
          value={stats.total} 
          icon={GraduationCap} 
          trend="Institutional" 
          color="blue"
        />
        <StatCard 
          label="Top Campus" 
          value={stats.topCampus?.count || 0} 
          sub={stats.topCampus?.name || "None"}
          icon={Building2} 
          color="gold"
        />
        <StatCard 
          label="Active Scholars" 
          value={stats.active} 
          sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% Engagement`}
          icon={CheckCircle2} 
          color="emerald"
        />
        <StatCard 
          label="Top Course" 
          value={stats.topCourse?.count || 0} 
          sub={stats.topCourse?.name || "None"}
          icon={BookOpen} 
          color="slate"
        />
      </div>

      {/* Main Data Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Advanced Filters Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="flex flex-col xl:flex-row gap-5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or parent..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-medium outline-none focus:border-[#0B3C5D] focus:ring-8 focus:ring-[#0B3C5D]/5 transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Campus Selector */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#D4AF37] transition-colors group">
                <Building2 size={16} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                <select
                  value={filters.campus_id}
                  onChange={(e) => setFilter("campus_id", e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 appearance-none pr-2"
                >
                  <option value="">All Campuses</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Course Selector */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                <BookOpen size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                <select
                  value={filters.course_id}
                  onChange={(e) => setFilter("course_id", e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 appearance-none pr-2"
                >
                  <option value="">All Courses</option>
                  {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Batch Selector */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                <Users size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                <select
                  value={filters.batch_id}
                  onChange={(e) => setFilter("batch_id", e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 appearance-none pr-2"
                >
                  <option value="">All Batches</option>
                  {uniqueAvailableBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                <Filter size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 appearance-none pr-2"
                >
                  <option value="all">Any Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Dropped">Dropped</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-5 py-3 text-rose-600 hover:bg-rose-50 rounded-[1.25rem] text-xs font-black transition-all active:scale-95"
                >
                  <RotateCcw size={16} />
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block flex-1 overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="py-32 text-center animate-in zoom-in-95 duration-500">
              <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                <Search size={40} className="text-slate-200" />
              </div>
              <p className="text-slate-900 font-black text-xl tracking-tight">No match found</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto font-medium">
                Refine your filters or check for typos in the search box.
              </p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="mt-8 text-[#0B3C5D] font-black text-sm hover:underline decoration-2 underline-offset-4">Reset system filters</button>
              )}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {[
                    "Scholar Profile", "Academic ID", "Campus/Institute", "Academic Path", 
                    "Primary Guardian", "Current Status", "Academic Performance", "Progress", "Active", "Manage",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap
                        ${i > 1 && i < 8 ? "hidden xl:table-cell" : ""}
                        ${h.includes("Campus") || h.includes("Path") ? "xl:table-cell" : ""}
                      `}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((s) => (
                  <StudentRow key={s.id} student={s} onEdit={openEdit} onDelete={handleDelete} allBatches={allBatches} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden p-6 space-y-6 bg-slate-50/30 flex-1 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 bg-white rounded-[2rem] animate-pulse border border-slate-100 shadow-sm" />
              ))
            : paginated.map((s) => <MobileCard key={s.id} student={s} onEdit={openEdit} onDelete={handleDelete} />)}
          
          {!isLoading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <Search size={32} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-black">No scholars matching filters</p>
            </div>
          )}
        </div>

        {/* Premium Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Visualizing <span className="text-slate-900">{(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-900 font-black">{filtered.length}</span> Scholars
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              
              <div className="flex gap-2 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <div key={p} className="flex items-center">
                      {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-slate-300 font-black">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-12 h-12 text-xs font-black rounded-2xl transition-all active:scale-90 ${
                          p === page 
                            ? "bg-[#0B3C5D] text-white shadow-xl shadow-[#0B3C5D]/20 scale-110" 
                            : "bg-white border border-slate-100 hover:bg-slate-50 text-slate-600"
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
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#0B3C5D] text-white shadow-xl shadow-[#0B3C5D]/20 hover:bg-[#0B3C5D]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <StudentModal student={editing} onClose={closeModal} />}
    </div>
  );
}
