"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, UserCircle, BookOpen, CalendarCheck, FileSpreadsheet, CreditCard, Mail, Phone, MapPin, Calendar, Hash, GraduationCap, ShieldCheck } from "lucide-react";
import { useStudent, useStudentAttendance, useStudentMarks, useSubjectsByCourse } from "../hooks";
import { AttendanceRecord, MarksRecord, StudentWithRelations } from "../types";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import StudentModal from "../components/StudentModal";

type Tab = "overview" | "subjects" | "attendance" | "marks" | "fees";

const TAB_CONFIG: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: "overview",    label: "Overview",    icon: UserCircle },
  { id: "subjects",    label: "Subjects",    icon: BookOpen },
  { id: "attendance",  label: "Attendance",  icon: CalendarCheck },
  { id: "marks",       label: "Marks",       icon: FileSpreadsheet },
  { id: "fees",        label: "Fees",        icon: CreditCard },
];

const ATTN_CFG: Record<string, { badge: string; dot: string }> = {
  Present:  { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Absent:   { badge: "bg-rose-100 text-rose-600",       dot: "bg-rose-500" },
  Late:     { badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  Unmarked: { badge: "bg-slate-100 text-slate-500",     dot: "bg-slate-400" },
};

const TYPE_CFG: Record<string, string> = {
  Core:      "bg-blue-100 text-blue-700",
  Theory:    "bg-violet-100 text-violet-700",
  Practical: "bg-teal-100 text-teal-700",
  Language:  "bg-amber-100 text-amber-700",
};

function getGrade(pct: number): { label: string; badge: string } {
  if (pct >= 90) return { label: "Excellent",         badge: "bg-emerald-100 text-emerald-700" };
  if (pct >= 75) return { label: "Good",              badge: "bg-blue-100 text-blue-700" };
  if (pct >= 50) return { label: "Average",           badge: "bg-amber-100 text-amber-700" };
  return          { label: "Needs Improvement",       badge: "bg-rose-100 text-rose-600" };
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-4 py-3 group">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0B3C5D]/5 group-hover:text-[#0B3C5D] transition-colors">
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-sm text-slate-800 font-bold truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = "text-[#0B3C5D]" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 text-center shadow-sm hover:shadow-md transition-all">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-2 tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-tight">{sub}</p>}
    </div>
  );
}

