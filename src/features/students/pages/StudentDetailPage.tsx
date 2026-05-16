"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Building2, BookOpen, Users, Calendar, Phone, Mail, MapPin, 
  CheckCircle2, Clock, Award, FileText, Settings, Download, Share2, 
  ArrowUpRight, AlertCircle, TrendingUp, Info, UserCircle
} from "lucide-react";
import { useStudent, useStudentAttendance, useStudentMarks } from "../hooks";
import StudentModal from "../components/StudentModal";
import { AcademicStatus } from "../types";

interface Props {
  id: string;
}

const STATUS_STYLE: Record<AcademicStatus, { bg: string, text: string, icon: any }> = {
  Active:    { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  Inactive:  { bg: "bg-slate-50",   text: "text-slate-500",   icon: Clock },
  Graduated: { bg: "bg-blue-50",    text: "text-blue-700",    icon: Award },
  Dropped:   { bg: "bg-rose-50",    text: "text-rose-700",    icon: AlertCircle },
};

function InfoItem({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | React.ReactNode; sub?: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-[#0B3C5D] group-hover:bg-[#0B3C5D] group-hover:text-white transition-all duration-300">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-sm font-black text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon: any; trend?: string }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group">
      <div className="flex justify-between items-start">
        <div className="p-3 rounded-2xl bg-slate-50 text-[#0B3C5D] group-hover:bg-[#0B3C5D] group-hover:text-white transition-all duration-500">
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
            <TrendingUp size={10} />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{sub}</p>}
      </div>
    </div>
  );
}

export default function StudentDetailPage({ id }: Props) {
  const { data: student, isLoading } = useStudent(id);
  const { data: attendance = [] }     = useStudentAttendance(id, !!student);
  const { data: marks = [] }          = useStudentMarks(id, !!student);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "marks" | "fees">("overview");

  if (isLoading) return <div className="p-8 animate-pulse space-y-8">
    <div className="h-40 bg-slate-100 rounded-[2.5rem]" />
    <div className="grid grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-[2rem]" />)}
    </div>
  </div>;

  if (!student) return <div className="p-20 text-center">
    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
      <Info size={32} className="text-slate-300" />
    </div>
    <p className="text-slate-600 font-black text-lg tracking-tight">Scholar Profile Not Found</p>
    <Link href="/students" className="text-[#0B3C5D] font-black text-sm hover:underline mt-4 inline-block">Return to directory</Link>
  </div>;

  const status = STATUS_STYLE[student.academic_status || "Active"];
  const StatusIcon = status.icon;

  const attendanceRate = student.attendance_percentage ?? 0;
  const avgMarks = marks.length > 0 ? marks.reduce((acc, m) => acc + (m.marks_obtained / (m.exams?.total_marks || 100)), 0) / marks.length * 100 : 0;

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/students" className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#0B3C5D] hover:border-[#0B3C5D] transition-all active:scale-90 shadow-sm group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Scholar Profile</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {student.full_name}
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${status.bg} ${status.text} border-current/20`}>
                {student.academic_status}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm">
            <Share2 size={18} />
            Share
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0B3C5D] text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Settings size={18} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B3C5D]/5 via-transparent to-[#D4AF37]/5 pointer-events-none" />
        <div className="p-8 sm:p-12 flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative">
            <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl transition-transform duration-700 group-hover:scale-105">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0B3C5D]/5 flex items-center justify-center">
                  <UserCircle size={64} className="text-[#0B3C5D]/10" />
                </div>
              )}
            </div>
            <div className={`absolute -bottom-2 -right-2 p-3 rounded-2xl border-4 border-white shadow-xl ${status.bg} ${status.text}`}>
              <StatusIcon size={24} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
              <span className="text-xs font-black text-white bg-[#0B3C5D] px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg shadow-[#0B3C5D]/20">
                Roll ID: {student.roll_number}
              </span>
              <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-[#D4AF37]/10">
                Campus: {student.campuses?.name ?? "N/A"}
              </span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{student.full_name}</h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><BookOpen size={14} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Course Path</p>
                  <p className="text-sm font-black text-slate-700">{student.courses?.name ?? "Unassigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Users size={14} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Class Batch</p>
                  <p className="text-sm font-black text-slate-700">{student.batches?.name ?? "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar size={14} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Enrolled</p>
                  <p className="text-sm font-black text-slate-700">{student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 border-t border-slate-100 flex gap-8">
          {(["overview", "attendance", "marks", "fees"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === tab ? "text-[#0B3C5D]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0B3C5D] rounded-t-full shadow-[0_-4px_12px_rgba(11,60,93,0.3)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Stats & Details */}
        <div className="lg:col-span-1 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard label="Attendance" value={`${Math.round(attendanceRate)}%`} sub="Institutional" icon={CheckCircle2} trend="+2%" />
            <SummaryCard label="Avg Score" value={`${Math.round(avgMarks)}%`} sub="Performance" icon={Award} trend="+5%" />
          </div>

          {/* Core Information Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Scholar Dossier</h3>
              <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Info size={14} /></div>
            </div>
            
            <div className="space-y-4">
              <InfoItem icon={Building2} label="Primary Campus" value={student.campuses?.name ?? "N/A"} sub="Main Branch" />
              <InfoItem icon={Phone} label="Contact" value={student.phone_number ?? "No data"} sub="Direct Line" />
              <InfoItem icon={Mail} label="Email Address" value={student.email ?? "No data"} sub="Official Account" />
              <InfoItem icon={MapPin} label="Residence" value={student.address ?? "No data"} sub="Primary Address" />
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-[#D4AF37]/20 transition-all">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users size={12} />
                  Guardian Liaison
                </p>
                {student.parents ? (
                  <div className="space-y-3">
                    <p className="text-sm font-black text-slate-900">{student.parents.full_name}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                        <Phone size={12} className="text-slate-300" />
                        {student.parents.phone_number}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                        <Mail size={12} className="text-slate-300" />
                        {student.parents.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 font-bold">No guardian linked</p>
                    <button className="text-[10px] font-black text-[#0B3C5D] uppercase mt-2 hover:underline">Link Primary Account</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Tab Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight capitalize">{activeTab} Analytics</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Comprehensive scholar data visualization</p>
              </div>
              <button className="p-3 bg-slate-50 text-slate-400 hover:text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-2xl transition-all">
                <Download size={18} />
              </button>
            </div>
            
            <div className="flex-1 p-8">
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#0B3C5D] to-[#165a8a] text-white shadow-xl shadow-[#0B3C5D]/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 text-white/5 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-1000">
                        <Award size={120} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Current Semester</p>
                        <h4 className="text-xl font-black mb-6">Academic Excellence</h4>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-4xl font-black tracking-tight">Grade A+</p>
                            <p className="text-[11px] font-bold text-white/50 mt-1 uppercase tracking-wider">Top 5% of class</p>
                          </div>
                          <ArrowUpRight size={24} className="text-[#D4AF37]" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8 rounded-[2rem] bg-[#D4AF37]/10 border border-[#D4AF37]/20 group hover:shadow-lg transition-all duration-500">
                      <div className="flex items-center gap-3 text-[#D4AF37] mb-6">
                        <div className="p-2 bg-white rounded-xl shadow-sm"><FileText size={18} /></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Enrollment Details</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Campus</span>
                          <span className="text-sm font-black text-slate-800">{student.campuses?.name ?? "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Joined</span>
                          <span className="text-sm font-black text-slate-800">{student.joining_date ? new Date(student.joining_date).toLocaleDateString() : "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Roll ID</span>
                          <span className="text-sm font-black text-[#0B3C5D]">{student.roll_number}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                    <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Recent Activity Log</h5>
                    <div className="space-y-6">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-4 group">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0B3C5D] group-hover:text-white transition-all duration-300">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 tracking-tight">Monthly assessment completed</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">2 days ago · Scholastic Update</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                  <div className="py-20 text-center">
                    <div className="bg-emerald-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-emerald-500">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="text-slate-600 font-black">Consolidated Attendance Metrics</p>
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">Attendance data for the current session is being visualized below.</p>
                  </div>
                </div>
              )}

              {activeTab === "marks" && (
                <div className="animate-in slide-in-from-right-4 duration-500">
                  <div className="py-20 text-center">
                    <div className="bg-blue-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-blue-500">
                      <Award size={32} />
                    </div>
                    <p className="text-slate-600 font-black">Scholastic Achievement Summary</p>
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">Examination and assessment results overview.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && <StudentModal student={student} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
