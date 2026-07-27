import React from "react";
import { X, User, Calendar, BookOpen, AlertTriangle, CheckCircle2, MessageSquare, GraduationCap, Award, BookMarked } from "lucide-react";
import { DailyStudentReport } from "../types";

interface FeedbackDetailModalProps {
  report: DailyStudentReport | null;
  onClose: () => void;
}

export function FeedbackDetailModal({ report, onClose }: FeedbackDetailModalProps) {
  if (!report) return null;

  const isNeedImprovement = report.status === "need_improvement";
  const student = report.students;
  const classReport = report.daily_class_reports;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 text-white flex items-center justify-between ${isNeedImprovement ? "bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700" : "bg-gradient-to-r from-[#0B3C5D] to-slate-800"}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              {isNeedImprovement ? <AlertTriangle size={24} className="text-amber-200" /> : <CheckCircle2 size={24} className="text-emerald-300" />}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Student Daily Report Detail</h2>
              <p className="text-xs text-white/80 font-medium">Submitted by Teacher Evaluation System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Evaluation Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isNeedImprovement ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                  {isNeedImprovement ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  {isNeedImprovement ? "Needs Improvement Flagged" : "Normal / Satisfactory"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date & Session</span>
              <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1 justify-end">
                <Calendar size={14} className="text-slate-400" />
                {classReport?.report_date || report.created_at.substring(0, 10)} ({classReport?.session_type || 'N/A'})
              </p>
            </div>
          </div>

          {/* Student & Class Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Details */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="flex items-center gap-2 text-[#0B3C5D] font-bold text-xs uppercase tracking-wider">
                <User size={16} /> Student Information
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{student?.full_name || "Unknown Student"}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Roll / Adm #: <span className="text-slate-800">{student?.roll_number || student?.admission_number || "N/A"}</span>
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Course: <span className="text-slate-800">{classReport?.courses?.name || "N/A"}</span> | Batch: <span className="text-slate-800">{classReport?.batches?.name || "N/A"}</span>
                </p>
              </div>
            </div>

            {/* Teacher & Subject Details */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
                <GraduationCap size={16} /> Evaluation Context
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{classReport?.teachers?.full_name || "Unknown Teacher"}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Subject: <span className="text-purple-900 font-bold">{classReport?.subjects?.name || "N/A"}</span>
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Teacher Email: {classReport?.teachers?.email || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Ratings Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={14} /> Performance Ratings
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Behavior</span>
                <span className="text-xs font-black text-slate-800 mt-1 block">
                  {report.behavior_rating || "N/A"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Engagement</span>
                <span className="text-xs font-black text-slate-800 mt-1 block">
                  {report.study_engagement || "N/A"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Homework</span>
                <span className="text-xs font-black text-slate-800 mt-1 block">
                  {report.homework_status || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Comment on Student */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1.5">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} /> Teacher Feedback / Remarks on Student
            </h4>
            <p className="text-sm font-medium text-slate-800 whitespace-pre-line leading-relaxed">
              {report.comment ? `"${report.comment}"` : "No specific individual comment provided."}
            </p>
          </div>

          {/* Class Report Summary */}
          {classReport && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookMarked size={14} /> Daily Class Session Summary
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Topics Covered:</span>
                  <p className="text-slate-600 font-medium mt-0.5">{classReport.topics_covered || "N/A"}</p>
                </div>
                {classReport.homework && (
                  <div>
                    <span className="font-bold text-slate-700 block">Homework Assigned:</span>
                    <p className="text-slate-600 font-medium mt-0.5">{classReport.homework}</p>
                  </div>
                )}
                {classReport.general_remarks && (
                  <div>
                    <span className="font-bold text-slate-700 block">General Class Remarks:</span>
                    <p className="text-slate-600 font-medium mt-0.5">{classReport.general_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