export default function StudentDetailPage({ id }: { id: string }) {
  const { data: student, isLoading } = useStudent(id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen]   = useState(false);

  const { data: attendance = [] } = useStudentAttendance(id, activeTab === "attendance");
  const { data: marks = [] }      = useStudentMarks(id, activeTab === "marks");
  const { data: subjects = [] }   = useSubjectsByCourse(student?.course_id ?? "", activeTab === "subjects");

  const { data: fees = [] } = useQuery({
    queryKey: ["student-fees", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fees")
        .select("*")
        .eq("student_id", id)
        .order("due_date", { ascending: false });
      return data ?? [];
    },
    enabled: activeTab === "fees",
    staleTime: 30_000,
  });

  const attendanceStats = useMemo(() => {
    const total   = attendance.length;
    if (!total) return { pct: null, present: 0, absent: 0, late: 0, total: 0 };
    const present = attendance.filter((a: AttendanceRecord) => a.status === "Present").length;
    const absent  = attendance.filter((a: AttendanceRecord) => a.status === "Absent").length;
    const late    = attendance.filter((a: AttendanceRecord) => a.status === "Late").length;
    return { pct: Math.round(((present + late) / total) * 100), present, absent, late, total };
  }, [attendance]);

  const marksStats = useMemo(() => {
    if (!marks.length) return { avg: null, high: null, low: null };
    const pcts = marks.map((m: MarksRecord) => {
      const total = m.exams?.total_marks ?? m.total_marks ?? 100;
      return total ? (m.marks_obtained / total) * 100 : 0;
    });
    return {
      avg:  Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      high: Math.round(Math.max(...pcts)),
      low:  Math.round(Math.min(...pcts)),
    };
  }, [marks]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-44 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 text-center">
        <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <UserCircle size={32} className="text-slate-300" />
        </div>
        <p className="text-slate-600 font-black text-lg">Student profile not found</p>
        <Link href="/students" className="mt-4 text-sm text-[#0B3C5D] hover:underline font-black inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-[#0B3C5D] uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Students
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3C5D] text-white rounded-xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Pencil size={14} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="relative shrink-0">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-white shadow-xl ring-1 ring-slate-100"
              />
            ) : (
              <div className="w-28 h-28 rounded-[2.5rem] bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center text-4xl font-black border-2 border-dashed border-[#0B3C5D]/20">
                {student.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white shadow-md ${student.academic_status === 'Active' ? "bg-emerald-500" : "bg-slate-300"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{student.full_name}</h1>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                student.academic_status === "Active"    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                student.academic_status === "Graduated" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                student.academic_status === "Dropped"   ? "bg-rose-100 text-rose-600 border border-rose-200" :
                "bg-slate-100 text-slate-500 border border-slate-200"
              }`}>
                {student.academic_status || "Unknown Status"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                <Hash size={14} className="text-slate-400" />
                <span className="font-mono text-[#0B3C5D]">{student.roll_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                <GraduationCap size={16} className="text-slate-400" />
                {student.courses?.name ?? "No Course"}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                <ShieldCheck size={16} className="text-slate-400" />
                {student.batches?.name ?? "No Batch"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Attendance Rate"
          value={attendanceStats.pct != null ? `${attendanceStats.pct}%` : "N/A"}
          sub={attendanceStats.total ? `${attendanceStats.total} Sessions Logged` : "No Records"}
          color={attendanceStats.pct != null
            ? attendanceStats.pct >= 75 ? "text-emerald-600" : attendanceStats.pct >= 50 ? "text-amber-600" : "text-rose-600"
            : "text-slate-400"
          }
        />
        <StatCard
          label="Average Score"
          value={marksStats.avg != null ? `${marksStats.avg}%` : "N/A"}
          sub={marks.length ? `${marks.length} Exam Records` : "No Exams"}
        />
        <StatCard
          label="Enrolled Subjects"
          value={subjects.length || "0"}
          sub={`Course Curriculum`}
        />
      </div>

      {/* Tabbed Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/30 scrollbar-none">
          {TAB_CONFIG.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2.5 px-8 py-5 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-4 transition-all ${
                activeTab === tid
                  ? "border-[#0B3C5D] text-[#0B3C5D] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-10">
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Personal */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-[#0B3C5D] rounded-full" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Student Identity</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <InfoRow icon={UserCircle} label="Full Name"   value={student.full_name} />
                    <InfoRow icon={Hash}       label="Roll Number" value={student.roll_number} />
                    <InfoRow icon={Calendar}   label="Date of Birth" value={student.dob} />
                    <InfoRow icon={UserCircle} label="Gender"      value={student.gender} />
                  </div>
                </div>

                {/* Academic */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-[#0B3C5D] rounded-full" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Academic Program</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <InfoRow icon={GraduationCap} label="Program/Course" value={student.courses?.name} />
                    <InfoRow icon={ShieldCheck}   label="Current Batch"  value={student.batches?.name} />
                    <InfoRow icon={Calendar}      label="Joining Date"   value={student.joining_date} />
                    <InfoRow icon={ShieldCheck}   label="Admission No."  value={student.admission_number} />
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-[#0B3C5D] rounded-full" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Contact Channels</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <InfoRow icon={Phone}  label="Mobile Number" value={student.phone_number} />
                    <InfoRow icon={Mail}   label="Email Address"  value={student.email} />
                    <InfoRow icon={MapPin} label="Home Address"   value={student.address} />
                  </div>
                </div>

                {/* Parent */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-[#0B3C5D] rounded-full" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Guardian/Parent</h3>
                  </div>
                  {student.parents ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      <InfoRow icon={UserCircle} label="Primary Guardian" value={student.parents.full_name} />
                      <InfoRow icon={Phone}      label="Guardian Phone"   value={student.parents.phone_number} />
                      <InfoRow icon={Mail}       label="Guardian Email"   value={student.parents.email} />
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                      <ShieldCheck className="text-amber-500" size={18} />
                      <p className="text-sm font-bold text-amber-700 tracking-tight">No guardian account linked to this student yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {activeTab === "subjects" && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Curriculum Structure</h3>
                  <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-tight">Assigned via {student.courses?.name}</p>
                </div>
              </div>
              {subjects.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <BookOpen size={40} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 font-black tracking-tight">No subjects defined for this course.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(subjects as any[]).map((sub) => (
                    <div key={sub.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#0B3C5D]/20 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0B3C5D] uppercase tracking-widest mb-1 opacity-60">{sub.subject_code}</p>
                          <p className="text-lg font-black text-slate-900 truncate tracking-tight">{sub.name}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${TYPE_CFG[sub.subject_type] ?? "bg-slate-100 text-slate-500"}`}>
                          {sub.subject_type}
                        </span>
                      </div>
                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Education Level</span>
                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">Class {sub.class_level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {activeTab === "attendance" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {attendanceStats.total > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0B3C5D] rounded-[2rem] p-6 text-white shadow-xl shadow-[#0B3C5D]/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Success Rate</p>
                    <p className="text-3xl font-black mt-1 tracking-tight">{attendanceStats.pct}%</p>
                  </div>
                  <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Present</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1 tracking-tight">{attendanceStats.present}</p>
                  </div>
                  <div className="bg-rose-50 rounded-[2rem] p-6 border border-rose-100">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Absent</p>
                    <p className="text-3xl font-black text-rose-700 mt-1 tracking-tight">{attendanceStats.absent}</p>
                  </div>
                  <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Late Arrival</p>
                    <p className="text-3xl font-black text-amber-700 mt-1 tracking-tight">{attendanceStats.late}</p>
                  </div>
                </div>
              )}

              {attendance.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <CalendarCheck size={40} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 font-black tracking-tight">No attendance records found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status/Marker</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendance.map((a: AttendanceRecord) => (
                        <tr key={a.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-700 font-bold">{a.date}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${ATTN_CFG[a.status]?.badge ?? "bg-slate-100 text-slate-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${ATTN_CFG[a.status]?.dot ?? "bg-slate-400"}`} />
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── MARKS ── */}
          {activeTab === "marks" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {marksStats.avg != null && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <StatCard label="Overall Average" value={`${marksStats.avg}%`} />
                  <StatCard label="Top Performance" value={`${marksStats.high}%`} color="text-emerald-600" />
                  <StatCard label="Lowest Recorded" value={`${marksStats.low}%`}  color="text-rose-600" />
                </div>
              )}

              {marks.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <FileSpreadsheet size={40} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 font-black tracking-tight">No examination results found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Examination Details</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Score</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Observer Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {marks.map((m: MarksRecord) => {
                        const total = m.exams?.total_marks ?? m.total_marks ?? 100;
                        const pct   = total ? Math.round((m.marks_obtained / total) * 100) : 0;
                        const grade = getGrade(pct);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-sm font-black text-slate-800 tracking-tight">{m.exams?.name ?? "Internal Exam"}</p>
                              {m.exams?.exam_date && (
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{m.exams.exam_date}</p>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm font-black text-slate-700 tabular-nums">
                                  {m.marks_obtained}<span className="text-slate-300 mx-0.5">/</span>{total}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${grade.badge} border border-current/10`}>
                                {grade.label}
                              </span>
                            </td>
                            <td className="px-6 py-5 hidden md:table-cell text-xs font-medium text-slate-400 italic">
                              "{m.remarks || "No comments recorded"}"
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── FEES ── */}
          {activeTab === "fees" && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              {fees.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <CreditCard size={40} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 font-black tracking-tight">No financial transactions found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Amount</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(fees as any[]).map((fee) => (
                        <tr key={fee.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5 text-sm text-slate-800 font-black tracking-tight">{fee.description ?? fee.fee_type ?? "Tuition Fee"}</td>
                          <td className="px-6 py-5 text-sm font-black text-slate-900 tabular-nums">
                            {fee.amount != null ? `PKR ${fee.amount.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-current/10 ${
                              fee.status === "Paid"     ? "bg-emerald-50 text-emerald-700" :
                              fee.status === "Overdue"  ? "bg-rose-50 text-rose-600" :
                              fee.status === "Partial"  ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-500"
                            }`}>
                              {fee.status ?? "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-400">{fee.due_date ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <StudentModal student={student} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
