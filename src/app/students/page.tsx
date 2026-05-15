"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Eye, Edit2, Trash2, CheckCircle2, XCircle, Users } from "lucide-react";
import { studentRepository } from "@/lib/repositories/student_repository";
import AddStudentModal from "@/components/students/AddStudentModal";

// ── Types ─────────────────────────────────────────────────────
type Student = {
  id: string;
  full_name: string;
  roll_number: string;
  admission_number?: string;
  email?: string;
  phone_number?: string;
  attendance_percentage: number;
  progress_status: string;
  courses?: { name: string };
  batches?: { name: string };
};

type Toast = { id: number; type: "success" | "error"; message: string };

// ── Badge helper ──────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  Excellent:         "bg-emerald-50 text-emerald-700",
  Good:              "bg-blue-50 text-blue-700",
  Average:           "bg-amber-50 text-amber-700",
  "Needs Improvement": "bg-orange-50 text-orange-700",
  "At Risk":         "bg-rose-50 text-rose-700",
};

// ── Toast ─────────────────────────────────────────────────────
function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto
            ${t.type === "success"
              ? "bg-white border-emerald-200 text-emerald-800"
              : "bg-white border-rose-200 text-rose-800"
            }`}
        >
          {t.type === "success"
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : <XCircle size={16} className="text-rose-500 shrink-0" />
          }
          {t.message}
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 opacity-40 hover:opacity-80 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {Array(6).fill(0).map((_, i) => (
        <td key={i} className="py-4 px-5">
          <div className="h-4 bg-slate-100 rounded-md" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents]     = useState<Student[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const toastId = useRef(0);

  // ── Toast helpers
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studentRepository.getStudents();
      setStudents(data as Student[]);
    } catch {
      addToast("error", "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ── Filtered list
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q)
    );
  });

  // ── Handlers
  const handleSuccess = () => {
    addToast("success", "Student added successfully.");
    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student record?")) return;
    try {
      const { error } = await (await import("@/lib/supabase")).supabase
        .from("students").delete().eq("id", id);
      if (error) throw error;
      setStudents((prev) => prev.filter((s) => s.id !== id));
      addToast("success", "Student removed.");
    } catch {
      addToast("error", "Failed to delete student.");
    }
  };

  // ── Render
  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3C5D] tracking-tight">Students</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? "Loading…" : `${students.length} students enrolled`}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#0B3C5D] text-white text-sm font-semibold
                       px-4 py-2.5 rounded-xl hover:bg-[#0B3C5D]/90 active:scale-[0.98]
                       transition-all shadow-md shadow-blue-900/20"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name or roll number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl
                         outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Student", "Roll No.", "Course", "Batch", "Performance", ""].map((h) => (
                    <th
                      key={h}
                      className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users size={22} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">
                          {search ? "No students match your search." : "No students yet. Add one to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50/60 transition-colors">

                      {/* Student info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center
                                       justify-center text-xs font-bold shrink-0"
                          >
                            {student.full_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 leading-tight">
                              {student.full_name}
                            </p>
                            {student.email && (
                              <p className="text-[11px] text-slate-400 leading-tight">{student.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roll number */}
                      <td className="py-3.5 px-5">
                        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {student.roll_number || "—"}
                        </span>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-5 text-sm text-slate-600">
                        {student.courses?.name ?? "—"}
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-5 text-sm text-slate-600">
                        {student.batches?.name ?? "—"}
                      </td>

                      {/* Performance */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            STATUS_STYLE[student.progress_status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.progress_status ?? "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn title="View" icon={<Eye size={15} />} />
                          <ActionBtn title="Edit" icon={<Edit2 size={15} />} />
                          <ActionBtn
                            title="Delete"
                            icon={<Trash2 size={15} />}
                            danger
                            onClick={() => handleDelete(student.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <p className="text-xs text-slate-400 font-medium">
                Showing {filtered.length} of {students.length} students
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AddStudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

// ── Micro action button ───────────────────────────────────────
function ActionBtn({
  icon, title, danger, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          : "text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100"
      }`}
    >
      {icon}
    </button>
  );
}
