"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarCheck, Trash2, Search, Building2, BookOpen, Layers,
  BookMarked, Calendar, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck,
  PlusCircle, AlertCircle, RefreshCw, X, Check, Eye
} from "lucide-react";
import type { AttendanceFilters as Filters, AttendanceStatus } from "../types";
import { todayISO } from "../types";
import { useAttRecords, useAttStudents, useAttSubjects } from "../hooks";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceGrid } from "../components/AttendanceGrid";
import { ToastStack, useToasts, Card, fieldCls, Label, STATUS_CFG } from "../components/ui";

const LOGS_PAGE_SIZE = 15;

export default function AttendancePage() {
  const { toasts, add: addToast, dismiss } = useToasts();
  const [activeTab, setActiveTab] = useState<"grid" | "directory">("grid");

  // --- Grid Mode State ---
  const [filters, setFilters] = useState<Filters>({
    campus_id: "",
    course_id: "",
    batch_id: "",
    subject_id: "",
    attendance_date: todayISO(),
  });

  const { data: students = [], isLoading: studentsLoading } = useAttStudents(
    filters.campus_id, filters.course_id, filters.batch_id || undefined,
  );
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const { data: records = [], isLoading: recordsLoading } = useAttRecords(
    filters.campus_id,
    filters.course_id,
    filters.batch_id || undefined,
    filters.attendance_date,
    null,
    studentIds,
  );
  const { data: subjects = [] } = useAttSubjects(filters.course_id);

  const isGridLoading = studentsLoading || recordsLoading;

  const subjectName = useMemo(
    () =>
      filters.subject_id
        ? subjects.find((s) => s.id === filters.subject_id)?.name ?? ""
        : "",
    [subjects, filters.subject_id],
  );

  const gridKey = useMemo(
    () =>
      `${filters.campus_id}|${filters.course_id}|${filters.batch_id}|${filters.attendance_date}|${filters.subject_id || "overall"}`,
    [filters],
  );

  // --- Directory Mode State ---
  const [logSearch, setLogSearch] = useState("");
  const [logCampus, setLogCampus] = useState("");
  const [logCourse, setLogCourse] = useState("");
  const [logBatch, setLogBatch] = useState("");
  const [logSubject, setLogSubject] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logDate, setLogDate] = useState("");
  const [logPage, setLogPage] = useState(1);

  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Directory filter options
  const [campuses, setCampuses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjectList, setSubjectList] = useState<any[]>([]);

  // --- Add Manual Entry State ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStudentSearch, setAddStudentSearch] = useState("");
  const [addMatchedStudents, setAddMatchedStudents] = useState<any[]>([]);
  const [addSelectedStudent, setAddSelectedStudent] = useState<any | null>(null);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addDate, setAddDate] = useState(todayISO());
  const [addStatus, setAddStatus] = useState<AttendanceStatus>("Present");
  const [addRemarks, setAddRemarks] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch Directory Baselines
  useEffect(() => {
    async function loadDirectoryBaselines() {
      try {
        const [campusesRes, coursesRes, batchesRes, subjectsRes] = await Promise.all([
          supabase.from("campuses").select("id, name").eq("is_active", true),
          supabase.from("courses").select("id, name").eq("is_active", true),
          supabase.from("batches").select("id, name"),
          supabase.from("subjects").select("id, name").eq("is_active", true),
        ]);
        setCampuses(campusesRes.data ?? []);
        setCourses(coursesRes.data ?? []);
        setBatches(batchesRes.data ?? []);
        setSubjectList(subjectsRes.data ?? []);
      } catch (err) {
        console.error("Error loading directory baseline filters:", err);
      }
    }
    loadDirectoryBaselines();
  }, []);

  // Fetch Attendance Logs (with filters)
  const fetchAttendanceLogs = async () => {
    setIsLogsLoading(true);
    try {
      let q = supabase
        .from("attendance")
        .select(`
          *,
          students:student_id (id, full_name, roll_number),
          campuses:campus_id (id, name),
          courses:course_id (id, name),
          batches:batch_id (id, name),
          subjects:subject_id (id, name)
        `, { count: "exact" });

      if (logCampus) q = q.eq("campus_id", logCampus);
      if (logCourse) q = q.eq("course_id", logCourse);
      if (logBatch) q = q.eq("batch_id", logBatch);
      if (logSubject) q = q.eq("subject_id", logSubject);
      if (logStatus) q = q.eq("status", logStatus);
      if (logDate) q = q.eq("attendance_date", logDate);

      if (logSearch) {
        const { data: matchedStudents } = await supabase
          .from("students")
          .select("id")
          .or(`full_name.ilike.%${logSearch}%,roll_number.ilike.%${logSearch}%`);
        
        const matchedIds = matchedStudents?.map(s => s.id) ?? [];
        if (matchedIds.length > 0) {
          q = q.in("student_id", matchedIds);
        } else {
          setAttendanceLogs([]);
          setTotalLogs(0);
          setIsLogsLoading(false);
          return;
        }
      }

      // Order and pagination
      const start = (logPage - 1) * LOGS_PAGE_SIZE;
      const end = start + (LOGS_PAGE_SIZE - 1);
      q = q
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(start, end);

      const { data, count, error } = await q;
      if (error) throw error;
      setAttendanceLogs(data ?? []);
      setTotalLogs(count ?? 0);
    } catch (err: any) {
      console.error("Error loading logs:", err);
      addToast("error", `Failed to load logs: ${err.message}`);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "directory") {
      fetchAttendanceLogs();
    }
  }, [activeTab, logCampus, logCourse, logBatch, logSubject, logStatus, logDate, logPage]);

  // Debounced execution of logSearch trigger
  useEffect(() => {
    if (activeTab !== "directory") return;
    const timer = setTimeout(() => {
      setLogPage(1);
      fetchAttendanceLogs();
    }, 400);
    return () => clearTimeout(timer);
  }, [logSearch]);

  // Handle Inline Update Status
  const handleUpdateStatus = async (recordId: string, newStatus: AttendanceStatus, studentName: string, batchId: string) => {
    setIsActionLoading(recordId);
    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          status: newStatus,
          attendance_marker_role: "Admin",
          attendance_marker_name: "ATOMUS",
        })
        .eq("id", recordId);

      if (error) throw error;

      addToast("success", `Updated ${studentName} to ${newStatus}`);

      // Optimistic client-side state update
      setAttendanceLogs(prev =>
        prev.map(item => item.id === recordId ? {
          ...item,
          status: newStatus,
          attendance_marker_role: "Admin",
          attendance_marker_name: "ATOMUS"
        } : item)
      );

      // Background Recalculation Trigger
      const logEntry = attendanceLogs.find(item => item.id === recordId);
      const studentId = logEntry?.student_id;
      if (studentId) {
        import("@/features/students/services/academic_performance_service")
          .then(({ academicPerformanceService }) => {
            academicPerformanceService.recalculateForStudent(studentId)
              .then(() => academicPerformanceService.recalculateAllRankings());
          });
      }
    } catch (err: any) {
      addToast("error", `Failed to update status: ${err.message}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Handle Delete attendance record
  const handleDeleteRecord = async (recordId: string, studentName: string, batchId: string) => {
    if (!confirm(`Are you sure you want to delete this attendance record for ${studentName}?`)) return;
    setIsActionLoading(recordId);
    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      addToast("success", `Deleted attendance record for ${studentName}`);
      
      // Reload logs
      fetchAttendanceLogs();

      // Background Recalculation Trigger
      const logEntry = attendanceLogs.find(item => item.id === recordId);
      const studentId = logEntry?.student_id;
      if (studentId) {
        import("@/features/students/services/academic_performance_service")
          .then(({ academicPerformanceService }) => {
            academicPerformanceService.recalculateForStudent(studentId)
              .then(() => academicPerformanceService.recalculateAllRankings());
          });
      }
    } catch (err: any) {
      addToast("error", `Failed to delete record: ${err.message}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Debounced student lookup for manual add Modal
  useEffect(() => {
    if (addStudentSearch.length < 2) {
      setAddMatchedStudents([]);
      return;
    }
    const searchStudents = async () => {
      const { data } = await supabase
        .from("students")
        .select(`
          id, full_name, roll_number, campus_id, course_id, batch_id,
          campuses:campus_id (name),
          courses:course_id (name),
          batches:batch_id (name)
        `)
        .or(`full_name.ilike.%${addStudentSearch}%,roll_number.ilike.%${addStudentSearch}%`)
        .limit(8);
      setAddMatchedStudents(data ?? []);
    };
    const timer = setTimeout(searchStudents, 350);
    return () => clearTimeout(timer);
  }, [addStudentSearch]);

  const handleSelectAddStudent = (student: any) => {
    setAddSelectedStudent(student);
    setAddStudentSearch("");
    setAddMatchedStudents([]);
  };

  // Create Manual Entry
  const handleCreateAttendance = async () => {
    if (!addSelectedStudent) return;
    setIsAdding(true);
    try {
      const payload = {
        student_id: addSelectedStudent.id,
        campus_id: addSelectedStudent.campus_id,
        course_id: addSelectedStudent.course_id,
        batch_id: addSelectedStudent.batch_id,
        subject_id: addSubjectId || null,
        attendance_date: addDate,
        status: addStatus,
        remarks: addRemarks || null,
        attendance_marker_role: "Admin" as const,
        attendance_marker_name: "ATOMUS",
      };

      const { error } = await supabase
        .from("attendance")
        .insert(payload);

      if (error) throw error;

      addToast("success", `Created manual entry for ${addSelectedStudent.full_name}`);
      setShowAddModal(false);

      // Reset
      setAddSelectedStudent(null);
      setAddSubjectId("");
      setAddRemarks("");

      // Refresh if in directory mode
      if (activeTab === "directory") {
        fetchAttendanceLogs();
      }

      // Background performance recalculation
      import("@/features/students/services/academic_performance_service")
        .then(({ academicPerformanceService }) => {
          academicPerformanceService.recalculateForStudent(payload.student_id)
            .then(() => academicPerformanceService.recalculateAllRankings());
        });
    } catch (err: any) {
      addToast("error", `Failed to create attendance: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleResetLogFilters = () => {
    setLogSearch("");
    setLogCampus("");
    setLogCourse("");
    setLogBatch("");
    setLogSubject("");
    setLogStatus("");
    setLogDate("");
    setLogPage(1);
  };

  const totalLogPages = Math.ceil(totalLogs / LOGS_PAGE_SIZE) || 1;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#0B3C5D] p-3.5 rounded-2xl shadow-xl shadow-[#0B3C5D]/25">
              <CalendarCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Attendance Management Center
                <span className="text-[10px] bg-[#0B3C5D]/10 text-[#0B3C5D] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">ADMIN</span>
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Track, mark, edit, and audit students attendance records across all campuses globally.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-3 rounded-2xl text-xs font-black hover:bg-[#0B3C5D]/90 active:scale-95 transition-all shadow-md shadow-[#0B3C5D]/15"
            >
              <PlusCircle size={15} />
              Manual Log Entry
            </button>
          </div>
        </div>

        {/* PILL MODE TABS */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab("grid")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "grid"
                ? "bg-white text-[#0B3C5D] shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Attendance Marking Grid
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "directory"
                ? "bg-white text-[#0B3C5D] shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Audit & Logs Directory
          </button>
        </div>

        {/* TAB CONTENT 1: GRID MODE */}
        {activeTab === "grid" && (
          <div className="space-y-6">
            <AttendanceFilters value={filters} onChange={setFilters} />

            <AttendanceGrid
              key={gridKey}
              filters={filters}
              students={students}
              records={records}
              subjects={subjects}
              subjectName={subjectName}
              isLoading={isGridLoading}
              onToast={(type, msg) => addToast(type, msg)}
            />
          </div>
        )}

        {/* TAB CONTENT 2: DIRECTORY MODE */}
        {activeTab === "directory" && (
          <div className="space-y-6">
            
            {/* MULTI-FACET FILTER PANEL */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#0B3C5D]" />
                  Global Attendance Filter Engine
                </span>
                {(logSearch || logCampus || logCourse || logBatch || logSubject || logStatus || logDate) && (
                  <button
                    onClick={handleResetLogFilters}
                    className="text-xs font-black text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
                {/* Search query */}
                <div className="xl:col-span-2">
                  <Label>Search Student</Label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Name or roll number..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className={`${fieldCls} pl-9`}
                    />
                  </div>
                </div>

                {/* Campus filter */}
                <div>
                  <Label>Campus</Label>
                  <select
                    value={logCampus}
                    onChange={(e) => { setLogCampus(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  >
                    <option value="">All Campuses</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Course filter */}
                <div>
                  <Label>Course</Label>
                  <select
                    value={logCourse}
                    onChange={(e) => { setLogCourse(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  >
                    <option value="">All Courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Batch filter */}
                <div>
                  <Label>Batch</Label>
                  <select
                    value={logBatch}
                    onChange={(e) => { setLogBatch(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  >
                    <option value="">All Batches</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Subject filter */}
                <div>
                  <Label>Subject</Label>
                  <select
                    value={logSubject}
                    onChange={(e) => { setLogSubject(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  >
                    <option value="">All Subjects</option>
                    {subjectList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <select
                    value={logStatus}
                    onChange={(e) => { setLogStatus(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  >
                    <option value="">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                  </select>
                </div>



                {/* Date filter */}
                <div>
                  <Label>Date</Label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => { setLogDate(e.target.value); setLogPage(1); }}
                    className={fieldCls}
                  />
                </div>
              </div>
            </Card>

            {/* LOGS DATATABLE */}
            <Card className="overflow-hidden">
              {isLogsLoading ? (
                <div className="py-24 text-center">
                  <RefreshCw size={36} className="text-[#0B3C5D] animate-spin mx-auto mb-4" />
                  <p className="text-slate-900 font-black text-sm">Querying database registers...</p>
                  <p className="text-slate-400 text-xs mt-1">Aggregating records according to filter parameters.</p>
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No attendance registers match</p>
                  <p className="text-xs text-slate-400 mt-1">Try tweaking filters or query parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {[
                          "Date", "Scholar Profile", "Campus / Course", "Batch Name", 
                          "Subject Scoped", "Attendance Status", "Marked By", "Remarks", "Actions"
                        ].map(h => (
                          <th key={h} className="px-6 py-4.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceLogs.map((log) => {
                        const studentName = log.students?.full_name ?? "Unknown Student";
                        const isThisActionLoading = isActionLoading === log.id;
                        const statusColors = STATUS_CFG[log.status as AttendanceStatus] ?? STATUS_CFG.Unmarked;

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                            {/* Date */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-400" />
                                {new Date(log.attendance_date).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", year: "numeric"
                                })}
                              </span>
                            </td>

                            {/* Scholar Profile */}
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-xs font-black text-slate-900">{studentName}</p>
                                <span className="text-[9px] font-bold font-mono text-[#0B3C5D] bg-[#0B3C5D]/5 px-1.5 py-0.5 rounded border border-[#0B3C5D]/10 mt-0.5 inline-block">
                                  {log.students?.roll_number ?? "—"}
                                </span>
                              </div>
                            </td>

                            {/* Campus / Course */}
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{log.courses?.name ?? "—"}</p>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{log.campuses?.name ?? "—"}</span>
                              </div>
                            </td>

                            {/* Batch */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-700">{log.batches?.name ?? "—"}</span>
                            </td>

                            {/* Subject */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-[#0B3C5D] bg-[#0B3C5D]/5 px-2.5 py-1 rounded-lg border border-[#0B3C5D]/10">
                                {log.subjects?.name ?? "Overall Overall"}
                              </span>
                            </td>



                            {/* Interactive Status Selector */}
                            <td className="px-6 py-4">
                              {isThisActionLoading ? (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <RefreshCw size={12} className="animate-spin text-[#0B3C5D]" />
                                  Saving...
                                </div>
                              ) : (
                                <select
                                  value={log.status}
                                  onChange={(e) => handleUpdateStatus(log.id, e.target.value as AttendanceStatus, studentName, log.batch_id)}
                                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full border cursor-pointer outline-none transition-all
                                    ${statusColors.soft} ${statusColors.border}
                                    ${log.status === "Present" ? "text-emerald-700 border-emerald-300" : ""}
                                    ${log.status === "Absent" ? "text-rose-700 border-rose-300" : ""}
                                    ${log.status === "Late" ? "text-amber-700 border-amber-300" : ""}
                                  `}
                                >
                                  <option value="Present">Present</option>
                                  <option value="Absent">Absent</option>
                                  <option value="Late">Late</option>
                                </select>
                              )}
                             </td>

                            {/* Marked By */}
                            <td className="px-6 py-4">
                              {log.attendance_marker_name ? (
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm
                                  ${log.attendance_marker_role === "Admin" 
                                    ? "bg-slate-900 text-amber-400 border-slate-800" 
                                    : log.attendance_marker_role === "Teacher"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                  {log.attendance_marker_name}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Remarks */}
                            <td className="px-6 py-4 max-w-[12rem] truncate">
                              <span className="text-xs text-slate-400 font-medium italic" title={log.remarks}>
                                {log.remarks ?? "No remarks log."}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDeleteRecord(log.id, studentName, log.batch_id)}
                                disabled={isThisActionLoading}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-all disabled:opacity-50"
                                title="Delete attendance register entry"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAGINATION CONTROLS */}
              {attendanceLogs.length > 0 && (
                <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-slate-500 font-bold">
                    Showing <span className="text-slate-800">{(logPage - 1) * LOGS_PAGE_SIZE + 1}</span> to{" "}
                    <span className="text-slate-800">
                      {Math.min(logPage * LOGS_PAGE_SIZE, totalLogs)}
                    </span>{" "}
                    of <span className="text-slate-800">{totalLogs}</span> entries
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={logPage === 1 || isLogsLoading}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-slate-700 px-3">
                      Page {logPage} of {totalLogPages}
                    </span>
                    <button
                      onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                      disabled={logPage === totalLogPages || isLogsLoading}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

      </div>

      {/* --- ADD MANUAL ENTRY DIALOG/MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-[#0B3C5D] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck size={20} className="text-white" />
                <div>
                  <h3 className="font-black text-sm tracking-tight">Manual Attendance Register</h3>
                  <p className="text-[10px] text-white/70 font-semibold uppercase mt-0.5">Logged directly to database</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setAddSelectedStudent(null); }}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Step 1: Student Lookup */}
              {!addSelectedStudent ? (
                <div className="space-y-3.5">
                  <Label>Search Student Profile</Label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type student name or roll number..."
                      value={addStudentSearch}
                      onChange={(e) => setAddStudentSearch(e.target.value)}
                      className={`${fieldCls} pl-10`}
                      autoFocus
                    />
                  </div>

                  {addStudentSearch.length >= 2 && addMatchedStudents.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                      No matching students found.
                    </div>
                  )}

                  {addMatchedStudents.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-50 bg-white max-h-[220px] overflow-y-auto shadow-sm">
                      {addMatchedStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectAddStudent(s)}
                          className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between text-left"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900 leading-tight">{s.full_name}</p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              {s.courses?.name} · {s.batches?.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#0B3C5D] bg-[#0B3C5D]/5 px-2 py-1 rounded">
                            {s.roll_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Form inputs once Student is Selected */
                <div className="space-y-4">
                  {/* Selected Student Banner */}
                  <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-tight">{addSelectedStudent.full_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                        Course: {addSelectedStudent.courses?.name} · Batch: {addSelectedStudent.batches?.name}
                      </p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider block">
                        Campus: {addSelectedStudent.campuses?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setAddSelectedStudent(null)}
                      className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 uppercase tracking-wider hover:bg-rose-100 transition-all"
                    >
                      Change Scholar
                    </button>
                  </div>

                  {/* Subject selector */}
                  <div>
                    <Label>Subject (Optional)</Label>
                    <select
                      value={addSubjectId}
                      onChange={(e) => setAddSubjectId(e.target.value)}
                      className={fieldCls}
                    >
                      <option value="">Overall (No Subject)</option>
                      {subjectList
                        .filter(s => s.course_id === addSelectedStudent.course_id)
                        .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                      }
                    </select>
                  </div>

                  {/* Date Selector */}
                  <div>
                    <Label>Date</Label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className={fieldCls}
                    />
                  </div>



                  {/* Status Dropdown */}
                  <div>
                    <Label>Attendance Status</Label>
                    <select
                      value={addStatus}
                      onChange={(e) => setAddStatus(e.target.value as AttendanceStatus)}
                      className={fieldCls}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>

                  {/* Remarks input */}
                  <div>
                    <Label>Remarks</Label>
                    <textarea
                      placeholder="Add manual notes or rationale..."
                      value={addRemarks}
                      onChange={(e) => setAddRemarks(e.target.value)}
                      className={`${fieldCls} h-16 resize-none`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3.5">
              <button
                onClick={() => { setShowAddModal(false); setAddSelectedStudent(null); }}
                className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAttendance}
                disabled={!addSelectedStudent || isAdding}
                className="px-6 py-3 bg-[#0B3C5D] text-white hover:bg-[#0B3C5D]/95 rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0B3C5D]/10"
              >
                {isAdding ? "Logging..." : "Create Log Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
