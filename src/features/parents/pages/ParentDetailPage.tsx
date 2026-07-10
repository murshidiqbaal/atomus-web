"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, KeyRound, Power, Pencil, Trash2, Plus, Link2, UserPlus,
  CheckCircle2, AlertCircle, X, BookOpen, Layers, CalendarDays, Loader2, Unlink,
  ChevronRight, ExternalLink, ShieldCheck, GraduationCap, Download
} from "lucide-react";
import {
  useParent, useDeleteParent, useResetParentPassword, useToggleParentStatus, useUnlinkStudent,
} from "../hooks";
import ParentModal from "../components/ParentModal";
import LinkStudentsModal from "../components/LinkStudentsModal";
import StudentModal from "@/features/students/components/StudentModal";
import { LinkedStudent } from "../types";

const STATUS_TONES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

const PROGRESS_TONES: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Good: "bg-blue-100 text-blue-700",
  Average: "bg-slate-100 text-slate-600",
  "Needs Improvement": "bg-amber-100 text-amber-700",
  "At Risk": "bg-rose-100 text-rose-700",
};

function StudentCard({ student, onUnlink, unlinking }: {
  student: LinkedStudent & {
    attendance_percentage?: number | null;
    progress_status?: string | null;
    is_active?: boolean | null;
  };
  onUnlink: (id: string, name: string) => void;
  unlinking: boolean;
}) {
  const att = student.attendance_percentage as number | undefined;
  const progress = student.progress_status as string | undefined;

  return (
    <div className="group bg-white rounded-[2rem] border border-slate-200 p-6 hover:border-[#0B3C5D]/30 hover:shadow-xl transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-xl font-black shrink-0 border border-[#0B3C5D]/10">
          {student.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/students/${student.id}`} className="group/link flex items-center gap-1">
              <p className="text-base font-black text-slate-800 truncate group-hover/link:text-[#0B3C5D] transition-colors">{student.full_name}</p>
              <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover/link:opacity-100 transition-all" />
            </Link>
            <button
              onClick={() => onUnlink(student.id, student.full_name)}
              disabled={unlinking}
              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
              title="Unlink Child"
            >
              <Unlink size={16} />
            </button>
          </div>
          <p className="text-[11px] text-[#0B3C5D] font-black uppercase tracking-widest mt-1 opacity-60">{student.roll_number}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <GraduationCap size={14} />
          </div>
          <span className="truncate">{student.courses?.name ?? "No Course Assigned"}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <ShieldCheck size={14} />
          </div>
          <span className="truncate">{student.batches?.name ?? "No Batch Assigned"}</span>
        </div>
      </div>

      {(att != null || progress) && (
        <div className="mt-6 pt-6 border-t border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Health</span>
            {progress && (
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${PROGRESS_TONES[progress] ?? "bg-slate-100 text-slate-600"}`}>
                {progress}
              </span>
            )}
          </div>
          {att != null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                <span className="uppercase tracking-tight">Attendance Rate</span>
                <span>{Math.round(att)}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${att >= 75 ? "bg-emerald-500" : att >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, att)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParentDetailPage({ id }: { id: string }) {
  const { data: parent, isLoading } = useParent(id);
  const toggleStatus  = useToggleParentStatus();
  const resetPassword = useResetParentPassword();
  const deleteParent  = useDeleteParent();
  const unlinkStudent = useUnlinkStudent();

  const [editOpen,   setEditOpen]   = useState(false);
  const [linkOpen,   setLinkOpen]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  const handleDownloadPhoto = () => {
    if (!parent?.profile_photo_url) return;

    let fileId = parent.profile_photo_drive_id || null;
    if (!fileId) {
      try {
        const u = new URL(parent.profile_photo_url, window.location.origin);
        fileId = u.searchParams.get("id");
      } catch {
        fileId = null;
      }
    }

    if (fileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, "_blank");
    } else {
      const separator = parent.profile_photo_url.includes("?") ? "&" : "?";
      window.open(`${parent.profile_photo_url}${separator}download=true`, "_blank");
    }
  };

  const students = parent?.students ?? [];

  const distinct = useMemo(() => {
    const courses = new Set<string>();
    const batches = new Set<string>();
    students.forEach((s) => {
      s.courses?.name && courses.add(s.courses.name);
      s.batches?.name && batches.add(s.batches.name);
    });
    return { courses: [...courses], batches: [...batches] };
  }, [students]);

  async function handleToggle() {
    if (!parent) return;
    const next = parent.account_status === "Active" ? "Disabled" : "Active";
    try {
      await toggleStatus.mutateAsync({ id: parent.id, status: next });
      notify("success", `Account is now ${next}`);
    } catch (e: any) { notify("error", e?.message ?? "Update failed"); }
  }

  async function handleReset() {
    if (!parent) return;
    if (!confirm(`Send password reset email to ${parent.email}?`)) return;
    const ok = await resetPassword.mutateAsync(parent.email);
    notify(ok ? "success" : "error", ok ? `Reset link sent to ${parent.email}` : "Reset failed");
  }

  async function handleDelete() {
    if (!parent) return;
    if (!confirm(`Delete ${parent.full_name}? Linked students will be unlinked.`)) return;
    try {
      await deleteParent.mutateAsync(parent.id);
      window.location.href = "/parents";
    } catch (e: any) { notify("error", e?.message ?? "Delete failed"); }
  }

  async function handleUnlink(studentId: string, name: string) {
    if (!confirm(`Unlink ${name} from this parent?`)) return;
    try {
      await unlinkStudent.mutateAsync(studentId);
      notify("success", `${name} unlinked`);
    } catch (e: any) { notify("error", e?.message ?? "Unlink failed"); }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto space-y-6">
        <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-44 bg-slate-100 rounded-[2.5rem] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="p-12 max-w-[1200px] mx-auto text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <AlertCircle size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Account Not Found</h2>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-tight mt-2">The parent record you are looking for does not exist.</p>
        <Link href="/parents" className="mt-8 inline-flex items-center gap-2 text-[#0B3C5D] font-black uppercase tracking-widest text-xs hover:underline">
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] max-w-sm px-6 py-4 rounded-[2rem] shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
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

      <div className="flex items-center justify-between">
        <Link href="/parents" className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#0B3C5D] uppercase tracking-[0.2em] transition-colors">
          <ArrowLeft size={16} />
          Back to Directory
        </Link>
        <div className="flex items-center gap-3">
          {parent.profile_photo_url && (
            <button
              onClick={handleDownloadPhoto}
              title="Download Profile Picture directly from Google Drive"
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
            >
              <Download size={18} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
              Download Photo
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setActionMenu((v) => !v)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              Management Actions
              <ChevronRight size={16} className={`transition-transform duration-300 ${actionMenu ? "rotate-90" : ""}`} />
            </button>
            {actionMenu && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-white border border-slate-200 rounded-3xl shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200 p-2">
                <button onClick={() => { setActionMenu(false); setEditOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors">
                  <Pencil size={16} className="text-slate-400" /> Edit Profile
                </button>
                <button onClick={() => { setActionMenu(false); handleReset(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors">
                  <KeyRound size={16} className="text-slate-400" /> Reset Password
                </button>
                <button onClick={() => { setActionMenu(false); handleToggle(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors">
                  <Power size={16} className="text-slate-400" /> {parent.account_status === "Active" ? "Disable Account" : "Enable Account"}
                </button>
                <div className="h-px bg-slate-100 my-2" />
                <button onClick={() => { setActionMenu(false); handleDelete(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors">
                  <Trash2 size={16} /> Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10">
          {parent.profile_photo_url ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const fileId = parent.profile_photo_drive_id;
                if (fileId) {
                  window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
                } else {
                  window.open(parent.profile_photo_url!, "_blank");
                }
              }}
              className="cursor-pointer focus:outline-none block shrink-0"
              title="View image in Google Drive"
            >
              <img
                src={parent.profile_photo_url}
                alt={parent.full_name}
                className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-white ring-1 ring-slate-100 shadow-2xl shadow-blue-900/30 hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/80 text-white text-3xl font-black flex items-center justify-center shrink-0 shadow-2xl shadow-blue-900/30 border-4 border-white ring-1 ring-slate-100">
              {parent.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{parent.full_name}</h1>
              <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${STATUS_TONES[parent.account_status] ?? "bg-slate-100 text-slate-500"}`}>
                {parent.account_status}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#0B3C5D] border border-slate-100">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email Address</p>
                  <p className="text-sm font-bold text-slate-700">{parent.email.toLowerCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#0B3C5D] border border-slate-100">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mobile Phone</p>
                  <p className="text-sm font-bold text-slate-700">{parent.phone_number ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                  <KeyRound size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mb-1">Login Identity</p>
                  <p className="text-sm font-black text-slate-700 font-mono tracking-tight">{parent.email?.toLowerCase() || "—"}</p>
                </div>
              </div>
              {parent.password_hash && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-200">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Password</p>
                    <p className="text-sm font-black text-[#D4AF37] font-mono tracking-tight select-all bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">{parent.password_hash}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-50">
          <div className="text-center group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-[#0B3C5D] transition-colors">Children Linked</p>
            <p className="text-4xl font-black text-[#0B3C5D] tracking-tighter">{students.length}</p>
          </div>
          <div className="text-center group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-[#0B3C5D] transition-colors">Courses Involved</p>
            <p className="text-4xl font-black text-[#0B3C5D] tracking-tighter">{distinct.courses.length}</p>
          </div>
          <div className="text-center group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-[#0B3C5D] transition-colors">Learning Groups</p>
            <p className="text-4xl font-black text-[#0B3C5D] tracking-tighter">{distinct.batches.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 p-12 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic Connections</h2>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-tight">Active students managed by this account</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLinkOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 border-2 border-[#0B3C5D]/10 text-[#0B3C5D] rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/5 transition-all active:scale-95"
            >
              <Link2 size={18} /> Link Existing Student
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#0B3C5D] text-white rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95"
            >
              <UserPlus size={18} /> Enroll New Child
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Plus size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-800">No linked children</h3>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-tight mt-2 max-w-xs mx-auto leading-relaxed">
              Use the buttons above to connect an existing student or create a new profile for this parent.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s as any}
                onUnlink={handleUnlink}
                unlinking={unlinkStudent.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <ParentModal parent={parent} onClose={() => setEditOpen(false)} />
      )}

      {linkOpen && (
        <LinkStudentsModal
          parentId={parent.id}
          parentName={parent.full_name}
          onClose={() => setLinkOpen(false)}
          onLinked={(n) => notify("success", `${n} student${n === 1 ? "" : "s"} linked`)}
        />
      )}

      {createOpen && (
        <StudentModal
          student={null} // Correctly pass null for new student
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
