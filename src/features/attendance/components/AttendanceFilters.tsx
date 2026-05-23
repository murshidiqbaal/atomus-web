"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, BookOpen, Layers, BookMarked, CalendarDays, ShieldCheck, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import type { AttendanceFilters as Filters } from "../types";
import { todayISO } from "../types";
import {
  useAttBatches,
  useAttCampuses,
  useAttCourses,
  useAttSubjects,
  useCurrentUser,
  useTeacherRestrictions,
} from "../hooks";
import { Card, fieldCls, Label } from "./ui";

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export function AttendanceFilters({ value, onChange }: Props) {
  const { data: user } = useCurrentUser();
  const teacherCtx = useTeacherRestrictions();
  const isTeacher = teacherCtx.isTeacher;

  const { data: campuses = [], isLoading: campusesLoading } = useAttCampuses();
  const { data: courses = [] } = useAttCourses(value.campus_id);
  const { data: batches = [] } = useAttBatches(value.course_id, value.campus_id);
  const { data: subjects = [] } = useAttSubjects(value.course_id);

  const [showBatch, setShowBatch] = useState(!!value.batch_id);

  const uniqueBatches = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof batches = [];
    for (const b of batches) {
      const norm = b.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(b);
      }
    }
    return list;
  }, [batches]);

  const max = todayISO();

  // If the fetched list no longer contains the currently-selected id (e.g.
  // because the teacher was unassigned from a course since the page was
  // opened), clear it and the children that depend on it.
  useEffect(() => {
    if (value.course_id && courses.length && !courses.some((c) => c.id === value.course_id)) {
      onChange({ ...value, course_id: "", batch_id: "", subject_id: "" });
    }
  }, [courses, value, onChange]);

  useEffect(() => {
    if (value.batch_id && batches.length && !batches.some((b) => b.id === value.batch_id)) {
      onChange({ ...value, batch_id: "" });
    }
  }, [batches, value, onChange]);

  useEffect(() => {
    if (value.subject_id && subjects.length && !subjects.some((s) => s.id === value.subject_id)) {
      onChange({ ...value, subject_id: "" });
    }
  }, [subjects, value, onChange]);

  // Single-campus teachers shouldn't have to "pick a campus" — autoselect it.
  useEffect(() => {
    if (isTeacher && !value.campus_id && campuses.length === 1) {
      onChange({ ...value, campus_id: campuses[0].id });
    }
  }, [isTeacher, campuses, value, onChange]);

  const set = <K extends keyof Filters>(key: K, v: Filters[K]) => {
    const next: Filters = { ...value, [key]: v };
    if (key === "campus_id") {
      next.course_id = "";
      next.batch_id = "";
      next.subject_id = "";
    }
    if (key === "course_id") {
      next.batch_id = "";
      next.subject_id = "";
    }
    if (key === "attendance_date" && typeof v === "string" && v > max) {
      next.attendance_date = max;
    }
    onChange(next);
  };

  return (
    <Card className="p-4 transition-all duration-300 hover:shadow-md border-slate-200">
      {/* Role banner */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
        <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
          {user?.role === "admin" ? (
            <>
              <ShieldCheck size={13} className="text-[#0B3C5D]" />
              <span>Admin · all campuses & subjects</span>
            </>
          ) : user?.role === "teacher" ? (
            <>
              <GraduationCap size={13} className="text-[#D4AF37]" />
              <span>
                {teacherCtx.teacher
                  ? `Teacher · ${teacherCtx.teacher.full_name}`
                  : "Teacher · loading assignments…"}
              </span>
            </>
          ) : (
            <span className="text-slate-400">No role detected</span>
          )}
        </div>
        {isTeacher && teacherCtx.teacher && (
          <p className="text-[11px] font-medium text-slate-400">
            {teacherCtx.teacher.subject_ids.length} subject
            {teacherCtx.teacher.subject_ids.length === 1 ? "" : "s"} ·{" "}
            {teacherCtx.teacher.batch_ids.length} batch
            {teacherCtx.teacher.batch_ids.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      {/* Primary filters: Campus, Course, Subject, Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
              <Building2 size={12} className="text-slate-400" /> Campus
            </span>
          </Label>
          <select
            value={value.campus_id}
            onChange={(e) => set("campus_id", e.target.value)}
            disabled={campusesLoading || (isTeacher && campuses.length <= 1)}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">All Campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
              <BookOpen size={12} className="text-slate-400" /> Course
            </span>
          </Label>
          <select
            value={value.course_id}
            onChange={(e) => set("course_id", e.target.value)}
            className={fieldCls}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
              <BookMarked size={12} className="text-slate-400" /> Subject
            </span>
          </Label>
          <select
            value={value.subject_id}
            onChange={(e) => set("subject_id", e.target.value)}
            className={fieldCls}
          >
            <option value="">All Subjects (Overall)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
              <CalendarDays size={12} className="text-slate-400" /> Date
            </span>
          </Label>
          <input
            type="date"
            value={value.attendance_date}
            max={max}
            onChange={(e) => set("attendance_date", e.target.value)}
            className={fieldCls}
          />
        </div>
      </div>

      {/* Optional Batch section for admin analytics/filtering */}
      {user?.role === "admin" && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
          <div>
            <button
              type="button"
              onClick={() => {
                const nextShow = !showBatch;
                setShowBatch(nextShow);
                if (!nextShow) {
                  set("batch_id", "");
                }
              }}
              className="text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 select-none"
            >
              {showBatch ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Optional Batch Filter (Admin Analytics Only)</span>
            </button>
          </div>

          {showBatch && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
                    <Layers size={12} className="text-slate-400" /> Batch (Optional)
                  </span>
                </Label>
                <select
                  value={value.batch_id}
                  onChange={(e) => set("batch_id", e.target.value)}
                  className={fieldCls}
                >
                  <option value="">All Batches (No Filter)</option>
                  {uniqueBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
