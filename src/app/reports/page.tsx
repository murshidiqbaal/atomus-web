"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3, Calendar, CreditCard, Download, FileText, Users, Loader2,
  Search, ArrowUpDown, ChevronLeft, ChevronRight, Calculator, PieChart,
  TrendingUp, Award, Clock, MessageSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";

const REPORT_CARDS = [
  { id: "performance", label: "Performance Report", desc: "Exam-wise analysis by course & batch", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "attendance", label: "Attendance Audit", desc: "Student attendance records and marker logs", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "fee", label: "Fee Collection", desc: "Revenue collections, payments & student accounts", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
  { id: "expense", label: "Expense Audit", desc: "Institutional expenses and payment audits", icon: FileText, color: "text-rose-600", bg: "bg-rose-50" },
  { id: "batch", label: "Batch Strength", desc: "Comparative batch strength & metrics", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
  { id: "reviews", label: "Student Reviews", desc: "Daily behavior, engagement, and teacher remarks", icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50" },
];

export default function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState("performance");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["performance", "attendance", "fee", "expense", "batch", "reviews"].includes(tab)) {
        setActiveReport(tab);
      }
    }
  }, []);

  // Global Lookups from Database
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; course_id: string; campus_id: string | null }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; course_id: string }[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // MM format (e.g. "05" for May)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // Handles status filtering
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All"); // Handles payment method filters

  // Reviews-specific filters
  const [behaviorFilter, setBehaviorFilter] = useState("All");
  const [engagementFilter, setEngagementFilter] = useState("All");
  const [homeworkFilter, setHomeworkFilter] = useState("All");
  
  // Sub-tabs for specific reports
  const [feeSubTab, setFeeSubTab] = useState<"accounts" | "transactions">("accounts");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Real Database Lists
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [studentFeesData, setStudentFeesData] = useState<any[]>([]);
  const [transactionsData, setTransactionsData] = useState<any[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);

  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [batchesData, setBatchesData] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Load global lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        setLookupsLoading(true);
        const [campusesRes, coursesRes, batchesRes, subjectsRes, expCatRes] = await Promise.all([
          supabase.from("campuses").select("id, name").eq("is_active", true).order("name"),
          supabase.from("courses").select("id, name").eq("is_active", true).order("name"),
          supabase.from("batches").select("id, name, course_id, campus_id").eq("is_active", true).order("name"),
          supabase.from("subjects").select("id, name, course_id").eq("is_active", true).order("name"),
          supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name")
        ]);

        setCampuses(campusesRes.data ?? []);
        setCourses(coursesRes.data ?? []);
        setBatches(batchesRes.data ?? []);
        setSubjects(subjectsRes.data ?? []);
        setExpenseCategories(expCatRes.data ?? []);
      } catch (e) {
        console.error("Failed to load lookups:", e);
      } finally {
        setLookupsLoading(false);
      }
    }
    loadLookups();
  }, []);

  // Reset page and filters when switching reports
  useEffect(() => {
    setSearch("");
    setSelectedCampus("");
    setSelectedCourse("");
    setSelectedBatch("");
    setSelectedSubject("");
    setSelectedMonth("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("All");
    setPaymentMethodFilter("All");
    setBehaviorFilter("All");
    setEngagementFilter("All");
    setHomeworkFilter("All");
    setCurrentPage(1);
  }, [activeReport, feeSubTab]);

  // Reset page to 1 on any filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCampus, selectedCourse, selectedBatch, selectedSubject, selectedMonth, startDate, endDate, statusFilter, paymentMethodFilter, behaviorFilter, engagementFilter, homeworkFilter]);

  // Lookup maps for name resolution
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
  const batchMap = useMemo(() => new Map(batches.map(b => [b.id, b.name])), [batches]);

  // Filter chain lookup helpers
  const filteredBatchesLookup = useMemo(() => {
    return batches.filter(b => {
      const matchCourse = !selectedCourse || b.course_id === selectedCourse;
      const matchCampus = !selectedCampus || b.campus_id === selectedCampus || b.campus_id === null;
      return matchCourse && matchCampus;
    });
  }, [batches, selectedCourse, selectedCampus]);

  const filteredSubjectsLookup = useMemo(() => {
    return subjects.filter(s => !selectedCourse || s.course_id === selectedCourse);
  }, [subjects, selectedCourse]);

  // ── 1. Fetch Performance Data ────────────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "performance") return;
    
    async function fetchPerformance() {
      setPerformanceLoading(true);
      try {
        const { data, error } = await supabase
          .from("marks")
          .select(`
            id,
            marks_obtained,
            total_marks,
            percentage,
            mark_date,
            remarks,
            exam:exams(id, name, exam_date, subject_id, course_id, batch_id, campus_id),
            student:students(id, full_name, admission_number, campus_id, course_id, batch_id),
            subject:subjects(id, name)
          `)
          .order("mark_date", { ascending: false });

        if (error) throw error;
        setPerformanceData(data ?? []);
      } catch (err) {
        console.error("Error fetching performance report:", err);
      } finally {
        setPerformanceLoading(false);
      }
    }
    fetchPerformance();
  }, [activeReport]);

  const filteredPerformance = useMemo(() => {
    let result = [...performanceData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.student?.full_name ?? "").toLowerCase().includes(q) ||
          (row.student?.admission_number ?? "").toLowerCase().includes(q) ||
          (row.exam?.name ?? "").toLowerCase().includes(q) ||
          (row.subject?.name ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.student?.campus_id === selectedCampus || row.exam?.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(row => row.student?.course_id === selectedCourse || row.exam?.course_id === selectedCourse);
    }
    if (selectedBatch) {
      result = result.filter(row => row.student?.batch_id === selectedBatch || row.exam?.batch_id === selectedBatch);
    }
    if (selectedSubject) {
      result = result.filter(row => row.subject_id === selectedSubject || row.exam?.subject_id === selectedSubject);
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.mark_date || row.exam?.exam_date || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.mark_date || row.exam?.exam_date || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [performanceData, search, selectedCampus, selectedCourse, selectedBatch, selectedSubject, selectedMonth, startDate, endDate]);

  const performanceStats = useMemo(() => {
    if (filteredPerformance.length === 0) {
      return {
        overallAvg: "0%",
        totalStudents: 0,
        atRiskCount: 0,
        excellentCount: 0,
        examsCount: 0,
        courseAverages: [],
        gradeDistribution: []
      };
    }

    let totalPercentage = 0;
    const studentIds = new Set<string>();
    const examIds = new Set<string>();
    let excellent = 0;
    let atRisk = 0;

    const courseSums: Record<string, { sum: number; count: number }> = {};
    const grades = { excellent: 0, good: 0, average: 0, belowAvg: 0 };

    for (const row of filteredPerformance) {
      const pct = Number(row.percentage ?? (row.total_marks > 0 ? (row.marks_obtained / row.total_marks) * 100 : 0));
      totalPercentage += pct;
      
      if (row.student_id) studentIds.add(row.student_id);
      if (row.exam_id) examIds.add(row.exam_id);

      if (pct >= 85) {
        excellent++;
        grades.excellent++;
      } else if (pct >= 70) {
        grades.good++;
      } else if (pct >= 50) {
        grades.average++;
      } else {
        atRisk++;
        grades.belowAvg++;
      }

      // Course Aggregation
      const courseId = row.student?.course_id || row.exam?.course_id;
      if (courseId) {
        if (!courseSums[courseId]) courseSums[courseId] = { sum: 0, count: 0 };
        courseSums[courseId].sum += pct;
        courseSums[courseId].count += 1;
      }
    }

    const overallAvg = `${Math.round(totalPercentage / filteredPerformance.length)}%`;

    const courseAverages = Object.entries(courseSums).map(([cId, data]) => ({
      course: courseMap.get(cId) || "Other",
      avg: Math.round(data.sum / data.count)
    })).sort((a, b) => b.avg - a.avg);

    const totalCount = filteredPerformance.length;
    const gradeDistribution = [
      { name: "Excellent (>85%)", value: Math.round((grades.excellent / totalCount) * 100) || 0, color: "#10b981" },
      { name: "Good (70–85%)", value: Math.round((grades.good / totalCount) * 100) || 0, color: "#0B3C5D" },
      { name: "Average (50–70%)", value: Math.round((grades.average / totalCount) * 100) || 0, color: "#f59e0b" },
      { name: "Below Avg (<50%)", value: Math.round((grades.belowAvg / totalCount) * 100) || 0, color: "#ef4444" },
    ].filter(g => g.value > 0);

    return {
      overallAvg,
      totalStudents: studentIds.size,
      atRiskCount: atRisk,
      excellentCount: excellent,
      examsCount: examIds.size,
      courseAverages,
      gradeDistribution
    };
  }, [filteredPerformance, courseMap]);

  // ── 2. Fetch Attendance Data ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "attendance") return;

    async function fetchAttendance() {
      setAttendanceLoading(true);
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select(`
            id,
            attendance_date,
            status,
            remarks,
            attendance_marker_name,
            attendance_marker_role,
            student_id,
            campus_id,
            course_id,
            batch_id,
            subject_id,
            student:students(id, full_name, admission_number),
            subject:subjects(id, name)
          `)
          .order("attendance_date", { ascending: false });

        if (error) throw error;
        setAttendanceData(data ?? []);
      } catch (err) {
        console.error("Error fetching attendance report:", err);
      } finally {
        setAttendanceLoading(false);
      }
    }
    fetchAttendance();
  }, [activeReport]);

  const filteredAttendance = useMemo(() => {
    let result = [...attendanceData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.student?.full_name ?? "").toLowerCase().includes(q) ||
          (row.student?.admission_number ?? "").toLowerCase().includes(q) ||
          (row.attendance_marker_name ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.campus_id === selectedCampus || row.student?.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(row => row.course_id === selectedCourse || row.student?.course_id === selectedCourse);
    }
    if (selectedBatch) {
      result = result.filter(row => row.batch_id === selectedBatch || row.student?.batch_id === selectedBatch);
    }
    if (selectedSubject) {
      result = result.filter(row => row.subject_id === selectedSubject);
    }
    if (statusFilter !== "All") {
      result = result.filter(row => row.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.attendance_date || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.attendance_date || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [attendanceData, search, selectedCampus, selectedCourse, selectedBatch, selectedSubject, statusFilter, selectedMonth, startDate, endDate]);

  const attendanceStats = useMemo(() => {
    if (filteredAttendance.length === 0) {
      return {
        overallAvg: "0%",
        totalRecords: 0,
        activeMarkers: 0,
        adminCount: 0,
        teacherCount: 0,
        subjectData: [],
        overrideDistribution: [],
        teacherData: []
      };
    }

    let present = 0;
    let total = 0;
    const markers = new Set<string>();
    let adminCount = 0;
    let teacherCount = 0;

    const teacherCounts: Record<string, number> = {};
    const subjectStats: Record<string, { present: number; total: number }> = {};

    for (const r of filteredAttendance) {
      const s = r.status?.toLowerCase();
      if (s === "unmarked") continue;
      total++;
      if (s === "present" || s === "late" || s === "leave") {
        present++;
      }

      if (r.attendance_marker_name) {
        markers.add(r.attendance_marker_name);
        teacherCounts[r.attendance_marker_name] = (teacherCounts[r.attendance_marker_name] || 0) + 1;
      }

      if (r.attendance_marker_role === "Admin") {
        adminCount++;
      } else if (r.attendance_marker_role === "Teacher") {
        teacherCount++;
      }

      if (r.subject_id) {
        if (!subjectStats[r.subject_id]) {
          subjectStats[r.subject_id] = { present: 0, total: 0 };
        }
        subjectStats[r.subject_id].total++;
        if (s === "present" || s === "late" || s === "leave") {
          subjectStats[r.subject_id].present++;
        }
      }
    }

    const overallAvg = total > 0 ? `${Math.round((present / total) * 100)}%` : "100%";

    const teacherData = Object.entries(teacherCounts).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const subjectData = Object.entries(subjectStats).map(([subjId, s]) => {
      const subjName = subjects.find(sub => sub.id === subjId)?.name || "Unknown Subject";
      return {
        name: subjName,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 100,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const overrideDistribution = [
      { name: "Teacher Marked", value: teacherCount, color: "#10b981" },
      { name: "Admin Overridden (ATOMUS)", value: adminCount, color: "#0B3C5D" },
    ].filter(d => d.value > 0);

    if (overrideDistribution.length === 0 && total > 0) {
      overrideDistribution.push({ name: "Unclassified", value: total, color: "#94a3b8" });
    }

    return {
      overallAvg,
      totalRecords: total,
      activeMarkers: markers.size,
      adminCount,
      teacherCount,
      subjectData,
      overrideDistribution,
      teacherData
    };
  }, [filteredAttendance, subjects]);

  // ── 3. Fetch Fee Collection Data ─────────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "fee") return;

    async function fetchFees() {
      setFeesLoading(true);
      try {
        const [sfRes, ptRes] = await Promise.all([
          supabase
            .from("student_fees")
            .select(`
              id,
              total_fee,
              discount_amount,
              paid_amount,
              balance_amount,
              payment_status,
              last_payment_date,
              created_at,
              fee_structure:fee_structures(id, name),
              student:students(id, full_name, admission_number, campus_id, course_id, batch_id)
            `),
          supabase
            .from("payment_transactions")
            .select(`
              id,
              amount_paid,
              payment_date,
              payment_method,
              transaction_id,
              remarks,
              created_at,
              student_fee_id,
              student:students(id, full_name, admission_number, campus_id, course_id, batch_id)
            `)
            .order("payment_date", { ascending: false })
        ]);

        if (sfRes.error) throw sfRes.error;
        if (ptRes.error) throw ptRes.error;

        setStudentFeesData(sfRes.data ?? []);
        setTransactionsData(ptRes.data ?? []);
      } catch (err) {
        console.error("Error fetching fee reports:", err);
      } finally {
        setFeesLoading(false);
      }
    }
    fetchFees();
  }, [activeReport]);

  const filteredStudentFees = useMemo(() => {
    let result = [...studentFeesData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.student?.full_name ?? "").toLowerCase().includes(q) ||
          (row.student?.admission_number ?? "").toLowerCase().includes(q) ||
          (row.fee_structure?.name ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.student?.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(row => row.student?.course_id === selectedCourse);
    }
    if (selectedBatch) {
      result = result.filter(row => row.student?.batch_id === selectedBatch);
    }
    if (statusFilter !== "All") {
      result = result.filter(row => row.payment_status === statusFilter);
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.last_payment_date || row.created_at || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.last_payment_date || row.created_at || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [studentFeesData, search, selectedCampus, selectedCourse, selectedBatch, statusFilter, selectedMonth, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactionsData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.student?.full_name ?? "").toLowerCase().includes(q) ||
          (row.student?.admission_number ?? "").toLowerCase().includes(q) ||
          (row.transaction_id ?? "").toLowerCase().includes(q) ||
          (row.remarks ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.student?.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(row => row.student?.course_id === selectedCourse);
    }
    if (selectedBatch) {
      result = result.filter(row => row.student?.batch_id === selectedBatch);
    }
    if (paymentMethodFilter !== "All") {
      result = result.filter(row => row.payment_method === paymentMethodFilter);
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.payment_date || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.payment_date || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [transactionsData, search, selectedCampus, selectedCourse, selectedBatch, paymentMethodFilter, selectedMonth, startDate, endDate]);

  const feeStats = useMemo(() => {
    let totalCollected = 0;
    let totalPending = 0;
    let defaulters = 0;

    for (const tx of filteredTransactions) {
      totalCollected += Number(tx.amount_paid ?? 0);
    }
    for (const sf of filteredStudentFees) {
      totalPending += Number(sf.balance_amount ?? 0);
      if (sf.payment_status === "Pending" || sf.payment_status === "Overdue") {
        defaulters++;
      }
    }

    const totalFee = totalCollected + totalPending;
    const collectionRate = totalFee > 0 ? `${Math.round((totalCollected / totalFee) * 100)}%` : "100%";

    // Grouping by Month for chart:
    const monthlyGroups: Record<string, { collected: number; pending: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize recent months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      monthlyGroups[mName] = { collected: 0, pending: 0 };
    }

    // Populate collected
    for (const tx of filteredTransactions) {
      const date = new Date(tx.payment_date);
      const mName = monthNames[date.getMonth()];
      if (monthlyGroups[mName]) {
        monthlyGroups[mName].collected += Number(tx.amount_paid ?? 0);
      }
    }
    // Populate pending
    for (const sf of filteredStudentFees) {
      const date = sf.last_payment_date ? new Date(sf.last_payment_date) : new Date(sf.created_at || Date.now());
      const mName = monthNames[date.getMonth()];
      if (monthlyGroups[mName] && (sf.payment_status === "Pending" || sf.payment_status === "Partial" || sf.payment_status === "Overdue")) {
        monthlyGroups[mName].pending += Number(sf.balance_amount ?? 0);
      }
    }

    const feeAnalyticsChartData = Object.entries(monthlyGroups).map(([month, data]) => ({
      month,
      collected: data.collected,
      pending: data.pending
    })).reverse();

    return {
      totalCollected,
      totalPending,
      collectionRate,
      defaulters,
      feeAnalyticsChartData
    };
  }, [filteredTransactions, filteredStudentFees]);

  // ── 4. Fetch Expenses Data ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "expense") return;

    async function fetchExpenses() {
      setExpensesLoading(true);
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select(`
            id,
            title,
            amount,
            payment_method,
            expense_date,
            notes,
            category_id,
            campus_id,
            category:expense_categories(id, name, color),
            campus:campuses(id, name)
          `)
          .order("expense_date", { ascending: false });

        if (error) throw error;
        setExpensesData(data ?? []);
      } catch (err) {
        console.error("Error fetching expenses report:", err);
      } finally {
        setExpensesLoading(false);
      }
    }
    fetchExpenses();
  }, [activeReport]);

  const filteredExpenses = useMemo(() => {
    let result = [...expensesData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.title ?? "").toLowerCase().includes(q) ||
          (row.notes ?? "").toLowerCase().includes(q) ||
          (row.category?.name ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.campus_id === selectedCampus);
    }
    if (statusFilter !== "All") {
      result = result.filter(row => row.category_id === statusFilter); // statusFilter stores Category ID here
    }
    if (paymentMethodFilter !== "All") {
      result = result.filter(row => row.payment_method === paymentMethodFilter);
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.expense_date || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.expense_date || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [expensesData, search, selectedCampus, statusFilter, paymentMethodFilter, selectedMonth, startDate, endDate]);

  const expenseStats = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return {
        totalOutflow: 0,
        avgExpense: 0,
        topCategory: "—",
        categoryDistribution: [],
        monthlyTrend: []
      };
    }

    let totalOutflow = 0;
    const catAmounts: Record<string, { sum: number; color: string }> = {};
    const monthlySums: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (const exp of filteredExpenses) {
      const amt = Number(exp.amount ?? 0);
      totalOutflow += amt;

      const catName = exp.category?.name || "Uncategorized";
      const catColor = exp.category?.color || "#94a3b8";
      if (!catAmounts[catName]) catAmounts[catName] = { sum: 0, color: catColor };
      catAmounts[catName].sum += amt;

      const date = new Date(exp.expense_date);
      const mName = monthNames[date.getMonth()];
      monthlySums[mName] = (monthlySums[mName] || 0) + amt;
    }

    const avgExpense = Math.round(totalOutflow / filteredExpenses.length);

    let topCat = "—";
    let maxCatAmt = -1;
    for (const [name, data] of Object.entries(catAmounts)) {
      if (data.sum > maxCatAmt) {
        maxCatAmt = data.sum;
        topCat = name;
      }
    }

    const categoryDistribution = Object.entries(catAmounts).map(([name, data]) => ({
      name,
      value: data.sum,
      color: data.color
    })).sort((a, b) => b.value - a.value);

    const monthlyTrend = monthNames.map(m => ({
      month: m,
      amount: monthlySums[m] || 0
    })).filter(m => m.amount > 0 || Object.keys(monthlySums).includes(m.month));

    return {
      totalOutflow,
      avgExpense,
      topCategory: topCat,
      categoryDistribution,
      monthlyTrend
    };
  }, [filteredExpenses]);

  // ── 5. Fetch Batch Data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "batch") return;

    async function fetchBatches() {
      setBatchesLoading(true);
      try {
        const [bRes, sRes, aRes, mRes] = await Promise.all([
          supabase.from("batches").select(`id, name, course_id, campus_id, capacity`),
          supabase.from("students").select("id, batch_id"),
          supabase.from("attendance").select("batch_id, status"),
          supabase.from("marks").select("percentage, marks_obtained, total_marks, exam:exams(batch_id)")
        ]);

        if (bRes.error) throw bRes.error;

        const rawBatches = bRes.data ?? [];
        const students = sRes.data ?? [];
        const attendance = aRes.data ?? [];
        const marks = mRes.data ?? [];

        // Count students per batch
        const studentCounts: Record<string, number> = {};
        for (const s of students) {
          if (s.batch_id) {
            studentCounts[s.batch_id] = (studentCounts[s.batch_id] || 0) + 1;
          }
        }

        // Compute attendance per batch
        const attCounts: Record<string, { present: number; total: number }> = {};
        for (const a of attendance) {
          if (!a.batch_id) continue;
          const status = a.status?.toLowerCase();
          if (status === "unmarked") continue;
          if (!attCounts[a.batch_id]) attCounts[a.batch_id] = { present: 0, total: 0 };
          attCounts[a.batch_id].total++;
          if (status === "present" || status === "late" || status === "leave") {
            attCounts[a.batch_id].present++;
          }
        }

        // Compute marks per batch
        const markCounts: Record<string, { sum: number; count: number }> = {};
        for (const m of marks) {
          const batchId = (m.exam as any)?.batch_id;
          if (!batchId) continue;
          const pct = Number(m.percentage ?? (m.total_marks > 0 ? (m.marks_obtained / m.total_marks) * 100 : 0));
          if (!markCounts[batchId]) markCounts[batchId] = { sum: 0, count: 0 };
          markCounts[batchId].sum += pct;
          markCounts[batchId].count++;
        }

        const assembled = rawBatches.map((b: any) => {
          const sCount = studentCounts[b.id] || 0;
          const att = attCounts[b.id];
          const attRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
          const mk = markCounts[b.id];
          const avgMarks = mk && mk.count > 0 ? Math.round(mk.sum / mk.count) : 75;

          return {
            id: b.id,
            name: b.name,
            course_id: b.course_id,
            campus_id: b.campus_id,
            capacity: b.capacity || 30,
            studentCount: sCount,
            attendanceRate: attRate,
            avgMarks
          };
        });

        setBatchesData(assembled);
      } catch (err) {
        console.error("Error loading batch reports:", err);
      } finally {
        setBatchesLoading(false);
      }
    }
    fetchBatches();
  }, [activeReport]);

  const filteredBatches = useMemo(() => {
    let result = [...batchesData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q));
    }
    if (selectedCampus) {
      result = result.filter(b => b.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(b => b.course_id === selectedCourse);
    }

    return result;
  }, [batchesData, search, selectedCampus, selectedCourse]);

  const batchStats = useMemo(() => {
    if (filteredBatches.length === 0) {
      return {
        totalBatches: 0,
        topBatch: "—",
        avgSize: "0 students",
        avgAttendance: "0%",
        batchChartData: []
      };
    }

    const totalBatches = filteredBatches.length;
    let sumStudents = 0;
    let sumAttendance = 0;
    let topBatchName = "—";
    let maxAvgMarks = -1;

    for (const b of filteredBatches) {
      sumStudents += b.studentCount;
      sumAttendance += b.attendanceRate;
      if (b.avgMarks > maxAvgMarks && b.studentCount > 0) {
        maxAvgMarks = b.avgMarks;
        topBatchName = b.name;
      }
    }

    if (topBatchName === "—" && filteredBatches.length > 0) {
      topBatchName = filteredBatches[0].name;
    }

    const avgSize = `${Math.round(sumStudents / totalBatches)} students`;
    const avgAttendance = `${Math.round(sumAttendance / totalBatches)}%`;

    const batchChartData = filteredBatches.slice(0, 10).map(b => ({
      batch: b.name,
      students: b.studentCount,
      attendance: b.attendanceRate,
      avg: b.avgMarks
    }));

    return {
      totalBatches,
      topBatch: topBatchName,
      avgSize,
      avgAttendance,
      batchChartData
    };
  }, [filteredBatches]);

  // ── 6. Fetch Student Reviews Data ──────────────────────────────────────────
  useEffect(() => {
    if (activeReport !== "reviews") return;

    async function fetchReviews() {
      setReviewsLoading(true);
      try {
        const { data, error } = await supabase
          .from("student_daily_reports")
          .select(`
            id,
            student_id,
            subject_id,
            date_str,
            behavior_rating,
            study_engagement,
            homework_status,
            remarks,
            teacher_id,
            teacher_name,
            created_at,
            student:students(id, full_name, admission_number, campus_id, course_id, batch_id),
            subject:subjects(id, name)
          `)
          .order("date_str", { ascending: false });

        if (error) throw error;
        setReviewsData(data ?? []);
      } catch (err) {
        console.error("Error fetching student reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [activeReport]);

  const filteredReviews = useMemo(() => {
    let result = [...reviewsData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        row =>
          (row.student?.full_name ?? "").toLowerCase().includes(q) ||
          (row.student?.admission_number ?? "").toLowerCase().includes(q) ||
          (row.teacher_name ?? "").toLowerCase().includes(q) ||
          (row.remarks ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCampus) {
      result = result.filter(row => row.student?.campus_id === selectedCampus);
    }
    if (selectedCourse) {
      result = result.filter(row => row.student?.course_id === selectedCourse);
    }
    if (selectedBatch) {
      result = result.filter(row => row.student?.batch_id === selectedBatch);
    }
    if (selectedSubject) {
      result = result.filter(row => row.subject_id === selectedSubject);
    }
    if (behaviorFilter !== "All") {
      result = result.filter(row => row.behavior_rating === behaviorFilter);
    }
    if (engagementFilter !== "All") {
      result = result.filter(row => row.study_engagement === engagementFilter);
    }
    if (homeworkFilter !== "All") {
      result = result.filter(row => row.homework_status === homeworkFilter);
    }
    if (selectedMonth) {
      result = result.filter(row => {
        const date = row.date_str || "";
        const parts = date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }
    if (startDate || endDate) {
      result = result.filter(row => {
        const date = row.date_str || "";
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return result;
  }, [reviewsData, search, selectedCampus, selectedCourse, selectedBatch, selectedSubject, behaviorFilter, engagementFilter, homeworkFilter, selectedMonth, startDate, endDate]);

  const reviewsStats = useMemo(() => {
    if (filteredReviews.length === 0) {
      return {
        totalReviews: 0,
        excellentGoodRate: "0%",
        activeEngagementRate: "0%",
        homeworkCompletionRate: "0%",
        behaviorDistribution: [],
        engagementDistribution: [],
        homeworkDistribution: []
      };
    }

    const total = filteredReviews.length;
    let excellentGoodCount = 0;
    let activeEngagementCount = 0;
    let homeworkCompletedCount = 0;
    let homeworkApplicableCount = 0;

    const behaviorCounts = { Excellent: 0, Good: 0, Average: 0, 'Needs Imp.': 0, Poor: 0 };
    const engagementCounts = { Active: 0, Passive: 0, Distracted: 0 };
    const homeworkCounts = { Completed: 0, Partial: 0, 'Not Completed': 0, 'N/A': 0 };

    for (const r of filteredReviews) {
      const b = r.behavior_rating as keyof typeof behaviorCounts;
      if (b in behaviorCounts) {
        behaviorCounts[b]++;
        if (b === "Excellent" || b === "Good") {
          excellentGoodCount++;
        }
      }

      const e = r.study_engagement as keyof typeof engagementCounts;
      if (e in engagementCounts) {
        engagementCounts[e]++;
        if (e === "Active") {
          activeEngagementCount++;
        }
      }

      const h = r.homework_status as keyof typeof homeworkCounts;
      if (h in homeworkCounts) {
        homeworkCounts[h]++;
        if (h !== "N/A") {
          homeworkApplicableCount++;
          if (h === "Completed") {
            homeworkCompletedCount++;
          }
        }
      }
    }

    const excellentGoodRate = `${Math.round((excellentGoodCount / total) * 100)}%`;
    const activeEngagementRate = `${Math.round((activeEngagementCount / total) * 100)}%`;
    const homeworkCompletionRate = homeworkApplicableCount > 0 
      ? `${Math.round((homeworkCompletedCount / homeworkApplicableCount) * 100)}%` 
      : "100%";

    const behaviorDistribution = [
      { name: "Excellent", value: behaviorCounts.Excellent, color: "#10b981" },
      { name: "Good", value: behaviorCounts.Good, color: "#0B3C5D" },
      { name: "Average", value: behaviorCounts.Average, color: "#f59e0b" },
      { name: "Needs Imp.", value: behaviorCounts["Needs Imp."], color: "#ef4444" },
      { name: "Poor", value: behaviorCounts.Poor, color: "#7f1d1d" },
    ].filter(item => item.value > 0);

    const engagementDistribution = [
      { name: "Active", value: engagementCounts.Active, color: "#10b981" },
      { name: "Passive", value: engagementCounts.Passive, color: "#f59e0b" },
      { name: "Distracted", value: engagementCounts.Distracted, color: "#ef4444" },
    ].filter(item => item.value > 0);

    const homeworkDistribution = [
      { name: "Completed", value: homeworkCounts.Completed, color: "#10b981" },
      { name: "Partial", value: homeworkCounts.Partial, color: "#f59e0b" },
      { name: "Not Completed", value: homeworkCounts["Not Completed"], color: "#ef4444" },
      { name: "N/A", value: homeworkCounts["N/A"], color: "#94a3b8" },
    ].filter(item => item.value > 0);

    return {
      totalReviews: total,
      excellentGoodRate,
      activeEngagementRate,
      homeworkCompletionRate,
      behaviorDistribution,
      engagementDistribution,
      homeworkDistribution
    };
  }, [filteredReviews]);

  // ── CSV Export Trigger ───────────────────────────────────────────────────────
  function handleExportReport() {
    let filename = "";
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeReport === "performance") {
      filename = "Performance_Report";
      headers = ["Student Name", "Admission Number", "Campus", "Course", "Batch", "Exam Name", "Subject", "Marks Obtained", "Total Marks", "Percentage (%)", "Date"];
      rows = filteredPerformance.map(row => [
        row.student?.full_name || "Unknown",
        row.student?.admission_number || "—",
        campusMap.get(row.student?.campus_id || row.exam?.campus_id || "") || "All Campuses",
        courseMap.get(row.student?.course_id || row.exam?.course_id || "") || "—",
        batchMap.get(row.student?.batch_id || row.exam?.batch_id || "") || "—",
        row.exam?.name || "—",
        row.subject?.name || "—",
        row.marks_obtained,
        row.total_marks,
        row.percentage ? `${row.percentage}%` : "—",
        row.mark_date || row.exam?.exam_date || "—"
      ]);
    } else if (activeReport === "attendance") {
      filename = "Attendance_Audit_Report";
      headers = ["Student Name", "Admission Number", "Campus", "Course", "Batch", "Subject", "Attendance Date", "Status", "Marker Role", "Marker Name", "Remarks"];
      rows = filteredAttendance.map(row => [
        row.student?.full_name || "Unknown",
        row.student?.admission_number || "—",
        campusMap.get(row.campus_id || row.student?.campus_id || "") || "All Campuses",
        courseMap.get(row.course_id || row.student?.course_id || "") || "—",
        batchMap.get(row.batch_id || row.student?.batch_id || "") || "—",
        row.subject?.name || "—",
        row.attendance_date || "—",
        row.status || "Unmarked",
        row.attendance_marker_role || "—",
        row.attendance_marker_name || "—",
        row.remarks || "—"
      ]);
    } else if (activeReport === "fee") {
      if (feeSubTab === "accounts") {
        filename = "Fee_Accounts_Report";
        headers = ["Student Name", "Admission Number", "Campus", "Course", "Batch", "Fee Structure", "Total Fee", "Discount", "Paid Amount", "Balance Outstanding", "Payment Status", "Last Payment Date"];
        rows = filteredStudentFees.map(row => [
          row.student?.full_name || "Unknown",
          row.student?.admission_number || "—",
          campusMap.get(row.student?.campus_id || "") || "All Campuses",
          courseMap.get(row.student?.course_id || "") || "—",
          batchMap.get(row.student?.batch_id || "") || "—",
          row.fee_structure?.name || "—",
          row.total_fee,
          row.discount_amount,
          row.paid_amount,
          row.balance_amount,
          row.payment_status,
          row.last_payment_date || "Never"
        ]);
      } else {
        filename = "Payment_Transactions_Report";
        headers = ["Transaction Date", "Transaction ID / Ref", "Student Name", "Admission Number", "Campus", "Course", "Batch", "Amount Paid", "Payment Method", "Remarks"];
        rows = filteredTransactions.map(row => [
          row.payment_date || "—",
          row.transaction_id || "—",
          row.student?.full_name || "Unknown",
          row.student?.admission_number || "—",
          campusMap.get(row.student?.campus_id || "") || "All Campuses",
          courseMap.get(row.student?.course_id || "") || "—",
          batchMap.get(row.student?.batch_id || "") || "—",
          row.amount_paid,
          row.payment_method,
          row.remarks || "—"
        ]);
      }
    } else if (activeReport === "expense") {
      filename = "Expenses_Report";
      headers = ["Expense Date", "Title / Item", "Category", "Campus", "Amount", "Payment Method", "Notes"];
      rows = filteredExpenses.map(row => [
        row.expense_date || "—",
        row.title || "—",
        row.category?.name || "Uncategorized",
        row.campus?.name || "All Campuses",
        row.amount,
        row.payment_method,
        row.notes || "—"
      ]);
    } else if (activeReport === "batch") {
      filename = "Batch_Metrics_Report";
      headers = ["Batch Name", "Course", "Campus", "Student Strength", "Capacity", "Attendance Rate (%)", "Academic Average (%)"];
      rows = filteredBatches.map(row => [
        row.name || "—",
        courseMap.get(row.course_id || "") || "—",
        campusMap.get(row.campus_id || "") || "All Campuses",
        row.studentCount,
        row.capacity,
        `${row.attendanceRate}%`,
        `${row.avgMarks}%`
      ]);
    } else if (activeReport === "reviews") {
      filename = "Student_Reviews_Report";
      headers = ["Date", "Student Name", "Admission Number", "Campus", "Course", "Batch", "Subject", "Behavior Rating", "Study Engagement", "Homework Status", "Teacher", "Remarks"];
      rows = filteredReviews.map(row => [
        row.date_str || "—",
        row.student?.full_name || "Unknown",
        row.student?.admission_number || "—",
        campusMap.get(row.student?.campus_id || "") || "All Campuses",
        courseMap.get(row.student?.course_id || "") || "—",
        batchMap.get(row.student?.batch_id || "") || "—",
        row.subject?.name || "General",
        row.behavior_rating || "—",
        row.study_engagement || "—",
        row.homework_status || "—",
        row.teacher_name || "—",
        row.remarks || "—"
      ]);
    }

    if (rows.length === 0) {
      alert("No data available to export with the current filter settings.");
      return;
    }

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(val => {
        const cellVal = val === null || val === undefined ? "" : String(val);
        return `"${cellVal.replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Pagination variables ─────────────────────────────────────────────────────
  const currentDatasetLength = useMemo(() => {
    if (activeReport === "performance") return filteredPerformance.length;
    if (activeReport === "attendance") return filteredAttendance.length;
    if (activeReport === "fee") return feeSubTab === "accounts" ? filteredStudentFees.length : filteredTransactions.length;
    if (activeReport === "expense") return filteredExpenses.length;
    if (activeReport === "batch") return filteredBatches.length;
    if (activeReport === "reviews") return filteredReviews.length;
    return 0;
  }, [activeReport, feeSubTab, filteredPerformance, filteredAttendance, filteredStudentFees, filteredTransactions, filteredExpenses, filteredBatches, filteredReviews]);

  const totalPages = Math.ceil(currentDatasetLength / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    if (activeReport === "performance") return filteredPerformance.slice(startIdx, endIdx);
    if (activeReport === "attendance") return filteredAttendance.slice(startIdx, endIdx);
    if (activeReport === "fee") return feeSubTab === "accounts" ? filteredStudentFees.slice(startIdx, endIdx) : filteredTransactions.slice(startIdx, endIdx);
    if (activeReport === "expense") return filteredExpenses.slice(startIdx, endIdx);
    if (activeReport === "batch") return filteredBatches.slice(startIdx, endIdx);
    if (activeReport === "reviews") return filteredReviews.slice(startIdx, endIdx);
    return [];
  }, [activeReport, feeSubTab, filteredPerformance, filteredAttendance, filteredStudentFees, filteredTransactions, filteredExpenses, filteredBatches, filteredReviews, currentPage]);

  const isDataLoading = lookupsLoading || performanceLoading || attendanceLoading || feesLoading || expensesLoading || batchesLoading || reviewsLoading;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D] tracking-tight">Reports & Analytical Ledger</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Query real-time database registries, construct aggregate charts, filter lists, and export metrics sheets.
          </p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={isDataLoading || currentDatasetLength === 0}
          className="flex items-center gap-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          <Download size={14} />
          Export to Excel (CSV)
        </button>
      </header>

      {/* Tab Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {REPORT_CARDS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`bg-white p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 hover:shadow-md ${
              activeReport === tab.id
                ? "border-[#0B3C5D] shadow-md ring-2 ring-[#0B3C5D]/10"
                : "border-slate-200 shadow-sm"
            }`}
          >
            <div className={`w-9 h-9 ${tab.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <tab.icon className={tab.color} size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-[#0B3C5D] text-xs truncate leading-tight mb-1">{tab.label}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-tight line-clamp-2">{tab.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filter Panel Console */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeReport === "performance" ? "Search student name, exam, subject..." :
                activeReport === "attendance" ? "Search student name, session marker..." :
                activeReport === "fee" ? "Search student name, fee structure, reference..." :
                activeReport === "expense" ? "Search expense title, category, notes..." :
                activeReport === "reviews" ? "Search student name, teacher, remarks..." :
                "Search batch name..."
              }
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-[#0B3C5D] font-bold"
            />
          </div>

          {/* Date pickers (not for batch aggregates) */}
          {activeReport !== "batch" && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] font-bold text-[#0B3C5D] cursor-pointer"
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] font-bold text-[#0B3C5D] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dropdowns Filters List */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1.5">Filters:</span>

          {/* Campus Selector */}
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
          >
            <option value="">All Campuses</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Course Selector (not for expenses) */}
          {activeReport !== "expense" && (
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedBatch("");
              }}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Batch Selector (for student granular pages) */}
          {(activeReport === "performance" || activeReport === "attendance" || activeReport === "fee" || activeReport === "reviews") && (
            <select
              value={selectedBatch}
              disabled={!selectedCourse && !selectedCampus}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Batches</option>
              {filteredBatchesLookup.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Subject Selector (performance, attendance & reviews) */}
          {(activeReport === "performance" || activeReport === "attendance" || activeReport === "reviews") && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="">All Subjects</option>
              {filteredSubjectsLookup.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {/* Month Selector (not for batch) */}
          {activeReport !== "batch" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="">All Months</option>
              {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                <option key={m} value={m}>
                  {new Date(2000, Number(m) - 1, 1).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          )}

          {/* Attendance specific status */}
          {activeReport === "attendance" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          )}

          {/* Fee specific status/method */}
          {activeReport === "fee" && feeSubTab === "accounts" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          )}

          {activeReport === "fee" && feeSubTab === "transactions" && (
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          )}

          {/* Expense specific category & method */}
          {activeReport === "expense" && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </>
          )}

          {/* Reviews specific filters */}
          {activeReport === "reviews" && (
            <>
              <select
                value={behaviorFilter}
                onChange={(e) => setBehaviorFilter(e.target.value)}
                className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="All">All Behaviors</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Needs Imp.">Needs Imp.</option>
                <option value="Poor">Poor</option>
              </select>

              <select
                value={engagementFilter}
                onChange={(e) => setEngagementFilter(e.target.value)}
                className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="All">All Engagements</option>
                <option value="Active">Active</option>
                <option value="Passive">Passive</option>
                <option value="Distracted">Distracted</option>
              </select>

              <select
                value={homeworkFilter}
                onChange={(e) => setHomeworkFilter(e.target.value)}
                className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="All">All Homeworks</option>
                <option value="Completed">Completed</option>
                <option value="Partial">Partial</option>
                <option value="Not Completed">Not Completed</option>
                <option value="N/A">N/A</option>
              </select>
            </>
          )}

          {/* Clear button */}
          {(search || selectedCampus || selectedCourse || selectedBatch || selectedSubject || selectedMonth || startDate || endDate || statusFilter !== "All" || paymentMethodFilter !== "All" || behaviorFilter !== "All" || engagementFilter !== "All" || homeworkFilter !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCampus("");
                setSelectedCourse("");
                setSelectedBatch("");
                setSelectedSubject("");
                setSelectedMonth("");
                setStartDate("");
                setEndDate("");
                setStatusFilter("All");
                setPaymentMethodFilter("All");
                setBehaviorFilter("All");
                setEngagementFilter("All");
                setHomeworkFilter("All");
              }}
              className="text-[10px] font-black text-rose-500 uppercase hover:underline ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isDataLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-28 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 size={36} className="animate-spin text-[#0B3C5D]" />
          <p className="text-xs font-black uppercase tracking-widest text-[#0B3C5D]">Syncing Database Reports...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeReport === "performance" && (
            <PerformanceReportSection
              stats={performanceStats}
              data={paginatedData}
              totalCount={filteredPerformance.length}
              campusMap={campusMap}
              courseMap={courseMap}
              batchMap={batchMap}
            />
          )}

          {activeReport === "attendance" && (
            <AttendanceReportSection
              stats={attendanceStats}
              data={paginatedData}
              totalCount={filteredAttendance.length}
              campusMap={campusMap}
              courseMap={courseMap}
              batchMap={batchMap}
            />
          )}

          {activeReport === "fee" && (
            <FeeReportSection
              stats={feeStats}
              subTab={feeSubTab}
              setSubTab={setFeeSubTab}
              data={paginatedData}
              totalCount={currentDatasetLength}
              campusMap={campusMap}
              courseMap={courseMap}
              batchMap={batchMap}
            />
          )}

          {activeReport === "expense" && (
            <ExpenseReportSection
              stats={expenseStats}
              data={paginatedData}
              totalCount={filteredExpenses.length}
              campusMap={campusMap}
            />
          )}

          {activeReport === "batch" && (
            <BatchReportSection
              stats={batchStats}
              data={paginatedData}
              totalCount={filteredBatches.length}
              campusMap={campusMap}
              courseMap={courseMap}
            />
          )}

          {activeReport === "reviews" && (
            <StudentReviewsSection
              stats={reviewsStats}
              data={paginatedData}
              totalCount={filteredReviews.length}
              campusMap={campusMap}
              courseMap={courseMap}
              batchMap={batchMap}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, currentDatasetLength)}</strong> of <strong className="text-slate-800">{currentDatasetLength}</strong> records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#0B3C5D] rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = i + 1;
                  // Center the active page if we have more than 5 pages
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                    if (pageNum + (4 - i) > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 flex items-center justify-center font-bold rounded-lg text-xs border transition-all ${
                        currentPage === pageNum
                          ? "bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm"
                          : "bg-white border-slate-200 text-[#0B3C5D] hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#0B3C5D] rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared UI Widgets ────────────────────────────────────────────────────────
function SummaryRow({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
          <h3 className={`text-xl font-black ${item.color} leading-none`}>{item.value}</h3>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-black text-[#0B3C5D]">{title}</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{desc}</p>
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

// ── 1. Performance Report UI ──────────────────────────────────────────────────
function PerformanceReportSection({ stats, data, totalCount, campusMap, courseMap, batchMap }: any) {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Overall Score Average", value: stats.overallAvg, color: "text-[#0B3C5D]" },
        { label: "High Performing (>=85%)", value: `${stats.excellentCount} Students`, color: "text-emerald-600" },
        { label: "Needs Review (<50%)", value: `${stats.atRiskCount} Students`, color: "text-rose-600" },
        { label: "Unique Exams Logged", value: `${stats.examsCount} Exams`, color: "text-purple-600" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Average Score per Course" desc="Aggregated mean percentage score grouped by class levels">
            {stats.courseAverages.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                No course records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={stats.courseAverages} barCategoryGap={35}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="course" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v}%`, 'Average score']} />
                  <Bar dataKey="avg" fill="#0B3C5D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Student Grades Breakdown" desc="Classification shares of marks percentage">
          {stats.gradeDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No marks data.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.gradeDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.gradeDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v}%`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {stats.gradeDistribution.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Marks Records Ledger</h3>
          <span className="text-[10px] bg-[#0B3C5D]/10 text-[#0B3C5D] px-2.5 py-0.5 rounded-full font-bold uppercase">
            {totalCount} Entries Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Campus</th>
                <th className="px-4 py-3.5">Course / Batch</th>
                <th className="px-4 py-3.5">Exam Name</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5 text-center">Score</th>
                <th className="px-4 py-3.5 text-center">Percent</th>
                <th className="px-5 py-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {data.map((row: any) => {
                const pct = Number(row.percentage ?? (row.total_marks > 0 ? (row.marks_obtained / row.total_marks) * 100 : 0));
                
                return (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-800">{row.student?.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{row.student?.admission_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-bold">
                      {campusMap.get(row.student?.campus_id || row.exam?.campus_id || "") || "All Campuses"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">
                        {courseMap.get(row.student?.course_id || row.exam?.course_id || "") || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {batchMap.get(row.student?.batch_id || row.exam?.batch_id || "") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0B3C5D]">{row.exam?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold">
                        {row.subject?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {row.marks_obtained} / {row.total_marks}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        pct >= 85 ? "bg-emerald-50 text-emerald-600" :
                        pct >= 50 ? "bg-[#0B3C5D]/10 text-[#0B3C5D]" :
                        "bg-rose-50 text-rose-500"
                      }`}>
                        {Math.round(pct)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 font-bold">
                      {row.mark_date || row.exam?.exam_date || "—"}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No student scores match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 2. Attendance Report UI ───────────────────────────────────────────────────
function AttendanceReportSection({ stats, data, totalCount, campusMap, courseMap, batchMap }: any) {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Overall Attendance Rate", value: stats.overallAvg, color: "text-[#0B3C5D]" },
        { label: "Total Sessions Logged", value: `${stats.totalRecords} Records`, color: "text-emerald-600" },
        { label: "Active Markers Audited", value: `${stats.activeMarkers} Profiles`, color: "text-amber-600" },
        { label: "Admin Overrides (ATOMUS)", value: `${stats.adminCount} Records`, color: "text-purple-600" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Attendance Average by Subject" desc="Percentage rate of student attendance recorded per course subject">
            {stats.subjectData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                No subject records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={stats.subjectData} barCategoryGap={35}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v}%`, 'Attendance rate']} />
                  <Bar dataKey="percentage" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Session Marker Placement" desc="Audit share of marker role logging attendance">
          {stats.overrideDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No marker data.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.overrideDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.overrideDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v} records`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-4 w-full">
                {stats.overrideDistribution.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto font-black">{item.value} ({Math.round((item.value / stats.totalRecords) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Attendance Logs Ledger</h3>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-150 px-2.5 py-0.5 rounded-full font-bold uppercase">
            {totalCount} Entries Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Campus</th>
                <th className="px-4 py-3.5">Course / Batch</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Session Marker</th>
                <th className="px-4 py-3.5">Audit Remarks</th>
                <th className="px-5 py-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {data.map((row: any) => {
                const s = row.status || "Unmarked";
                
                return (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-800">{row.student?.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{row.student?.admission_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-bold">
                      {campusMap.get(row.campus_id || row.student?.campus_id || "") || "All Campuses"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">
                        {courseMap.get(row.course_id || row.student?.course_id || "") || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {batchMap.get(row.batch_id || row.student?.batch_id || "") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold">
                        {row.subject?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        s === "Present" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        s === "Absent" ? "bg-rose-50 text-rose-500 border border-rose-100" :
                        "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {s}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">{row.attendance_marker_name || "ATOMUS"}</div>
                      <div className="text-[9px] text-slate-400 font-medium uppercase">{row.attendance_marker_role || "Admin"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[10px] italic font-medium max-w-[150px] truncate">
                      {row.remarks || "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 font-bold">
                      {row.attendance_date || "—"}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No attendance records match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 3. Fee Report UI ──────────────────────────────────────────────────────────
function FeeReportSection({ stats, subTab, setSubTab, data, totalCount, campusMap, courseMap, batchMap }: any) {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Total Revenue Collected (YTD)", value: `₹${stats.totalCollected.toLocaleString()}`, color: "text-emerald-600" },
        { label: "Outstanding Pending Dues", value: `₹${stats.totalPending.toLocaleString()}`, color: "text-rose-600" },
        { label: "Fees Collection Rate", value: stats.collectionRate, color: "text-[#0B3C5D]" },
        { label: "Students in Dues Default", value: `${stats.defaulters} Accounts`, color: "text-amber-600" },
      ]} />

      <ChartCard title="Monthly Revenue Collection vs Outstanding Pending" desc="Aggregated transaction values plotted against remaining balances">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={stats.feeAnalyticsChartData} barGap={6} barCategoryGap={30}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
            <Bar dataKey="collected" name="Collected" fill="#0B3C5D" radius={[5, 5, 0, 0]} />
            <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4.5 justify-end mt-2">
          {[{ c: "#0B3C5D", l: "Collected Amount" }, { c: "#D4AF37", l: "Pending Outstanding" }].map(item => (
            <div key={item.l} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.c }} />
              {item.l}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Ledger Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toggle sub-tabs */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-3">
          <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setSubTab("accounts")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "accounts" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-500 hover:text-[#0B3C5D]"
              }`}
            >
              Fee Accounts Ledger
            </button>
            <button
              onClick={() => setSubTab("transactions")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "transactions" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-500 hover:text-[#0B3C5D]"
              }`}
            >
              Transactional Payments Log
            </button>
          </div>
          <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-150 px-2.5 py-0.5 rounded-full font-bold uppercase self-start sm:self-center">
            {totalCount} Records Listed
          </span>
        </div>

        {subTab === "accounts" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Campus</th>
                  <th className="px-4 py-3.5">Course / Batch</th>
                  <th className="px-4 py-3.5">Fee Structure</th>
                  <th className="px-4 py-3.5 text-right">Total Fee</th>
                  <th className="px-4 py-3.5 text-right">Discount</th>
                  <th className="px-4 py-3.5 text-right">Paid</th>
                  <th className="px-4 py-3.5 text-right">Outstanding</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Last Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-800">{row.student?.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{row.student?.admission_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-bold">
                      {campusMap.get(row.student?.campus_id || "") || "All Campuses"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">
                        {courseMap.get(row.student?.course_id || "") || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {batchMap.get(row.student?.batch_id || "") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {row.fee_structure?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">₹{row.total_fee?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-400">₹{row.discount_amount?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">₹{row.paid_amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-rose-500 font-bold">₹{row.balance_amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border leading-none ${
                        row.payment_status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        row.payment_status === "Partial" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        row.payment_status === "Overdue" ? "bg-rose-50 text-rose-500 border-rose-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 font-bold">
                      {row.last_payment_date || "Never"}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                      No student fee accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Payment Date</th>
                  <th className="px-4 py-3.5">Transaction ID / Reference</th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Campus</th>
                  <th className="px-4 py-3.5">Course / Batch</th>
                  <th className="px-4 py-3.5 text-right">Amount Paid</th>
                  <th className="px-4 py-3.5 text-center">Method</th>
                  <th className="px-5 py-3.5">Remarks / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3 text-slate-500 font-bold whitespace-nowrap">
                      {row.payment_date || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0B3C5D]">
                      {row.transaction_id || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{row.student?.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{row.student?.admission_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-bold">
                      {campusMap.get(row.student?.campus_id || "") || "All Campuses"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">
                        {courseMap.get(row.student?.course_id || "") || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {batchMap.get(row.student?.batch_id || "") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-black">₹{row.amount_paid?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-slate-600 text-[10px] font-black uppercase">
                        {row.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-bold text-[10px] max-w-[200px] truncate">
                      {row.remarks || "—"}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      No transactional logs recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 4. Expense Report UI ──────────────────────────────────────────────────────
function ExpenseReportSection({ stats, data, totalCount, campusMap }: any) {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Total Capital Outflow", value: `₹${stats.totalOutflow.toLocaleString()}`, color: "text-rose-600" },
        { label: "Mean Expense Amount", value: `₹${stats.avgExpense.toLocaleString()}`, color: "text-[#0B3C5D]" },
        { label: "Top Outflow Category", value: stats.topCategory, color: "text-purple-600" },
        { label: "Expenses Count Audited", value: `${totalCount} Payments`, color: "text-amber-600" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Outflow Trend" desc="Aggregated monthly outflow values across all active departments">
            {stats.monthlyTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                No expense trend logs available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={stats.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Amount']} />
                  <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutflow)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Expenses by Category" desc="Outflow shares grouped by institutional department categories">
          {stats.categoryDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No category divisions.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.categoryDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.categoryDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-4 w-full">
                {stats.categoryDistribution.slice(0, 4).map((item: any) => (
                  <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto font-black">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Outflow Ledger</h3>
          <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-150 px-2.5 py-0.5 rounded-full font-bold uppercase">
            {totalCount} Entries Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-4 py-3.5">Expense Title / Item</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Campus</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-4 py-3.5 text-center">Payment Method</th>
                <th className="px-5 py-3.5">Detailed Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-5 py-3 text-slate-500 font-bold whitespace-nowrap">
                    {row.expense_date}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{row.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black text-white whitespace-nowrap"
                      style={{ backgroundColor: row.category?.color || "#94a3b8" }}
                    >
                      {row.category?.name || "Uncategorized"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-bold">
                    {row.campus?.name || "All Campuses"}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 font-black">₹{row.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-black uppercase">
                      {row.payment_method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-bold text-[10px] max-w-[250px] truncate">
                    {row.notes || "—"}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No expense audit records match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 5. Batch Report UI ────────────────────────────────────────────────────────
function BatchReportSection({ stats, data, totalCount, campusMap, courseMap }: any) {
  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Active Class Batches", value: `${stats.totalBatches} Batches`, color: "text-[#0B3C5D]" },
        { label: "Academic Grade Leader", value: stats.topBatch, color: "text-emerald-600" },
        { label: "Average Batch Size", value: stats.avgSize, color: "text-purple-600" },
        { label: "Mean Attendance rate", value: stats.avgAttendance, color: "text-amber-600" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Batch Sizes comparison" desc="Comparative student strength registered per batch profile">
          {stats.batchChartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No batch size records available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.batchChartData} barCategoryGap={30}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v} students`, 'Strength']} />
                <Bar dataKey="students" fill="#0B3C5D" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Batch Attendance vs Academic Marks Average" desc="Correlation chart mapping attendance rate next to exam average percent">
          {stats.batchChartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No batch metrics available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.batchChartData} barGap={4} barCategoryGap={25}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} />
                <Bar dataKey="attendance" name="Attendance %" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="avg" name="Academic Avg %" fill="#0B3C5D" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Batches Strength & Metrics Ledger</h3>
          <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-150 px-2.5 py-0.5 rounded-full font-bold uppercase">
            {totalCount} Batches Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Batch Name</th>
                <th className="px-4 py-3.5">Campus</th>
                <th className="px-4 py-3.5">Associated Course</th>
                <th className="px-4 py-3.5 text-center">Student Strength</th>
                <th className="px-4 py-3.5 text-center">Batch Capacity</th>
                <th className="px-4 py-3.5 text-center">Attendance Rate</th>
                <th className="px-5 py-3.5 text-right">Academic Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-5 py-3 text-slate-800 font-bold">{row.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-bold">
                    {campusMap.get(row.campus_id || "") || "All Campuses"}
                  </td>
                  <td className="px-4 py-3 text-[#0B3C5D] font-bold">
                    {courseMap.get(row.course_id || "") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 font-bold">{row.studentCount} students</td>
                  <td className="px-4 py-3 text-center text-slate-400">{row.capacity} seats</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      row.attendanceRate >= 90 ? "bg-emerald-50 text-emerald-600" :
                      row.attendanceRate >= 75 ? "bg-[#0B3C5D]/10 text-[#0B3C5D]" :
                      "bg-rose-50 text-rose-500"
                    }`}>
                      {row.attendanceRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-black text-slate-800">
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded text-[10px] text-slate-700">
                      {row.avgMarks}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No batches match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 6. Student Reviews Report UI ──────────────────────────────────────────────────
function StudentReviewsSection({ stats, data, totalCount, campusMap, courseMap, batchMap }: any) {
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});

  const toggleRemark = (id: string) => {
    setExpandedRemarks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <SummaryRow items={[
        { label: "Total Reviews Logged", value: `${stats.totalReviews} Reports`, color: "text-[#0B3C5D]" },
        { label: "Excellent/Good Behavior", value: stats.excellentGoodRate, color: "text-emerald-600" },
        { label: "Active Engagement Rate", value: stats.activeEngagementRate, color: "text-blue-600" },
        { label: "Homework Completion Rate", value: stats.homeworkCompletionRate, color: "text-purple-600" },
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Behavior Ratings" desc="Daily behavior rating distribution shares">
          {stats.behaviorDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No behavior data.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.behaviorDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.behaviorDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v} reviews`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {stats.behaviorDistribution.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto font-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Study Engagement" desc="Active vs Passive vs Distracted student distribution">
          {stats.engagementDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No engagement data.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.engagementDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.engagementDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v} reviews`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-4 w-full">
                {stats.engagementDistribution.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto font-black">
                      {item.value} ({Math.round((item.value / stats.totalReviews) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Homework Status" desc="Student task submission compliance shares">
          {stats.homeworkDistribution.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
              No homework data.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={stats.homeworkDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                      {stats.homeworkDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(v) => [`${v} reviews`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {stats.homeworkDistribution.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="text-[#0B3C5D] ml-auto font-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Student Daily Reports Ledger</h3>
          <span className="text-[10px] bg-[#0B3C5D]/10 text-[#0B3C5D] px-2.5 py-0.5 rounded-full font-bold uppercase">
            {totalCount} Reports Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Campus</th>
                <th className="px-4 py-3.5">Course / Batch</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5 text-center">Behavior</th>
                <th className="px-4 py-3.5 text-center">Engagement</th>
                <th className="px-4 py-3.5 text-center">Homework</th>
                <th className="px-4 py-3.5">Teacher</th>
                <th className="px-4 py-3.5">Remarks</th>
                <th className="px-5 py-3.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {data.map((row: any) => {
                const behavior = row.behavior_rating;
                const engagement = row.study_engagement;
                const homework = row.homework_status;
                const isExpanded = !!expandedRemarks[row.id];

                return (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-800">{row.student?.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{row.student?.admission_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-bold">
                      {campusMap.get(row.student?.campus_id || "") || "All Campuses"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-bold">
                        {courseMap.get(row.student?.course_id || "") || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {batchMap.get(row.student?.batch_id || "") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.subject?.name ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400 italic"
                      }`}>
                        {row.subject?.name || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border leading-none ${
                        behavior === "Excellent" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        behavior === "Good" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        behavior === "Average" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        behavior === "Needs Imp." ? "bg-orange-50 text-orange-600 border-orange-100" :
                        "bg-rose-50 text-rose-500 border-rose-100"
                      }`}>
                        {behavior}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border leading-none ${
                        engagement === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        engagement === "Passive" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-rose-50 text-rose-500 border-rose-100"
                      }`}>
                        {engagement}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border leading-none ${
                        homework === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        homework === "Partial" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        homework === "Not Completed" ? "bg-rose-50 text-rose-500 border-rose-100" :
                        "bg-slate-50 text-slate-400 border-slate-100"
                      }`}>
                        {homework}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {row.teacher_name || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {row.remarks ? (
                        <div
                          onClick={() => toggleRemark(row.id)}
                          className="cursor-pointer transition-all"
                          title="Click to expand/collapse"
                        >
                          <p className={`text-slate-500 text-[10px] leading-tight font-medium ${
                            isExpanded ? "" : "line-clamp-2"
                          }`}>
                            {row.remarks}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-350 italic text-[10px]">No remarks</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 font-bold whitespace-nowrap">
                      {row.date_str || "—"}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                    No daily reports match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
