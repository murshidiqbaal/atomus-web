"use client";

import { useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import type { AttendanceFilters as Filters } from "../types";
import { todayISO } from "../types";
import { useAttRecords, useAttStudents, useAttSubjects } from "../hooks";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceGrid } from "../components/AttendanceGrid";
import { ToastStack, useToasts } from "../components/ui";

export default function AttendancePage() {
  const { toasts, add, dismiss } = useToasts();

  const [filters, setFilters] = useState<Filters>({
    campus_id: "",
    course_id: "",
    batch_id: "",
    subject_id: "",
    attendance_date: todayISO(),
  });

  const { data: students = [], isLoading: studentsLoading } = useAttStudents(
    filters.campus_id, filters.course_id, filters.batch_id,
  );
  const { data: records = [], isLoading: recordsLoading } = useAttRecords(
    filters.campus_id,
    filters.course_id,
    filters.batch_id,
    filters.attendance_date,
    filters.subject_id || null,
  );
  const { data: subjects = [] } = useAttSubjects(filters.course_id);

  const isLoading = studentsLoading || recordsLoading;

  const subjectName = useMemo(
    () =>
      filters.subject_id
        ? subjects.find((s) => s.id === filters.subject_id)?.name ?? ""
        : "",
    [subjects, filters.subject_id],
  );

  // Re-mount the grid whenever the filter tuple changes so local edits
  // ("overrides") don't bleed across selections.
  const gridKey = useMemo(
    () =>
      `${filters.campus_id}|${filters.course_id}|${filters.batch_id}|${filters.attendance_date}|${filters.subject_id || "overall"}`,
    [filters],
  );

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
            <CalendarCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Hourly Attendance
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pick campus → course → batch → subject → date, then tap each hour circle. Changes auto-save.
            </p>
          </div>
        </div>

        <AttendanceFilters value={filters} onChange={setFilters} />

        <AttendanceGrid
          key={gridKey}
          filters={filters}
          students={students}
          records={records}
          subjectName={subjectName}
          isLoading={isLoading}
          onToast={add}
        />
      </div>
    </>
  );
}
