import React from "react";
import { Eye, AlertTriangle, CheckCircle2, Trash2, Calendar, User, MessageSquare } from "lucide-react";
import { DailyStudentReport } from "../types";

interface FeedbackTableProps {
  reports: DailyStudentReport[];
  loading: boolean;
  onViewReport: (report: DailyStudentReport) => void;
  onDeleteReport: (id: string) => void;
}

export function FeedbackTable({
  reports,
  loading,
  onViewReport,
  onDeleteReport,
}: FeedbackTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <MessageSquare size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">No Student Reports Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            No feedback entries match your current search and filter criteria. Try resetting filters or choosing a different date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-4 px-6">Student</th>
              <th className="py-4 px-6">Teacher & Subject</th>
              <th className="py-4 px-6">Class / Batch</th>
              <th className="py-4 px-6">Date & Session</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6">Ratings</th>
              <th className="py-4 px-6">Teacher Remarks</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {reports.map((report) => {
              const isNeedImprovement = report.status === "need_improvement";
              const student = report.students;
              const classReport = report.daily_class_reports;

              return (
                <tr
                  key={report.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onViewReport(report)}
                >
                  {/* Student */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0B3C5D]/10 text-[#0B3C5D] font-black flex items-center justify-center shrink-0 border border-[#0B3C5D]/20">
                        {student?.full_name ? student.full_name.charAt(0).toUpperCase() : <User size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm group-hover:text-[#0B3C5D] transition-colors">
                          {student?.full_name || "Unknown Student"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          Roll: {student?.roll_number || student?.admission_number || "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Teacher & Subject */}
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-bold text-slate-800">
                        {classReport?.teachers?.full_name || "Unknown Teacher"}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold rounded-md">
                        {classReport?.subjects?.name || "Subject N/A"}
                      </span>
                    </div>
                  </td>

                  {/* Class / Batch */}
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {classReport?.courses?.name || "Course N/A"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {classReport?.batches?.name ? `Batch: ${classReport.batches.name}` : "All Batches"}
                      </p>
                    </div>
                  </td>

                  {/* Date & Session */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Calendar size={13} className="text-slate-400" />
                      {classReport?.report_date || report.created_at.substring(0, 10)}
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize font-medium">
                      {classReport?.session_type || "N/A"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isNeedImprovement
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isNeedImprovement ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      {isNeedImprovement ? "Need Imp." : "Normal"}
                    </span>
                  </td>

                  {/* Ratings */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-slate-600">
                        Behavior: <strong className="text-slate-800">{report.behavior_rating || "N/A"}</strong>
                      </span>
                      <span className="text-slate-600">
                        Engage: <strong className="text-slate-800">{report.study_engagement || "N/A"}</strong>
                      </span>
                    </div>
                  </td>

                  {/* Comment */}
                  <td className="py-4 px-6 max-w-xs">
                    <p className="line-clamp-2 text-slate-600 text-xs italic">
                      {report.comment ? `"${report.comment}"` : <span className="text-slate-300 not-italic">No comment</span>}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewReport(report)}
                        title="View Full Details"
                        className="p-2 text-[#0B3C5D] hover:bg-blue-50 rounded-xl transition-colors font-bold flex items-center gap-1"
                      >
                        <Eye size={16} />
                        <span className="text-xs">Details</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this report?")) {
                            onDeleteReport(report.id);
                          }
                        }}
                        title="Delete Report"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
