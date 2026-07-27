'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MessageSquare, Download, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { DailyStudentReport, FeedbackFilters as FiltersType, FeedbackStats as StatsType } from "../types";
import { feedbackService } from "../services/feedback_service";
import { FeedbackStats } from "../components/FeedbackStats";
import { FeedbackFilters } from "../components/FeedbackFilters";
import { FeedbackTable } from "../components/FeedbackTable";
import { FeedbackDetailModal } from "../components/FeedbackDetailModal";

const INITIAL_FILTERS: FiltersType = {
  search: "",
  status: "All",
  behaviorRating: "All",
  studyEngagement: "All",
  homeworkStatus: "All",
  courseId: "All",
  batchId: "All",
  startDate: "",
  endDate: "",
};

export function FeedbacksPage() {
  const [reports, setReports] = useState<DailyStudentReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; course_id: string }[]>([]);

  // Filters State
  const [filters, setFilters] = useState<FiltersType>(INITIAL_FILTERS);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"all" | "flagged">("all");

  // Selected report for detail modal
  const [selectedReport, setSelectedReport] = useState<DailyStudentReport | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsData, lookups] = await Promise.all([
        feedbackService.getDailyStudentReports(filters),
        feedbackService.getLookups(),
      ]);
      setReports(reportsData);
      setCourses(lookups.courses);
      setBatches(lookups.batches);
    } catch (err: any) {
      console.error("Failed to load feedback reports:", err);
      setError(err.message || "Failed to load feedback reports from database.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Stats
  const stats: StatsType = useMemo(() => {
    const total = reports.length;
    const needImprovement = reports.filter((r) => r.status === "need_improvement").length;
    const normal = total - needImprovement;
    const highEngagement = reports.filter((r) => r.study_engagement === "Active").length;
    const homeworkCompleted = reports.filter((r) => r.homework_status === "Completed").length;

    return { total, needImprovement, normal, highEngagement, homeworkCompleted };
  }, [reports]);

  // Tab Filtering
  const displayedReports = useMemo(() => {
    if (activeTab === "flagged") {
      return reports.filter((r) => r.status === "need_improvement");
    }
    return reports;
  }, [reports, activeTab]);

  // Pagination Math
  const totalPages = Math.ceil(displayedReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedReports.slice(start, start + itemsPerPage);
  }, [displayedReports, currentPage]);

  const handleFilterChange = (key: keyof FiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await feedbackService.deleteDailyStudentReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (err: any) {
      alert("Failed to delete report: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (displayedReports.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Admission/Roll No",
      "Teacher",
      "Subject",
      "Course",
      "Batch",
      "Date",
      "Session",
      "Status",
      "Behavior Rating",
      "Study Engagement",
      "Homework Status",
      "Teacher Comment",
    ];

    const rows = displayedReports.map((r) => [
      `"${r.students?.full_name || ""}"`,
      `"${r.students?.roll_number || r.students?.admission_number || ""}"`,
      `"${r.daily_class_reports?.teachers?.full_name || ""}"`,
      `"${r.daily_class_reports?.subjects?.name || ""}"`,
      `"${r.daily_class_reports?.courses?.name || ""}"`,
      `"${r.daily_class_reports?.batches?.name || ""}"`,
      `"${r.daily_class_reports?.report_date || r.created_at.substring(0, 10)}"`,
      `"${r.daily_class_reports?.session_type || ""}"`,
      `"${r.status}"`,
      `"${r.behavior_rating || ""}"`,
      `"${r.study_engagement || ""}"`,
      `"${r.homework_status || ""}"`,
      `"${(r.comment || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_feedbacks_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-[#0B3C5D] rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-md shadow-[#0B3C5D]/20">
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Student Feedbacks & Reports</h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Overview of all teacher-submitted daily student evaluations, behavior ratings, and academic comments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-[#0B3C5D] hover:bg-[#082d47] text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-[#0B3C5D]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-medium">
          <AlertCircle size={20} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats Cards */}
      <FeedbackStats stats={stats} loading={loading} />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => {
            setActiveTab("all");
            setCurrentPage(1);
          }}
          className={`pb-3 transition-colors relative ${
            activeTab === "all"
              ? "text-[#0B3C5D] border-b-2 border-[#0B3C5D]"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          All Reports ({stats.total})
        </button>

        <button
          onClick={() => {
            setActiveTab("flagged");
            setCurrentPage(1);
          }}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === "flagged"
              ? "text-rose-700 border-b-2 border-rose-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span>Flagged: Need Improvement</span>
          <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full font-black">
            {stats.needImprovement}
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <FeedbackFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        courses={courses}
        batches={batches}
      />

      {/* Reports Data Table */}
      <FeedbackTable
        reports={paginatedReports}
        loading={loading}
        onViewReport={(report) => setSelectedReport(report)}
        onDeleteReport={handleDeleteReport}
      />

      {/* Pagination Bar */}
      {!loading && displayedReports.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</strong> to{" "}
            <strong className="text-slate-800">
              {Math.min(currentPage * itemsPerPage, displayedReports.length)}
            </strong>{" "}
            of <strong className="text-slate-800">{displayedReports.length}</strong> total evaluations
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
