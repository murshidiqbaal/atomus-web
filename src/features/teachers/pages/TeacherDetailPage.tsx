"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, KeyRound, Power, Pencil, Trash2,
  CheckCircle2, AlertCircle, X, BookOpen, Layers, CalendarDays, GraduationCap,
  Briefcase, MapPin, Eye, EyeOff, Copy, Check, Building2,
} from "lucide-react";
import {
  useTeacher, useDeleteTeacher, useResetTeacherPassword, useToggleTeacherStatus,
  useTeacherRecentAttendance, useTeacherRecentMarks,
} from "../hooks";
import TeacherModal from "../components/TeacherModal";

const STATUS_TONES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Disabled: "bg-rose-100 text-rose-700",
};

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function TeacherDetailPage({ id }: { id: string }) {
  const { data: teacher, isLoading } = useTeacher(id);
  const { data: recentAttendance = [] } = useTeacherRecentAttendance(id, !!teacher);
  const { data: recentMarks = [] }      = useTeacherRecentMarks(id, !!teacher);

  const toggleStatus  = useToggleTeacherStatus();
  const resetPassword = useResetTeacherPassword();
  const deleteTeacher = useDeleteTeacher();

  const [editOpen, setEditOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleToggle() {
    if (!teacher) return;
    const next = teacher.account_status === "Active" ? "Disabled" : "Active";
    try {
      await toggleStatus.mutateAsync({ id: teacher.id, status: next });
      notify("success", `Account is now ${next}`);
    } catch (e: any) { notify("error", e?.message ?? "Update failed"); }
  }

  async function handleReset() {
    if (!teacher) return;
    if (!confirm(`Send password reset email to ${teacher.email}?`)) return;
    const ok = await resetPassword.mutateAsync(teacher.email);
    notify(ok ? "success" : "error", ok ? `Reset link sent to ${teacher.email}` : "Reset failed");
  }

  async function handleDelete() {
    if (!teacher) return;
    if (!confirm(`Delete ${teacher.full_name}?`)) return;
    try {
      await deleteTeacher.mutateAsync(teacher.id);
      window.location.href = "/teachers";
    } catch (e: any) { notify("error", e?.message ?? "Delete failed"); }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto space-y-4">
        <div className="h-8 w-32 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <Link href="/teachers" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#0B3C5D] transition-colors mb-6">
          <ArrowLeft size={14} /> Back to teachers
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertCircle size={28} className="mx-auto text-rose-400 mb-2" />
          <p className="text-sm font-semibold text-slate-600">Teacher not found</p>
        </div>
      </div>
    );
  }

  const courses  = (teacher.teacher_courses  ?? []).map((c) => c.courses).filter(Boolean) as { id: string; name: string }[];
  const subjects = (teacher.teacher_subjects ?? []).map((s) => s.subjects).filter(Boolean) as { id: string; name: string }[];
  const batches  = (teacher.teacher_batches  ?? []).map((b) => b.batches).filter(Boolean) as { id: string; name: string }[];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[80] max-w-sm px-4 py-3 rounded-2xl shadow-xl border flex items-start gap-2 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <p className="text-sm font-bold leading-snug">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto opacity-50 hover:opacity-100 shrink-0"><X size={14} /></button>
        </div>
      )}

      <Link href="/teachers" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#0B3C5D] transition-colors">
        <ArrowLeft size={14} /> Back to teachers
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {teacher.profile_image ? (
            <img src={teacher.profile_image} alt={teacher.full_name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-md shadow-blue-900/15" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/80 text-white text-xl font-black flex items-center justify-center shrink-0 shadow-md shadow-blue-900/15">
              {initials(teacher.full_name)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{teacher.full_name}</h1>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${STATUS_TONES[teacher.account_status] ?? "bg-slate-100 text-slate-500"}`}>
                {teacher.account_status}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-[#D4AF37]">{teacher.qualification ?? "—"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={12} className="text-[#0B3C5D]" />
                <span className="font-bold text-[#0B3C5D]">{teacher.campuses?.name ?? "No campus"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {teacher.email}</span>
              <span className="inline-flex items-center gap-1.5"><Phone size={12} /> {teacher.phone_number ?? "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Briefcase size={12} /> {teacher.experience_years ?? 0}y experience</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> Joined {new Date(teacher.created_at).toLocaleDateString()}</span>
              {teacher.address && <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {teacher.address}</span>}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setActionMenu((v) => !v)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Actions
            </button>
            {actionMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-lg z-20 overflow-hidden">
                <button onClick={() => { setActionMenu(false); setEditOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Pencil size={14} /> Edit Teacher
                </button>
                <button onClick={() => { setActionMenu(false); handleReset(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <KeyRound size={14} /> Reset Password
                </button>
                <button onClick={() => { setActionMenu(false); handleToggle(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Power size={14} /> {teacher.account_status === "Active" ? "Disable Account" : "Enable Account"}
                </button>
                <button onClick={() => { setActionMenu(false); handleDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <BookOpen size={18} className="text-[#D4AF37]" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Courses</p>
              <p className="text-xl font-black text-[#0B3C5D]">{courses.length}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <GraduationCap size={18} className="text-blue-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Subjects</p>
              <p className="text-xl font-black text-[#0B3C5D]">{subjects.length}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Layers size={18} className="text-emerald-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Batches</p>
              <p className="text-xl font-black text-[#0B3C5D]">{batches.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-gradient-to-br from-[#0B3C5D]/5 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-[#D4AF37]" />
              <span className="text-[11px] font-black text-[#0B3C5D] uppercase tracking-widest">Supabase Auth Login</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Use these to sign in to the teacher portal</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Mail size={13} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Email</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{teacher.email}</p>
              </div>
              <button
                onClick={() => copyValue("email", teacher.email)}
                className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-50 rounded-lg transition-colors"
                title="Copy email"
              >
                {copied === "email" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="bg-white border border-[#D4AF37]/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <KeyRound size={13} className="text-[#D4AF37] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Password</p>
                <p className="text-xs italic text-slate-400">Not stored — use reset password to re-issue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AssignmentCard title="Assigned Courses" icon={<BookOpen size={14} />} items={courses} accent="gold" />
        <AssignmentCard title="Assigned Subjects" icon={<GraduationCap size={14} />} items={subjects} accent="blue" />
        <AssignmentCard title="Assigned Batches" icon={<Layers size={14} />} items={batches} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityList
          title="Recent Attendance Updates"
          empty="No attendance updates yet"
          items={recentAttendance.map((a: any) => ({
            primary: a.students?.full_name ?? "—",
            secondary: `${a.students?.roll_number ?? ""} · ${a.batches?.name ?? "—"}`,
            meta: a.attendance_date,
            badge: a.status,
          }))}
        />
        <ActivityList
          title="Recent Marks Updates"
          empty="No marks updates yet"
          items={recentMarks.map((m: any) => ({
            primary: m.students?.full_name ?? "—",
            secondary: `${m.students?.roll_number ?? ""} · ${m.exams?.name ?? "Exam"}`,
            meta: m.created_at ? new Date(m.created_at).toLocaleDateString() : "",
            badge: `${m.marks_obtained ?? 0}/${m.total_marks ?? 0}`,
          }))}
        />
      </div>

      {editOpen && (
        <TeacherModal teacher={teacher} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}

function AssignmentCard({ title, icon, items, accent }: {
  title: string; icon: React.ReactNode;
  items: { id: string; name: string }[];
  accent: "gold" | "blue" | "emerald";
}) {
  const accents: Record<string, string> = {
    gold: "bg-[#D4AF37]/10 text-[#0B3C5D] border-[#D4AF37]/30",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">{icon} {title}</span>
        <span className="ml-auto text-xs font-black text-[#0B3C5D]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4 text-center">None assigned</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <span key={i.id} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${accents[accent]}`}>
              {i.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityList({ title, items, empty }: {
  title: string;
  items: { primary: string; secondary: string; meta: string; badge: string }[];
  empty: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-black text-slate-900 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-6 text-center">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100 -mx-1">
          {items.slice(0, 8).map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{item.primary}</p>
                <p className="text-[10px] text-slate-400 truncate">{item.secondary}</p>
              </div>
              <span className="text-[10px] font-bold text-[#0B3C5D] bg-[#0B3C5D]/8 px-2 py-1 rounded-md whitespace-nowrap">{item.badge}</span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap min-w-0">{item.meta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
