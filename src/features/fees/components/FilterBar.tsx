"use client";

import { useEffect, useMemo } from "react";
import { Building2, BookOpen, Layers, Search, X } from "lucide-react";
import type { FeeFilters, PaymentMethod, PaymentStatus } from "../types";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../types";
import { useFeeBatches, useFeeCampuses, useFeeCourses } from "../hooks";
import { Card, fieldCls, Label } from "./ui";

interface Props {
  value: FeeFilters;
  onChange: (next: FeeFilters) => void;
  /** Which filter inputs to expose — keeps the bar tight per tab. */
  show?: {
    search?: boolean;
    campus?: boolean;
    course?: boolean;
    batch?: boolean;
    status?: boolean;
    dateRange?: boolean;
    method?: boolean;
  };
}

const DEFAULT_SHOW = {
  search: true, campus: true, course: true, batch: true,
  status: false, dateRange: false, method: false,
};

export function FilterBar({ value, onChange, show }: Props) {
  const enabled = useMemo(() => ({ ...DEFAULT_SHOW, ...(show ?? {}) }), [show]);

  const { data: campuses = [] } = useFeeCampuses();
  const { data: courses = [] } = useFeeCourses(value.campus_id);
  const { data: batches = [] } = useFeeBatches(value.course_id, value.campus_id);

  // Clear stale ids if the loaded list no longer contains them.
  useEffect(() => {
    if (value.course_id && courses.length && !courses.some((c) => c.id === value.course_id)) {
      onChange({ ...value, course_id: "", batch_id: "" });
    }
  }, [courses, value, onChange]);
  useEffect(() => {
    if (value.batch_id && batches.length && !batches.some((b) => b.id === value.batch_id)) {
      onChange({ ...value, batch_id: "" });
    }
  }, [batches, value, onChange]);

  const set = <K extends keyof FeeFilters>(key: K, v: FeeFilters[K]) => {
    const next: FeeFilters = { ...value, [key]: v };
    if (key === "campus_id") { next.course_id = ""; next.batch_id = ""; }
    if (key === "course_id") { next.batch_id = ""; }
    onChange(next);
  };

  const isDirty =
    !!value.search || !!value.campus_id || !!value.course_id || !!value.batch_id ||
    value.status !== "All" || !!value.date_from || !!value.date_to ||
    value.method !== "All";

  const clearAll = () => onChange({
    campus_id: "", course_id: "", batch_id: "",
    status: "All", search: "", date_from: "", date_to: "",
    method: "All",
  });

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-end gap-2.5">
        {enabled.search && (
          <div className="relative flex-1 min-w-[200px]">
            <Label>Search</Label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={value.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Name, admission #, txn ID…"
                className={`${fieldCls} pl-9`}
              />
            </div>
          </div>
        )}

        {enabled.campus && (
          <div className="min-w-[150px]">
            <Label>
              <span className="inline-flex items-center gap-1">
                <Building2 size={11} /> Campus
              </span>
            </Label>
            <select
              value={value.campus_id}
              onChange={(e) => set("campus_id", e.target.value)}
              className={fieldCls}
            >
              <option value="">All campuses</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {enabled.course && (
          <div className="min-w-[150px]">
            <Label>
              <span className="inline-flex items-center gap-1">
                <BookOpen size={11} /> Course
              </span>
            </Label>
            <select
              value={value.course_id}
              onChange={(e) => set("course_id", e.target.value)}
              className={fieldCls}
            >
              <option value="">All courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {enabled.batch && (
          <div className="min-w-[150px]">
            <Label>
              <span className="inline-flex items-center gap-1">
                <Layers size={11} /> Batch
              </span>
            </Label>
            <select
              value={value.batch_id}
              onChange={(e) => set("batch_id", e.target.value)}
              disabled={!value.course_id && !value.campus_id}
              className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">All batches</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {enabled.status && (
          <div className="min-w-[140px]">
            <Label>Status</Label>
            <select
              value={value.status}
              onChange={(e) => set("status", e.target.value as PaymentStatus | "All")}
              className={fieldCls}
            >
              <option value="All">All statuses</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {enabled.method && (
          <div className="min-w-[140px]">
            <Label>Method</Label>
            <select
              value={value.method}
              onChange={(e) => set("method", e.target.value as PaymentMethod | "All")}
              className={fieldCls}
            >
              <option value="All">All methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {enabled.dateRange && (
          <>
            <div>
              <Label>From</Label>
              <input
                type="date"
                value={value.date_from}
                onChange={(e) => set("date_from", e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <Label>To</Label>
              <input
                type="date"
                value={value.date_to}
                onChange={(e) => set("date_to", e.target.value)}
                className={fieldCls}
              />
            </div>
          </>
        )}

        {isDirty && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>
    </Card>
  );
}
