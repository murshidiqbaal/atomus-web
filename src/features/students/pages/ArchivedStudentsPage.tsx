"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { 
  Archive, RotateCcw, Search, ChevronLeft, ChevronRight, Building2, BookOpen, 
  Users, CheckCircle2, AlertCircle, Calendar, UserCheck, Phone, Mail, ShieldAlert, Sparkles
} from "lucide-react";
import { useArchivedStudents, useRestoreStudent } from "../hooks";
import { StudentWithRelations } from "../types";

const PAGE_SIZE = 15;

export default function ArchivedStudentsPage() {
  const { data: archivedStudents = [], isLoading } = useArchivedStudents();
  const restoreStudent = useRestoreStudent();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [studentToRestore, setStudentToRestore] = useState<StudentWithRelations | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return archivedStudents;
    const q = search.trim().toLowerCase();
    return archivedStudents.filter((s) => {
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.parents?.full_name?.toLowerCase().includes(q) ||
        s.courses?.name?.toLowerCase().includes(q) ||
        s.batches?.name?.toLowerCase().includes(q) ||
        s.campuses?.name?.toLowerCase().includes(q)
      );
    });
  }, [archivedStudents, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleConfirmRestore() {
    if (!studentToRestore) return;
    try {
      await restoreStudent.mutateAsync(studentToRestore.id);
      notify("success", "Student restored successfully.");
      setStudentToRestore(null);
    } catch (e: any) {
      notify("error", e?.message ?? "Failed to restore student");
    }
  }

  function formatDateTime(isoString?: string | null) {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-[120] max-w-sm px-6 py-4 rounded-[2rem] shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === "success" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 transition-opacity">
            <AlertCircle size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link
            href="/students"
            className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#0B3C5D] hover:border-[#0B3C5D] transition-all active:scale-95 shadow-sm"
            title="Back to Student Directory"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 shadow-sm">
                <Archive size={20} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Archived Scholars
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest font-black">
                  Archive Vault
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400 font-semibold mt-1 flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-600" />
              Preserved historical student records and restore management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="flex items-center gap-2 bg-[#0B3C5D] text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Users size={18} />
            Active Student Directory
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
            <Archive size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Inactive/Archived</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{archivedStudents.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-blue-50 text-[#0B3C5D] border border-blue-100">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Protection Status</p>
            <p className="text-base font-black text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> 100% History Preserved
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <RotateCcw size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restore Availability</p>
            <p className="text-base font-black text-slate-800 mt-0.5">Instant Single-Click Restore</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search archived students by name, admission no, roll no, parent, course, or campus..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Main Table / List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="hidden lg:block overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
              Loading archived scholars...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                <Archive size={28} />
              </div>
              <p className="text-base font-black text-slate-700">No archived scholars found</p>
              <p className="text-xs text-slate-400 font-bold">
                {search ? "Try adjusting your search query." : "All registered students are currently active."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Scholar Profile</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Admission No</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Course / Batch</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Campus</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Parent Guardian</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Archived Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Restore Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((student) => (
                  <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                    {/* Scholar Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {student.image_url ? (
                          <img
                            src={student.image_url}
                            alt={student.full_name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center text-sm font-black border border-amber-200/60 shrink-0">
                            {student.full_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate group-hover:text-amber-900 transition-colors">
                            {student.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-semibold truncate">
                            Roll: {student.roll_number || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Admission Number */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {student.admission_number || student.roll_number || "—"}
                      </span>
                    </td>

                    {/* Course / Batch */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 truncate max-w-[12rem]">{student.courses?.name ?? "—"}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{student.batches?.name ?? "Any Batch"}</span>
                      </div>
                    </td>

                    {/* Campus */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-[#D4AF37]">{student.campuses?.name ?? "—"}</span>
                    </td>

                    {/* Parent */}
                    <td className="px-6 py-4">
                      {student.parents ? (
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{student.parents.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{student.parents.phone_number}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Unlinked</span>
                      )}
                    </td>

                    {/* Archived Date */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDateTime(student.deleted_at)}
                      </span>
                    </td>

                    {/* Restore Action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setStudentToRestore(student)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-95 shadow-sm"
                      >
                        <RotateCcw size={14} className="text-emerald-700" />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View */}
        <div className="lg:hidden p-4 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold">No archived scholars found</div>
          ) : (
            paginated.map((student) => (
              <div key={student.id} className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{student.full_name}</h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Roll: {student.roll_number} · Adm: {student.admission_number || "—"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudentToRestore(student)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-2 border-t border-slate-200/60 text-slate-600">
                  <p><span className="text-slate-400">Course:</span> {student.courses?.name ?? "—"}</p>
                  <p><span className="text-slate-400">Campus:</span> {student.campuses?.name ?? "—"}</p>
                  <p className="col-span-2"><span className="text-slate-400">Archived:</span> {formatDateTime(student.deleted_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Visualizing <span className="text-slate-900">{(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-900 font-black">{filtered.length}</span> Archived Scholars
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-700 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0B3C5D] text-white hover:bg-[#0B3C5D]/90 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {studentToRestore && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Restore Student?</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{studentToRestore.full_name} ({studentToRestore.roll_number})</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              This student will be restored to active status and will immediately reappear in active directories, attendance rosters, marks entry, and Parent/Teacher portals.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToRestore(null)}
                disabled={restoreStudent.isPending}
                className="flex-1 px-5 py-3.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoreStudent.isPending}
                className="flex-1 px-5 py-3.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl transition-all shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {restoreStudent.isPending ? "Restoring..." : "Restore Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
