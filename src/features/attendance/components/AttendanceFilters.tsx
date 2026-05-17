"use client";

import { useEffect } from "react";
import { Building2, BookOpen, Layers, BookMarked, CalendarDays, ShieldCheck, GraduationCap } from "lucide-react";
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

  const max = todayISO();

  // If the fetched list no longer contains the currently-selected id (e.g.
  // because the teacher was unassigned from a course since the page was
  // opened), clear it and the children that depend on it. These effects
  // converge — once the stale id is cleared, the condition fails on the
  // next pass, so no loop.
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
      // Hard-clamp: the date picker's `max` blocks selection in modern
      // browsers, but typed input still needs guarding.
      next.attendance_date = max;
    }
    onChange(next);
  };

  return (
    <Card className="p-4">
      {/* Role banner */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {user?.role === "admin" ? (
            <>
              <ShieldCheck size={13} className="text-[#0B3C5D]" />
              Admin · all campuses & subjects
            </>
          ) : user?.role === "teacher" ? (
            <>
              <GraduationCap size={13} className="text-[#D4AF37]" />
              {teacherCtx.teacher
                ? `Teacher · ${teacherCtx.teacher.full_name}`
                : "Teacher · loading assignments…"}
            </>
          ) : (
            <span className="text-slate-400">No role detected</span>
          )}
        </div>
        {isTeacher && teacherCtx.teacher && (
          <p className="text-[11px] text-slate-400">
            {teacherCtx.teacher.subject_ids.length} subject
            {teacherCtx.teacher.subject_ids.length === 1 ? "" : "s"} ·{" "}
            {teacherCtx.teacher.batch_ids.length} batch
            {teacherCtx.teacher.batch_ids.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <Building2 size={11} /> Campus
            </span>
          </Label>
          <select
            value={value.campus_id}
            onChange={(e) => set("campus_id", e.target.value)}
            disabled={campusesLoading || (isTeacher && campuses.length <= 1)}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select campus…</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <BookOpen size={11} /> Course
            </span>
          </Label>
          <select
            value={value.course_id}
            onChange={(e) => set("course_id", e.target.value)}
            disabled={!value.campus_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">
              {value.campus_id ? "Select course…" : "Pick campus first"}
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <Layers size={11} /> Batch
            </span>
          </Label>
          <select
            value={value.batch_id}
            onChange={(e) => set("batch_id", e.target.value)}
            disabled={!value.course_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">
              {value.course_id ? "Select batch…" : "Pick course first"}
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <BookMarked size={11} /> Subject
            </span>
          </Label>
          <select
            value={value.subject_id}
            onChange={(e) => set("subject_id", e.target.value)}
            disabled={!value.course_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isTeacher ? (
              <option value="">
                {value.course_id ? "Select subject…" : "Pick course first"}
              </option>
            ) : (
              <option value="">
                {value.course_id ? "Overall (no subject)" : "Pick course first"}
              </option>
            )}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} /> Date
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
    </Card>
  );
}
