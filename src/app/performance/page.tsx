"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Award, Search, Filter, RotateCcw, ChevronRight, ChevronLeft,
  Building2, BookOpen, Users, User, ArrowUpRight, TrendingUp, AlertTriangle,
  GraduationCap, Download, Printer, PieChart as PieIcon, BarChart3, AlertCircle,
  HelpCircle, Calendar, ThumbsUp, ArrowDown, Activity, Sparkles
} from "lucide-react";
import { Skeleton, SkeletonGraph } from "@/components/shared/Skeleton";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";

// Status badge styling
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Excellent": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Good": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Average": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Needs Improvement": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "At Risk": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const PAGE_SIZE = 10;

export default function AcademicPerformancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "exams" | "directory" | "subjects" | "correlation" | "rankings" | "alerts" | "reports">("overview");
  
  // Data States
  const [performanceRecords, setPerformanceRecords] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);

  // Exam Performance States
  const [selectedExamId, setSelectedExamId] = useState("");
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
  const [examsList, setExamsList] = useState<any[]>([]);
  const [studentExamMarks, setStudentExamMarks] = useState<any[]>([]);
  const [examPage, setExamPage] = useState(1);

  useEffect(() => {
    setExamPage(1);
  }, [search, selectedCampus, selectedCourse, selectedBatch, selectedExamId]);

  // Load baseline tables
  useEffect(() => {
    async function loadBaselines() {
      try {
        const [campusesRes, coursesRes, batchesRes, examsRes] = await Promise.all([
          supabase.from("campuses").select("id, name"),
          supabase.from("courses").select("id, name"),
          supabase.from("batches").select("id, name, course_id, campus_id"),
          supabase.from("exams").select("id, name, exam_date, course_id").order("exam_date", { ascending: false }),
        ]);
        setCampuses(campusesRes.data ?? []);
        setCourses(coursesRes.data ?? []);
        setBatches(batchesRes.data ?? []);
        setExamsList(examsRes.data ?? []);
      } catch (err) {
        console.error("Error loading baseline filters:", err);
      }
    }
    loadBaselines();
  }, []);

  // Fetch performance records and subject stats
  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          roll_number,
          campus_id,
          course_id,
          batch_id,
          campuses:campus_id(name),
          courses:course_id(name),
          batches:batch_id(name)
        `);

      if (studentsError) throw studentsError;

      // 2. Fetch all calculated academic performance records
      const { data: perfData, error: perfError } = await supabase
        .from("student_academic_performance")
        .select("*");

      if (perfError) throw perfError;

      const perfMap = new Map<string, any>();
      (perfData ?? []).forEach(p => {
        perfMap.set(p.student_id, p);
      });

      const processedRecords = (studentsData ?? []).map(student => {
        const perf = perfMap.get(student.id);
        return {
          id: perf?.id || `temp-${student.id}`,
          student_id: student.id,
          campus_id: student.campus_id,
          course_id: student.course_id,
          batch_id: student.batch_id,
          attendance_percentage: perf?.attendance_percentage ?? 0,
          marks_percentage: perf?.marks_percentage ?? 0,
          academic_performance_score: perf?.academic_performance_score ?? 0,
          progress_status: perf?.progress_status ?? "Average",
          total_exams: perf?.total_exams ?? 0,
          total_periods: perf?.total_periods ?? 0,
          present_periods: perf?.present_periods ?? 0,
          absent_periods: perf?.absent_periods ?? 0,
          late_periods: perf?.late_periods ?? 0,
          leave_periods: perf?.leave_periods ?? 0,
          calculated_at: perf?.calculated_at || new Date().toISOString(),
          students: student
        };
      }).sort((a, b) => b.academic_performance_score - a.academic_performance_score);

      setPerformanceRecords(processedRecords);

      // 3. Fetch student exam marks
      const { data: examMarks, error: examMarksErr } = await supabase
        .from("marks")
        .select(`
          id,
          marks_obtained,
          total_marks,
          exam_id,
          student_id,
          remarks,
          students:student_id (
            full_name,
            roll_number,
            campus_id,
            course_id,
            batch_id,
            courses:course_id (name)
          ),
          exams:exam_id (
            name,
            exam_date,
            course_id,
            total_marks
          )
        `);

      if (examMarksErr) throw examMarksErr;
      setStudentExamMarks(examMarks ?? []);

      // 2. Fetch subject analytics
      let subQ = supabase.from("subjects").select("id, name, course_id");
      const { data: subjects } = await subQ;

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map(s => s.id);
        const [marksRes, attRes] = await Promise.all([
          supabase.from("marks").select("subject_id, marks_obtained, total_marks"),
          supabase.from("attendance").select("subject_id, status"),
        ]);

        const marks = marksRes.data ?? [];
        const attendance = attRes.data ?? [];

        const aggregatedSubjects = subjects.map(subject => {
          const subMarks = marks.filter(m => m.subject_id === subject.id);
          let marksSum = 0;
          let totalMarksSum = 0;
          for (const m of subMarks) {
            marksSum += Number(m.marks_obtained ?? 0);
            totalMarksSum += Number(m.total_marks ?? 100);
          }
          const marksAvg = totalMarksSum > 0 ? (marksSum / totalMarksSum) * 100 : 0;

          const subAtt = attendance.filter(a => a.subject_id === subject.id);
          let attWeightedSum = 0;
          let attValidPeriods = 0;
          for (const a of subAtt) {
            let weight = 0;
            if (a.status === "Present") weight = 1.0;
            else if (a.status === "Late") weight = 0.75;
            else if (a.status === "Leave") weight = 0.50;
            else if (a.status === "Absent") weight = 0;
            
            if (a.status !== "Unmarked") {
              attWeightedSum += weight;
              attValidPeriods++;
            }
          }
          const attAvg = attValidPeriods > 0 ? (attWeightedSum / attValidPeriods) * 100 : 0;

          return {
            id: subject.id,
            name: subject.name,
            avgMarks: Math.round(marksAvg * 10) / 10,
            avgAttendance: Math.round(attAvg * 10) / 10,
          };
        }).filter(s => s.avgMarks > 0 || s.avgAttendance > 0);

        setSubjectAnalytics(aggregatedSubjects);
      }
    } catch (err) {
      console.error("Error loading performance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCampus("");
    setSelectedCourse("");
    setSelectedBatch("");
    setSelectedStatus("");
    setSelectedExamId("");
    setPage(1);
    setExamPage(1);
  };

  // Filter batches based on selected campus or course
  const filteredBatches = useMemo(() => {
    let b = batches;
    if (selectedCampus) b = b.filter(x => x.campus_id === selectedCampus);
    if (selectedCourse) b = b.filter(x => x.course_id === selectedCourse);
    return b;
  }, [batches, selectedCampus, selectedCourse]);

  // Main Filtering Logic
  const filteredRecords = useMemo(() => {
    return performanceRecords.filter(rec => {
      const student = rec.students;
      if (!student) return false;

      const q = search.toLowerCase();
      if (q && !student.full_name?.toLowerCase().includes(q) && !student.roll_number?.toLowerCase().includes(q)) return false;

      if (selectedCampus && rec.campus_id !== selectedCampus) return false;
      if (selectedCourse && rec.course_id !== selectedCourse) return false;
      if (selectedBatch && rec.batch_id !== selectedBatch) return false;
      if (selectedStatus && rec.progress_status !== selectedStatus) return false;

      return true;
    });
  }, [performanceRecords, search, selectedCampus, selectedCourse, selectedBatch, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const filteredExamMarks = useMemo(() => {
    return studentExamMarks.filter(m => {
      const student = m.students;
      const exam = m.exams;
      if (!student || !exam) return false;

      if (selectedCampus && student.campus_id !== selectedCampus) return false;
      if (selectedCourse && student.course_id !== selectedCourse) return false;
      if (selectedBatch && student.batch_id !== selectedBatch) return false;
      if (selectedExamId && m.exam_id !== selectedExamId) return false;

      // search query
      const q = search.toLowerCase();
      if (q && !student.full_name?.toLowerCase().includes(q) && !student.roll_number?.toLowerCase().includes(q)) return false;

      return true;
    });
  }, [studentExamMarks, selectedCampus, selectedCourse, selectedBatch, selectedExamId, search]);

  const examTrendData = useMemo(() => {
    const groups: Record<string, { sum: number; count: number; dateVal: Date }> = {};

    for (const m of filteredExamMarks) {
      const exam = m.exams;
      if (!exam || !exam.exam_date) continue;

      const dateStr = exam.exam_date;
      const date = new Date(dateStr);
      const score = m.total_marks > 0 ? (Number(m.marks_obtained) / Number(m.total_marks)) * 100 : 0;

      let key = "";
      if (timeframe === "daily") {
        key = new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      } else if (timeframe === "weekly") {
        const oneJan = new Date(date.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
        key = `Wk ${weekNum} (${date.toLocaleString("en-US", { month: "short" })})`;
      } else {
        key = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      }

      if (!groups[key]) {
        groups[key] = { sum: 0, count: 0, dateVal: date };
      }
      groups[key].sum += score;
      groups[key].count += 1;
    }

    return Object.entries(groups)
      .map(([key, val]) => ({
        label: key,
        avgScore: Math.round((val.sum / val.count) * 10) / 10,
        dateVal: val.dateVal
      }))
      .sort((a, b) => a.dateVal.getTime() - b.dateVal.getTime());
  }, [filteredExamMarks, timeframe]);

  const totalExamPages = Math.ceil(filteredExamMarks.length / PAGE_SIZE) || 1;
  const paginatedExamMarks = useMemo(() => {
    const start = (examPage - 1) * PAGE_SIZE;
    return filteredExamMarks.slice(start, start + PAGE_SIZE);
  }, [filteredExamMarks, examPage]);

  // Overall Statistics Calculators
  const globalStats = useMemo(() => {
    if (performanceRecords.length === 0) {
      return {
        avgAttendance: 0,
        avgMarks: 0,
        avgAcademicScore: 0,
        excellent: 0,
        good: 0,
        average: 0,
        needsImp: 0,
        atRisk: 0,
      };
    }

    let attSum = 0;
    let marksSum = 0;
    let scoreSum = 0;
    let exc = 0, gd = 0, av = 0, ni = 0, ar = 0;

    for (const r of performanceRecords) {
      attSum += r.attendance_percentage ?? 0;
      marksSum += r.marks_percentage ?? 0;
      scoreSum += r.academic_performance_score ?? 0;

      if (r.progress_status === "Excellent") exc++;
      else if (r.progress_status === "Good") gd++;
      else if (r.progress_status === "Average") av++;
      else if (r.progress_status === "Needs Improvement") ni++;
      else if (r.progress_status === "At Risk") ar++;
    }

    const len = performanceRecords.length;
    return {
      avgAttendance: Math.round((attSum / len) * 10) / 10,
      avgMarks: Math.round((marksSum / len) * 10) / 10,
      avgAcademicScore: Math.round((scoreSum / len) * 10) / 10,
      excellent: exc,
      good: gd,
      average: av,
      needsImp: ni,
      atRisk: ar,
    };
  }, [performanceRecords]);

  // Discipline Groupings (Correlation)
  const correlationGroups = useMemo(() => {
    const risky: any[] = [];
    const highlyDisciplinedLowScore: any[] = [];
    const lowDisciplineHighScore: any[] = [];

    for (const r of performanceRecords) {
      const att = r.attendance_percentage ?? 0;
      const marks = r.marks_percentage ?? 0;

      if (att < 75 && marks < 50) {
        risky.push(r);
      } else if (att >= 75 && marks < 50) {
        highlyDisciplinedLowScore.push(r);
      } else if (att < 75 && marks >= 75) {
        lowDisciplineHighScore.push(r);
      }
    }

    return { risky, highlyDisciplinedLowScore, lowDisciplineHighScore };
  }, [performanceRecords]);

  // Smart Academic Alerts
  const academicAlerts = useMemo(() => {
    const alerts: { type: "attendance" | "marks" | "risk"; student: string; details: string; severity: "high" | "warning" }[] = [];

    for (const r of performanceRecords) {
      const name = r.students?.full_name ?? "Scholar";
      if (r.progress_status === "At Risk") {
        alerts.push({
          type: "risk",
          student: name,
          details: `Overall score is ${r.academic_performance_score}% (Status: At Risk). Needs urgent counseling.`,
          severity: "high"
        });
      }
      if (r.attendance_percentage < 70) {
        alerts.push({
          type: "attendance",
          student: name,
          details: `Critical low attendance at ${r.attendance_percentage}%. Highly susceptible to exam disqualification.`,
          severity: "high"
        });
      } else if (r.attendance_percentage < 75) {
        alerts.push({
          type: "attendance",
          student: name,
          details: `Attendance is hovering at ${r.attendance_percentage}%, slightly below institutional threshold.`,
          severity: "warning"
        });
      }
      if (r.marks_percentage < 45) {
        alerts.push({
          type: "marks",
          student: name,
          details: `Low examination average of ${r.marks_percentage}% requires focused remedial action.`,
          severity: "warning"
        });
      }
    }

    return alerts;
  }, [performanceRecords]);

  // Rankings and dynamic batch/course/campus rank calculations
  const leaderboard = useMemo(() => {
    return [...performanceRecords].sort((a, b) => b.academic_performance_score - a.academic_performance_score);
  }, [performanceRecords]);

  const getRankingsForStudent = (studentId: string, batchId: string, courseId: string, campusId: string) => {
    const overallRank = leaderboard.findIndex(x => x.student_id === studentId) + 1;
    
    const batchList = leaderboard.filter(x => x.batch_id === batchId);
    const batchRank = batchList.findIndex(x => x.student_id === studentId) + 1;

    const courseList = leaderboard.filter(x => x.course_id === courseId);
    const courseRank = courseList.findIndex(x => x.student_id === studentId) + 1;

    const campusList = leaderboard.filter(x => x.campus_id === campusId);
    const campusRank = campusList.findIndex(x => x.student_id === studentId) + 1;

    return {
      overall: overallRank,
      batch: batchRank,
      course: courseRank,
      campus: campusRank,
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (activeTab === "exams") {
      filename = `Student_Exam_Scores_${new Date().toISOString().split("T")[0]}.csv`;
      headers = [
        "Student Name",
        "Roll Number",
        "Campus",
        "Course",
        "Exam Name",
        "Exam Date",
        "Marks Obtained",
        "Total Marks",
        "Percentage Score",
        "Remarks"
      ];
      rows = filteredExamMarks.map(m => {
        const pct = m.total_marks > 0 ? Math.round((Number(m.marks_obtained) / Number(m.total_marks)) * 100) : 0;
        return [
          m.students?.full_name || "—",
          m.students?.roll_number || "—",
          campuses.find(c => c.id === m.students?.campus_id)?.name || "—",
          m.students?.courses?.name || "—",
          m.exams?.name || "—",
          m.exams?.exam_date || "—",
          m.marks_obtained,
          m.total_marks,
          `${pct}%`,
          m.remarks || ""
        ];
      });
    } else {
      filename = `Student_Overall_Performance_${new Date().toISOString().split("T")[0]}.csv`;
      headers = [
        "Student Name",
        "Roll Number",
        "Campus",
        "Course",
        "Batch",
        "Attendance Percentage",
        "Present Periods",
        "Total Periods",
        "Exams Percentage",
        "Total Exams",
        "Cumulative Score",
        "Progress Status",
        "Batch Rank",
        "Course Rank",
        "Campus Rank"
      ];
      rows = filteredRecords.map(rec => {
        const student = rec.students;
        const ranks = getRankingsForStudent(rec.student_id, rec.batch_id, rec.course_id, rec.campus_id);
        return [
          student?.full_name || "—",
          student?.roll_number || "—",
          student?.campuses?.name || "—",
          student?.courses?.name || "—",
          student?.batches?.name || "—",
          `${rec.attendance_percentage}%`,
          rec.present_periods,
          rec.total_periods,
          `${rec.marks_percentage}%`,
          rec.total_exams,
          `${rec.academic_performance_score}%`,
          rec.progress_status || "—",
          `#${ranks.batch}`,
          `#${ranks.course}`,
          `#${ranks.campus}`
        ];
      });
    }

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const strVal = String(val ?? "");
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 print:p-0 print:space-y-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="bg-[#0B3C5D] p-4 rounded-[2rem] shadow-2xl shadow-[#0B3C5D]/30 transform hover:scale-105 transition-all duration-500">
              <Award size={28} className="text-white animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Academic Performance Analyzer
              <span className="text-[10px] bg-[#D4AF37]/15 text-[#D4AF37] px-2.5 py-1 rounded-full border border-[#D4AF37]/25 uppercase tracking-widest font-black">PRO</span>
            </h1>
            <p className="text-sm text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#D4AF37]" />
              Supabase-Integrated Calculations and Student Rankings Suite
            </p>
          </div>
        </div>

        {/* Global Control Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPerformanceData}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Activity size={16} className="text-[#0B3C5D]" />
            Sync Supabase
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-[#D4AF37] text-white px-5 py-3 rounded-2xl text-sm font-black hover:bg-[#D4AF37]/90 transition-all shadow-md active:scale-95 animate-fadeIn"
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#0B3C5D] text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-900">ATOMUS.edu — INSTITUTIONAL PERFORMANCE REPORT</h1>
        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">
          Multi-campus Student Information System · Calculated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* OVERVIEW METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-2 translate-y-2 group-hover:scale-110 duration-500">
            <Calendar size={140} className="text-[#0B3C5D]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutional Attendance</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{globalStats.avgAttendance}%</h3>
          <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ThumbsUp size={12} />
            Target benchmark: 75%
          </p>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-2 translate-y-2 group-hover:scale-110 duration-500">
            <BookOpen size={140} className="text-[#D4AF37]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Examination Average</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{globalStats.avgMarks}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Weighted across all exams</p>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group border-l-4 border-l-[#0B3C5D]">
          <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-2 translate-y-2 group-hover:scale-110 duration-500">
            <Award size={140} className="text-[#0B3C5D]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Performance Score</p>
          <h3 className="text-3xl font-black text-[#0B3C5D] mt-2 tracking-tight">{globalStats.avgAcademicScore}%</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">70% Exams + 30% Attendance</p>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-2 translate-y-2 group-hover:scale-110 duration-500">
            <AlertTriangle size={140} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">At-Risk Scholars</p>
          <h3 className={`text-3xl font-black mt-2 tracking-tight ${globalStats.atRisk > 0 ? "text-rose-600" : "text-slate-950"}`}>
            {globalStats.atRisk}
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Students below 40% efficiency</p>
        </div>
      </div>

      {/* DASHBOARD TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px scrollbar-none print:hidden">
        {[
          { id: "overview", label: "Overview", icon: PieIcon },
          { id: "exams", label: "Exam Performance", icon: Award },
          { id: "directory", label: "Student Directory", icon: Users },
          { id: "subjects", label: "Subject Analytics", icon: BarChart3 },
          { id: "correlation", label: "Discipline & Correlation", icon: Activity },
          { id: "rankings", label: "Rankings & Leaderboard", icon: Award },
          { id: "alerts", label: "Intervention Alerts", icon: AlertCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-4 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap active:scale-[0.98] ${
                active
                  ? "border-[#0B3C5D] text-[#0B3C5D] bg-[#0B3C5D]/5 rounded-t-2xl"
                  : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TABS CONTAINER CONTENT */}
      {isLoading ? (
        <div className="space-y-10 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 space-y-4 shadow-sm">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 space-y-4 shadow-sm">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 space-y-4 shadow-sm">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <SkeletonGraph height="h-80" />
            </div>
            <div className="xl:col-span-1">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-6">
                <Skeleton className="h-5 w-1/2" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 print:grid-cols-1 print:gap-4">
              
              {/* Distribution Charts */}
              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">Grade Distribution</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Classification according to Overall Score</p>
                    </div>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { status: "Excellent (90+)", count: globalStats.excellent, fill: "#10b981" },
                          { status: "Good (75-89)", count: globalStats.good, fill: "#0B3C5D" },
                          { status: "Average (60-74)", count: globalStats.average, fill: "#f59e0b" },
                          { status: "Needs Imp (40-59)", count: globalStats.needsImp, fill: "#f97316" },
                          { status: "At Risk (<40)", count: globalStats.atRisk, fill: "#ef4444" },
                        ]}
                        barCategoryGap={30}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {
                            [
                              { fill: "#10b981" },
                              { fill: "#0B3C5D" },
                              { fill: "#f59e0b" },
                              { fill: "#f97316" },
                              { fill: "#ef4444" }
                            ].map((b, idx) => (
                              <Cell key={idx} fill={b.fill} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Subject Highlights Grid */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Institutional Subject Performance</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Average marks percentage by subject</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={subjectAnalytics}>
                        <defs>
                          <linearGradient id="subjectGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                        <Area type="monotone" dataKey="avgMarks" stroke="#0B3C5D" strokeWidth={3} fillOpacity={1} fill="url(#subjectGrad)" dot={{ fill: '#0B3C5D', r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Panel: Top Scholars + Risk Alert Panel */}
              <div className="space-y-8">
                
                {/* Top Scholars list */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Sparkles size={16} className="text-[#D4AF37]" />
                      Top Performers
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {leaderboard.slice(0, 4).map((rec, i) => (
                      <div key={rec.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#D4AF37] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center font-black text-xs">
                            #{i + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-xs text-slate-900 leading-tight">{rec.students?.full_name}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{rec.students?.batches?.name ?? "No Batch"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[#0B3C5D]">{rec.academic_performance_score}%</p>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-widest">Excellent</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Radar Alert list */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2 text-rose-600">
                      <AlertTriangle size={16} />
                      Critical Alerts
                    </h3>
                    <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">
                      {academicAlerts.filter(a => a.severity === "high").length} High
                    </span>
                  </div>
                  <div className="space-y-3.5 overflow-y-auto max-h-[290px]">
                    {academicAlerts.slice(0, 5).map((alert, i) => (
                      <div key={i} className={`p-3.5 rounded-2xl border ${alert.severity === "high" ? "bg-rose-50/50 border-rose-100 text-rose-700" : "bg-amber-50/50 border-amber-100 text-amber-800"}`}>
                        <div className="flex items-start gap-2.5">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black leading-tight">{alert.student}</p>
                            <p className="text-[10px] opacity-80 mt-1 leading-normal font-semibold">{alert.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {academicAlerts.length === 0 && (
                      <div className="py-10 text-center text-slate-400 font-bold text-xs">
                        No critical academic alerts!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EXAM PERFORMANCE ANALYTICS */}
          {activeTab === "exams" && (
            <div className="space-y-8">
              
              {/* FILTERS PANEL */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col xl:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name or roll number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-8 focus:ring-[#0B3C5D]/5 transition-all shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  {/* Dropdowns */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Campus Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#D4AF37] transition-colors group">
                      <Building2 size={16} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                      <select
                        value={selectedCampus}
                        onChange={(e) => { setSelectedCampus(e.target.value); setSelectedBatch(""); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Campuses</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Course Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                      <BookOpen size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                      <select
                        value={selectedCourse}
                        onChange={(e) => { setSelectedCourse(e.target.value); setSelectedBatch(""); setSelectedExamId(""); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Batch Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                      <Users size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Batches</option>
                        {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>

                    {/* Exam Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#D4AF37] transition-colors group">
                      <Award size={16} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                      <select
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Exams</option>
                        {examsList
                          .filter(e => !selectedCourse || e.course_id === selectedCourse)
                          .map(e => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.exam_date ? new Date(e.exam_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Upcoming"})
                            </option>
                          ))}
                      </select>
                    </div>

                    {(search || selectedCampus || selectedCourse || selectedBatch || selectedExamId) && (
                      <button
                        onClick={() => { setSelectedExamId(""); handleResetFilters(); }}
                        className="flex items-center gap-2 px-5 py-3 text-rose-600 hover:bg-rose-50 rounded-[1.25rem] text-xs font-black transition-all active:scale-95"
                      >
                        <RotateCcw size={16} />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CHART & DETAILS SUMMARY */}
              <div className="grid grid-cols-1 gap-8">
                {/* Score Trend Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-[#0B3C5D] tracking-tight">Exam Performance Score Trend</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Average scores grouped by chosen timeframe</p>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                      {["daily", "weekly", "monthly"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimeframe(t as any)}
                          className={`text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider transition-all ${
                            timeframe === t
                              ? "bg-white text-[#0B3C5D] shadow-sm"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[280px]">
                    {examTrendData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                        No exam logs matching current filters
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={examTrendData}>
                          <defs>
                            <linearGradient id="examTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Average Score']} />
                          <Area type="monotone" dataKey="avgScore" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#examTrendGrad)" dot={{ fill: '#D4AF37', r: 5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Score Directory Table Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-base font-black text-slate-900">Student Exam Performance Directory</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Individual scholar scores for examinations</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          {["Scholar Profile", "Roll No", "Exam Details", "Marks Obtained", "Percentage Score", "Remarks"].map((h) => (
                            <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedExamMarks.map((m) => {
                          const pct = m.total_marks > 0 ? Math.round((Number(m.marks_obtained) / Number(m.total_marks)) * 100) : 0;
                          const badge = pct >= 90 ? STATUS_COLORS["Excellent"] :
                                        pct >= 75 ? STATUS_COLORS["Good"] :
                                        pct >= 60 ? STATUS_COLORS["Average"] :
                                        pct >= 40 ? STATUS_COLORS["Needs Improvement"] : STATUS_COLORS["At Risk"];

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-black text-slate-900">{m.students?.full_name}</p>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    {m.students?.courses?.name ?? "No Course"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-[10px] font-black text-[#0B3C5D] bg-[#0B3C5D]/5 px-2.5 py-1.5 rounded-lg border border-[#0B3C5D]/10 uppercase tracking-wider">
                                  {m.students?.roll_number}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{m.exams?.name}</p>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                    {m.exams?.exam_date ? new Date(m.exams.exam_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-slate-700">
                                  {m.marks_obtained} / {m.total_marks}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-[#0B3C5D]">{pct}%</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${badge.bg} ${badge.text}`}>
                                    {pct >= 90 ? "Excellent" :
                                     pct >= 75 ? "Good" :
                                     pct >= 60 ? "Average" :
                                     pct >= 40 ? "Needs Imp" : "At Risk"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs text-slate-400 font-medium italic">
                                  {m.remarks || "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredExamMarks.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-20 text-center">
                              <p className="text-slate-900 font-black text-lg">No exam scores found</p>
                              <p className="text-slate-400 text-xs mt-1">Please check selection or reset filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalExamPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing <span className="text-slate-900">{(examPage - 1) * PAGE_SIZE + 1} – {Math.min(examPage * PAGE_SIZE, filteredExamMarks.length)}</span> of <span className="text-slate-900 font-black">{filteredExamMarks.length}</span> Scores
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExamPage(p => Math.max(1, p - 1))}
                          disabled={examPage === 1}
                          className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-black text-slate-700 px-4">Page {examPage} of {totalExamPages}</span>
                        <button
                          onClick={() => setExamPage(p => Math.min(totalExamPages, p + 1))}
                          disabled={examPage === totalExamPages}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0B3C5D] text-white disabled:opacity-30 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: STUDENT DIRECTORY */}
          {activeTab === "directory" && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              
              {/* FILTERS BAR */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/30 space-y-4">
                <div className="flex flex-col xl:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by student name or roll number..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm outline-none focus:border-[#0B3C5D] focus:ring-8 focus:ring-[#0B3C5D]/5 transition-all shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  {/* Dropdowns */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Campus */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#D4AF37] transition-colors group">
                      <Building2 size={16} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                      <select
                        value={selectedCampus}
                        onChange={(e) => { setSelectedCampus(e.target.value); setSelectedBatch(""); setPage(1); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Campuses</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Course */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                      <BookOpen size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                      <select
                        value={selectedCourse}
                        onChange={(e) => { setSelectedCourse(e.target.value); setSelectedBatch(""); setPage(1); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Batch */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                      <Users size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                      <select
                        value={selectedBatch}
                        onChange={(e) => { setSelectedBatch(e.target.value); setPage(1); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Batches</option>
                        {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-[1.25rem] px-4 py-1.5 shadow-sm hover:border-[#0B3C5D] transition-colors group">
                      <Filter size={16} className="text-slate-400 group-hover:text-[#0B3C5D] transition-colors" />
                      <select
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                        className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer py-2 pr-2 appearance-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Average">Average</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                        <option value="At Risk">At Risk</option>
                      </select>
                    </div>

                    {(search || selectedCampus || selectedCourse || selectedBatch || selectedStatus) && (
                      <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2 px-5 py-3 text-rose-600 hover:bg-rose-50 rounded-[1.25rem] text-xs font-black transition-all active:scale-95"
                      >
                        <RotateCcw size={16} />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      {[
                        "Student Profile", "Roll No", "Batch / Campus", "Attendance",
                        "Exams Ratio", "Performance Score", "Status", "Rank", "Report Sheet"
                      ].map((h) => (
                        <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedRecords.map((rec) => {
                      const student = rec.students;
                      const badge = STATUS_COLORS[rec.progress_status ?? "Average"] ?? STATUS_COLORS["Average"];
                      const ranks = getRankingsForStudent(rec.student_id, rec.batch_id, rec.course_id, rec.campus_id);
                      
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition-all group">
                          {/* Student Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {student?.photo_url ? (
                                <img src={student.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center font-black text-sm border border-[#0B3C5D]/10">
                                  {student?.full_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-black text-slate-900 truncate max-w-[12rem]">{student?.full_name}</p>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{student?.courses?.name ?? "No Course"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Roll Number */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-[10px] font-black text-[#0B3C5D] bg-[#0B3C5D]/5 px-2.5 py-1.5 rounded-lg border border-[#0B3C5D]/10 uppercase tracking-wider">
                              {student?.roll_number}
                            </span>
                          </td>

                          {/* Batch / Campus */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800">{student?.batches?.name ?? "—"}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{student?.campuses?.name ?? "No Campus"}</span>
                            </div>
                          </td>

                          {/* Attendance */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700">{rec.attendance_percentage}%</span>
                              <span className="text-[9px] text-slate-400">({rec.present_periods}/{rec.total_periods} periods)</span>
                            </div>
                          </td>

                          {/* Exams */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700">{rec.marks_percentage}%</span>
                              <span className="text-[9px] text-slate-400">({rec.total_exams} exams)</span>
                            </div>
                          </td>

                          {/* Score */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-[#0B3C5D]">{rec.academic_performance_score}%</span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {rec.progress_status}
                            </span>
                          </td>

                          {/* Rankings */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-black text-[#D4AF37]">Batch Rank: #{ranks.batch}</span>
                              <span className="text-[9px] text-slate-400">Course Rank: #{ranks.course}</span>
                            </div>
                          </td>

                          {/* Action - One-click Print preview */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                // Set filter to search this student and jump to print tab
                                setSearch(student?.full_name);
                                setActiveTab("reports");
                              }}
                              className="p-2 text-[#0B3C5D] hover:bg-[#0B3C5D]/5 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider"
                            >
                              <Printer size={12} />
                              Generate
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-20 text-center">
                          <p className="text-slate-900 font-black text-lg">No Scholars found matching filters</p>
                          <p className="text-slate-400 text-xs mt-1">Please redefine your search parameters or check filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Visualizing <span className="text-slate-900">{(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, filteredRecords.length)}</span> of <span className="text-slate-900 font-black">{filteredRecords.length}</span> Scholars
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-slate-700 px-4">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0B3C5D] text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBJECT PERFORMANCE ANALYTICS */}
          {activeTab === "subjects" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:grid-cols-1">
              
              {/* Performance Comparison Radar Chart */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Subject Metrics Radar</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Average marks vs attendance percentages</p>
                </div>
                <div className="h-[340px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectAnalytics}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Radar name="Avg Marks" dataKey="avgMarks" stroke="#0B3C5D" fill="#0B3C5D" fillOpacity={0.2} />
                      <Radar name="Avg Attendance" dataKey="avgAttendance" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} />
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject Breakdown list */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Subject Rankings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Performance index averages across entire institution</p>
                </div>

                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {subjectAnalytics.map((sub, idx) => (
                    <div key={sub.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-[#0B3C5D] font-black text-sm flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-slate-900 leading-tight">{sub.name}</h4>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Subject Average</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-[8px]">Avg Exam Score</p>
                          <p className="text-sm font-black text-[#0B3C5D]">{sub.avgMarks}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-[8px]">Avg Attendance</p>
                          <p className="text-sm font-black text-[#D4AF37]">{sub.avgAttendance}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {subjectAnalytics.length === 0 && (
                    <div className="py-20 text-center text-slate-400 font-bold text-xs">
                      No subject logs recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISCIPLINE CORRELATION */}
          {activeTab === "correlation" && (
            <div className="space-y-8">
              
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Attendance and Marks Correlation Analysis</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-normal">
                  Identifies patterns where scholar behavior impacts academic grades. High attendance with failing scores points to learning gaps, while low attendance with passing grades highlights absenteeism risks.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Category 1: High Risk */}
                <div className="bg-rose-50/50 rounded-[2.5rem] border border-rose-100 p-6 space-y-5">
                  <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                    <AlertTriangle className="text-rose-600" />
                    <div>
                      <h3 className="text-xs font-black text-rose-900 uppercase tracking-wider">Critical High-Risk Scholars</h3>
                      <p className="text-[9px] text-rose-500 font-bold">Attendance &lt; 75% AND Exam Score &lt; 50%</p>
                    </div>
                  </div>
                  <div className="space-y-3 overflow-y-auto max-h-[350px]">
                    {correlationGroups.risky.map(rec => (
                      <div key={rec.id} className="p-3.5 bg-white border border-rose-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-xs text-slate-900 leading-tight">{rec.students?.full_name}</h4>
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{rec.students?.roll_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">{rec.academic_performance_score}%</p>
                          <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">{rec.attendance_percentage}% Att</span>
                        </div>
                      </div>
                    ))}
                    {correlationGroups.risky.length === 0 && (
                      <div className="py-10 text-center text-rose-500 font-bold text-xs">
                        All clear! No students in critical risk.
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 2: Learning Gap */}
                <div className="bg-amber-50/50 rounded-[2.5rem] border border-amber-100 p-6 space-y-5">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <HelpCircle className="text-amber-600" />
                    <div>
                      <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">High Discipline, Low Score</h3>
                      <p className="text-[9px] text-amber-500 font-bold">Attendance &ge; 75% AND Exam Score &lt; 50%</p>
                    </div>
                  </div>
                  <div className="space-y-3 overflow-y-auto max-h-[350px]">
                    {correlationGroups.highlyDisciplinedLowScore.map(rec => (
                      <div key={rec.id} className="p-3.5 bg-white border border-amber-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-xs text-slate-900 leading-tight">{rec.students?.full_name}</h4>
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{rec.students?.roll_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[#0B3C5D]">{rec.marks_percentage}% Exam</p>
                          <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">{rec.attendance_percentage}% Att</span>
                        </div>
                      </div>
                    ))}
                    {correlationGroups.highlyDisciplinedLowScore.length === 0 && (
                      <div className="py-10 text-center text-amber-500 font-bold text-xs">
                        No learning gaps identified.
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 3: Low Discipline, High Score */}
                <div className="bg-blue-50/50 rounded-[2.5rem] border border-blue-100 p-6 space-y-5">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                    <User className="text-[#0B3C5D]" />
                    <div>
                      <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">Low Attendance, High Score</h3>
                      <p className="text-[9px] text-blue-500 font-bold">Attendance &lt; 75% AND Exam Score &ge; 75%</p>
                    </div>
                  </div>
                  <div className="space-y-3 overflow-y-auto max-h-[350px]">
                    {correlationGroups.lowDisciplineHighScore.map(rec => (
                      <div key={rec.id} className="p-3.5 bg-white border border-blue-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-xs text-slate-900 leading-tight">{rec.students?.full_name}</h4>
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{rec.students?.roll_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600">{rec.marks_percentage}% Exam</p>
                          <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">{rec.attendance_percentage}% Att</span>
                        </div>
                      </div>
                    ))}
                    {correlationGroups.lowDisciplineHighScore.length === 0 && (
                      <div className="py-10 text-center text-blue-500 font-bold text-xs">
                        No absenteeism-risk scholars identified.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: LEADERBOARDS & RANKINGS */}
          {activeTab === "rankings" && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Institutional Rankings Leaderboard</h2>
                <p className="text-xs text-slate-400 mt-0.5">Students ordered by overall performance score</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      {[
                        "Rank", "Scholar Name", "Roll No", "Overall Score", 
                        "Batch Rank", "Course Rank", "Campus Rank"
                      ].map((h) => (
                        <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((rec, index) => {
                      const ranks = getRankingsForStudent(rec.student_id, rec.batch_id, rec.course_id, rec.campus_id);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                              index === 0 ? "bg-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/35" :
                              index === 1 ? "bg-slate-300 text-slate-800 shadow-md shadow-slate-300/35" :
                              index === 2 ? "bg-amber-600 text-white shadow-md shadow-amber-600/35" : "bg-slate-100 text-slate-500"
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-slate-900">{rec.students?.full_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-[#0B3C5D] font-bold">{rec.students?.roll_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-black text-[#0B3C5D]">{rec.academic_performance_score}%</span>
                          </td>
                          <td className="px-6 py-4 font-black text-xs text-slate-800">#{ranks.batch}</td>
                          <td className="px-6 py-4 font-black text-xs text-slate-700">#{ranks.course}</td>
                          <td className="px-6 py-4 font-black text-xs text-[#D4AF37]">#{ranks.campus}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: INTERVENTION ALERTS */}
          {activeTab === "alerts" && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Academic Intervention Alerts</h2>
                <p className="text-xs text-slate-400 mt-0.5">Urgent warnings highlighting declining attendance or grades</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {academicAlerts.map((alert, idx) => (
                  <div key={idx} className={`p-5 rounded-[1.75rem] border flex items-start gap-4 hover:-translate-y-0.5 transition-all shadow-sm ${
                    alert.severity === "high"
                      ? "bg-rose-50/50 border-rose-100 text-rose-900 shadow-rose-50"
                      : "bg-amber-50/50 border-amber-100 text-amber-900 shadow-amber-50"
                  }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${alert.severity === "high" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${alert.severity === "high" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                        {alert.type} - {alert.severity} Severity
                      </span>
                      <h4 className="font-black text-sm text-slate-900 mt-2">{alert.student}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-semibold leading-normal">{alert.details}</p>
                    </div>
                  </div>
                ))}
                {academicAlerts.length === 0 && (
                  <div className="py-20 text-center col-span-2 text-slate-400 font-bold text-xs">
                    Amazing! No active intervention alerts across any campus.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: REPORT SHEETS (Print View) */}
          {activeTab === "reports" && (
            <div className="space-y-6 print:space-y-2">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm print:hidden">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Institutional Report Generator</h2>
                <p className="text-xs text-slate-400 mt-0.5">Review and print individual performance sheets or batch cards.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#0B3C5D]/90 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    <Printer size={14} />
                    Trigger Print Preview Dialog
                  </button>
                </div>
              </div>

              {/* REPORT CARD */}
              <div className="space-y-10 print:space-y-6">
                {filteredRecords.map((rec) => {
                  const student = rec.students;
                  const ranks = getRankingsForStudent(rec.student_id, rec.batch_id, rec.course_id, rec.campus_id);
                  
                  return (
                    <div key={rec.id} className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-8 shadow-sm print:rounded-none print:border-slate-800 print:shadow-none print:p-6 break-inside-avoid">
                      
                      {/* HEADER */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-5 print:pb-3 print:mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center font-black text-lg border border-[#0B3C5D]/10">
                            {student?.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900">{student?.full_name}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scholar ID: {student?.roll_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${STATUS_COLORS[rec.progress_status ?? "Average"].bg} ${STATUS_COLORS[rec.progress_status ?? "Average"].text} ${STATUS_COLORS[rec.progress_status ?? "Average"].border} uppercase tracking-wider`}>
                            {rec.progress_status}
                          </span>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">Calculated: {new Date(rec.calculated_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* DATA COLUMNS */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-none print:border-none print:p-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Campus</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{student?.campuses?.name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-none print:border-none print:p-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Course & Batch</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{student?.courses?.name} · {student?.batches?.name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-none print:border-none print:p-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Attendance Percentage</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{rec.attendance_percentage}% ({rec.present_periods}/{rec.total_periods} periods)</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-none print:border-none print:p-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Exams Average</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{rec.marks_percentage}% ({rec.total_exams} exams)</p>
                        </div>
                      </div>

                      {/* SCORE CARD */}
                      <div className="mt-6 p-5 bg-[#0B3C5D]/5 rounded-2xl border border-[#0B3C5D]/10 flex flex-col sm:flex-row justify-between items-center gap-4 print:mt-4 print:p-3 print:bg-none">
                        <div>
                          <h4 className="text-sm font-black text-[#0B3C5D]">Cumulative Performance Index</h4>
                          <p className="text-xs text-slate-400 mt-0.5 font-bold">Comprehensive weighted scorecard rating</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Academic score</span>
                            <h3 className="text-2xl font-black text-[#0B3C5D]">{rec.academic_performance_score}%</h3>
                          </div>
                          <div className="text-right border-l border-slate-200 pl-6 print:border-slate-850">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Class Rankings</span>
                            <p className="text-xs font-black text-slate-800 mt-0.5">Batch Rank: #{ranks.batch}</p>
                            <p className="text-[9px] text-slate-400">Campus Rank: #{ranks.campus}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
