"use client";

import { useEffect } from "react";
import { Building2, BookOpen, Layers, BookMarked, CalendarDays } from "lucide-react";
import type { AttendanceFilters as Filters } from "../types";
import {
  useAttBatches, useAttCampuses, useAttCourses, useAttSubjects,
} from "../hooks";
import { Card, fieldCls, Label } from "./ui";

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export function AttendanceFilters({ value, onChange }: Props) {
  const { data: campuses = [] } = useAttCampuses();
  const { data: courses = [] } = useAttCourses(value.campus_id);
  const { data: batches = [] } = useAttBatches(value.course_id, value.campus_id);
  const { data: subjects = [] } = useAttSubjects(value.course_id);

  // If the parent set IDs that aren't valid in the loaded lists (e.g. they
  // came from URL state pointing at archived rows), clear them so the user
  // sees the proper "Select…" placeholder rather than a stuck label.
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

  const set = <K extends keyof Filters>(key: K, v: Filters[K]) => {
    const next: Filters = { ...value, [key]: v };
    if (key === "campus_id") { next.course_id = ""; next.batch_id = ""; next.subject_id = ""; }
    if (key === "course_id") { next.batch_id = ""; next.subject_id = ""; }
    onChange(next);
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <Label><span className="inline-flex items-center gap-1"><Building2 size={11} /> Campus</span></Label>
          <select
            value={value.campus_id}
            onChange={(e) => set("campus_id", e.target.value)}
            className={fieldCls}
          >
            <option value="">Select campus…</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label><span className="inline-flex items-center gap-1"><BookOpen size={11} /> Course</span></Label>
          <select
            value={value.course_id}
            onChange={(e) => set("course_id", e.target.value)}
            disabled={!value.campus_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">{value.campus_id ? "Select course…" : "Pick campus first"}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label><span className="inline-flex items-center gap-1"><Layers size={11} /> Batch</span></Label>
          <select
            value={value.batch_id}
            onChange={(e) => set("batch_id", e.target.value)}
            disabled={!value.course_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">{value.course_id ? "Select batch…" : "Pick course first"}</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <Label><span className="inline-flex items-center gap-1"><BookMarked size={11} /> Subject</span></Label>
          <select
            value={value.subject_id}
            onChange={(e) => set("subject_id", e.target.value)}
            disabled={!value.course_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">{value.course_id ? "Overall (no subject)" : "Pick course first"}</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <Label><span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Date</span></Label>
          <input
            type="date"
            value={value.attendance_date}
            onChange={(e) => set("attendance_date", e.target.value)}
            className={fieldCls}
          />
        </div>
      </div>
    </Card>
  );
}
