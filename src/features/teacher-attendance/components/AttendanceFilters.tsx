"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import type { AttendanceStatus, TeacherAttendanceFilters } from "../types";
import { EMPTY_FILTERS } from "../types";
import {
  useTaCampuses, useTaCourses, useTaSubjects, useTaTeachers,
} from "../hooks";
import { Card, GhostButton } from "./ui";

const STATUSES: { v: AttendanceStatus | ""; label: string }[] = [
  { v: "", label: "All statuses" },
  { v: "Active", label: "Active" },
  { v: "Completed", label: "Completed" },
  { v: "Missed", label: "Missed" },
];

interface Props {
  value: TeacherAttendanceFilters;
  onChange: (next: TeacherAttendanceFilters) => void;
}

export function AttendanceFilters({ value, onChange }: Props) {
  const { data: campuses = [] } = useTaCampuses();
  const { data: courses = [] } = useTaCourses();
  const { data: subjects = [] } = useTaSubjects();
  const { data: teachers = [] } = useTaTeachers();

  const set = <K extends keyof TeacherAttendanceFilters>(k: K, v: TeacherAttendanceFilters[K]) => {
    onChange({ ...value, [k]: v });
  };

  const hasFilters =
    value.search || value.campus_id || value.course_id || value.subject_id ||
    value.teacher_id || value.status || value.date_from || value.date_to;

  return (
    <Card className="p-4 sticky top-0 z-10">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-[#0B3C5D]/10 text-[#0B3C5D] p-1.5 rounded-lg">
          <Filter size={14} />
        </div>
        <p className="text-sm font-bold text-slate-800">Filters</p>
        {hasFilters && (
          <GhostButton onClick={() => onChange(EMPTY_FILTERS)} className="ml-auto">
            <RotateCcw size={13} />
            Reset
          </GhostButton>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative col-span-1 md:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search teacher, subject, course, campus…"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
          />
        </div>

        <select
          value={value.campus_id}
          onChange={(e) => set("campus_id", e.target.value)}
          className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
        >
          <option value="">All campuses</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={value.course_id}
          onChange={(e) => set("course_id", e.target.value)}
          className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
        >
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={value.subject_id}
          onChange={(e) => set("subject_id", e.target.value)}
          className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          value={value.teacher_id}
          onChange={(e) => set("teacher_id", e.target.value)}
          className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
        >
          <option value="">All teachers</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>

        <select
          value={value.status}
          onChange={(e) => set("status", e.target.value as AttendanceStatus | "")}
          className="px-3 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
        >
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.date_from}
            onChange={(e) => set("date_from", e.target.value)}
            className="flex-1 px-2 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={value.date_to}
            onChange={(e) => set("date_to", e.target.value)}
            className="flex-1 px-2 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
          />
        </div>
      </div>
    </Card>
  );
}
