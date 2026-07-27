import React from "react";
import { Search, Filter, RotateCcw, Calendar, BookOpen, Users } from "lucide-react";
import { FeedbackFilters as FiltersType } from "../types";

interface FeedbackFiltersProps {
  filters: FiltersType;
  onFilterChange: (key: keyof FiltersType, value: string) => void;
  onResetFilters: () => void;
  courses: { id: string; name: string }[];
  batches: { id: string; name: string; course_id: string }[];
}

export function FeedbackFilters({
  filters,
  onFilterChange,
  onResetFilters,
  courses,
  batches,
}: FeedbackFiltersProps) {
  // Filter batches based on selected course if a course is chosen
  const filteredBatches = filters.courseId && filters.courseId !== "All"
    ? batches.filter((b) => b.course_id === filters.courseId)
    : batches;

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "All" ||
    filters.behaviorRating !== "All" ||
    filters.studyEngagement !== "All" ||
    filters.homeworkStatus !== "All" ||
    filters.courseId !== "All" ||
    filters.batchId !== "All" ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search student name, roll #, teacher, subject or comment..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D] transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of Dropdown & Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 pt-2 border-t border-slate-100">
        {/* Status */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          >
            <option value="All">All Statuses</option>
            <option value="normal">Normal</option>
            <option value="need_improvement">Need Improvement</option>
          </select>
        </div>

        {/* Course */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <BookOpen size={12} /> Course
          </label>
          <select
            value={filters.courseId}
            onChange={(e) => {
              onFilterChange("courseId", e.target.value);
              onFilterChange("batchId", "All");
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Batch */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Users size={12} /> Batch
          </label>
          <select
            value={filters.batchId}
            onChange={(e) => onFilterChange("batchId", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          >
            <option value="All">All Batches</option>
            {filteredBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Behavior Rating */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Behavior
          </label>
          <select
            value={filters.behaviorRating}
            onChange={(e) => onFilterChange("behaviorRating", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          >
            <option value="All">All Behavior Ratings</option>
            <option value="Needs Imp.">Needs Improvement</option>
            <option value="Good">Good</option>
            <option value="Excellent">Excellent</option>
            <option value="Average">Average</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        {/* Study Engagement */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Engagement
          </label>
          <select
            value={filters.studyEngagement}
            onChange={(e) => onFilterChange("studyEngagement", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          >
            <option value="All">All Engagement</option>
            <option value="Active">Active</option>
            <option value="Moderate">Moderate</option>
            <option value="Passive">Passive</option>
            <option value="Disengaged">Disengaged</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Calendar size={12} /> From Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Calendar size={12} /> To Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0B3C5D]"
          />
        </div>
      </div>
    </div>
  );
}
