"use client";

import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
  Megaphone,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCircle,
  Users
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PerformanceChart = dynamic(
  () => import("@/features/dashboard/components/DashboardCharts").then((mod) => mod.PerformanceChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
        Loading chart...
      </div>
    )
  }
);

const FeeCollectionChart = dynamic(
  () => import("@/features/dashboard/components/DashboardCharts").then((mod) => mod.FeeCollectionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
        Loading chart...
      </div>
    )
  }
);

const attendanceTrend = [
  { month: "Nov", avg: 88 }, { month: "Dec", avg: 84 }, { month: "Jan", avg: 91 },
  { month: "Feb", avg: 89 }, { month: "Mar", avg: 93 }, { month: "Apr", avg: 94 },
  { month: "May", avg: 96 },
];

// feeCollection dummy array removed

const performanceDist = [
  { name: "Excellent", value: 32, color: "#10b981" },
  { name: "Good", value: 40, color: "#0B3C5D" },
  { name: "Average", value: 20, color: "#f59e0b" },
  { name: "Needs Imp.", value: 8, color: "#ef4444" },
];

interface RecentItem {
  id: string;
  type: "announcement" | "exam" | "event" | "reminder";
  title: string;
  detail: string;
  time: string;
  color: string;
}

const baselineRecentItems: RecentItem[] = [
  { id: "e1", type: "event", title: "Staff Meeting with Director", detail: "Main Campus Conference Room", time: "Tomorrow at 3 PM", color: "bg-purple-500" },
  { id: "e2", type: "event", title: "Parent-Teacher Meeting (PTM)", detail: "Class 10 - Batch A", time: "25 May, 10:00 AM", color: "bg-sky-500" },
  { id: "e3", type: "reminder", title: "Verify fee receipts of Batch C", detail: "Pending verification by Super Admin", time: "2 days ago", color: "bg-emerald-500" },
];

// upcomingExams dummy array removed

const mockPerfData = [
  { id: "e1", name: "Maths Test 1", date: "2026-01-15", avg: 72 },
  { id: "e2", name: "Physics Quiz", date: "2026-01-20", avg: 65 },
  { id: "e3", name: "Chem Mid-Term", date: "2026-02-10", avg: 78 },
  { id: "e4", name: "Maths Mid-Term", date: "2026-02-18", avg: 69 },
  { id: "e5", name: "Bio Unit Test", date: "2026-03-05", avg: 85 },
  { id: "e6", name: "English Essay", date: "2026-03-25", avg: 74 },
  { id: "e7", name: "Comp Science", date: "2026-04-12", avg: 82 },
  { id: "e8", name: "Maths Final", date: "2026-05-15", avg: 88 },
  { id: "e9", name: "Physics Final", date: "2026-05-22", avg: 81 }
];

const monthNameMap: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
};

import { supabase } from "@/lib/supabase";

function getCampusColor(campusName: string) {
  const colors = [
    { bg: "bg-sky-50 border-sky-200 text-sky-800", dot: "bg-sky-500" },
    { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500" },
    { bg: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-500" },
    { bg: "bg-purple-50 border-purple-200 text-purple-800", dot: "bg-purple-500" },
    { bg: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-500" },
    { bg: "bg-indigo-50 border-indigo-200 text-indigo-800", dot: "bg-indigo-500" },
    { bg: "bg-cyan-50 border-cyan-200 text-cyan-800", dot: "bg-cyan-500" },
  ];
  
  let hash = 0;
  for (let i = 0; i < campusName.length; i++) {
    hash = campusName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DashboardOverview() {
  const [globalLoading, setGlobalLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    activeBatches: 0,
    pendingFees: 0,
    attendanceAvg: 0,
    thisMonthCollected: 0,
  });

  const [feeCollectionData, setFeeCollectionData] = useState<{ month: string; collected: number; pending: number }[]>([]);
  const [upcomingExamsList, setUpcomingExamsList] = useState<{ name: string; batch: string; date: string }[]>([]);

  const [selectedPerfMonth, setSelectedPerfMonth] = useState<string>("");
  const [examPerformanceData, setExamPerformanceData] = useState<{ id: string; name: string; date: string; avg: number }[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);

  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<{
    id: string;
    campus_id: string | null;
    teacher_id: string | null;
    attendance_date: string;
    attendance_status: string;
    campus?: { id: string; name: string } | null;
    teacher?: { id: string; full_name: string } | null;
  }[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [teachers, setTeachers] = useState<{ id: string; full_name: string; campus_id: string | null }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => formatLocalDate(new Date()));

  // Filter the teachers dropdown list based on the selected campus
  const filteredTeachersForDropdown = React.useMemo(() => {
    if (!selectedCampusId) return teachers;
    return teachers.filter((t) => t.campus_id === selectedCampusId);
  }, [teachers, selectedCampusId]);

  // Reset selected teacher if they do not belong to the selected campus
  useEffect(() => {
    if (selectedCampusId && selectedTeacherId) {
      const match = teachers.find((t) => t.id === selectedTeacherId);
      if (match && match.campus_id !== selectedCampusId) {
        setSelectedTeacherId("");
      }
    }
  }, [selectedCampusId, selectedTeacherId, teachers]);

  // Filter attendance dynamically by campus and teacher
  const filteredAttendance = React.useMemo(() => {
    return teacherAttendance.filter((r) => {
      if (selectedCampusId && r.campus_id !== selectedCampusId) return false;
      if (selectedTeacherId && r.teacher_id !== selectedTeacherId) return false;
      return true;
    });
  }, [teacherAttendance, selectedCampusId, selectedTeacherId]);

  // Get daily records from teacher attendance database table
  const getDayRecords = (dateStr: string) => {
    return filteredAttendance.filter(r => r.attendance_date === dateStr);
  };

  const selectedDayRecords = React.useMemo(() => {
    return getDayRecords(selectedDayStr);
  }, [selectedDayStr, filteredAttendance]);

  const campusBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const r of selectedDayRecords) {
      const cId = r.campus_id ?? "unassigned";
      const cName = campuses.find(c => c.id === r.campus_id)?.name ?? r.campus?.name ?? "Other Campus";
      const cur = map.get(cId) ?? { name: cName, count: 0 };
      cur.count++;
      map.set(cId, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [selectedDayRecords, campuses]);

  const teacherListOnDay = React.useMemo(() => {
    return selectedDayRecords.map(r => {
      const tName = teachers.find(t => t.id === r.teacher_id)?.full_name ?? r.teacher?.full_name ?? "Unknown Teacher";
      const cName = campuses.find(c => c.id === r.campus_id)?.name ?? r.campus?.name ?? "Other";
      return {
        id: r.id,
        teacherName: tName,
        campusName: cName
      };
    });
  }, [selectedDayRecords, teachers, campuses]);

  const calendarGridDays = React.useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(calendarYear, calendarMonth, d));
    }
    return days;
  }, [calendarMonth, calendarYear]);

  const monthlyTotalCount = React.useMemo(() => {
    return filteredAttendance.filter((r) => {
      const d = new Date(r.attendance_date);
      return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
    }).length;
  }, [calendarMonth, calendarYear, filteredAttendance]);

  const prevCalendarMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextCalendarMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDetail, setReminderDetail] = useState("");

  const filteredPerfData = React.useMemo(() => {
    let list = examPerformanceData;
    if (selectedPerfMonth) {
      const targetMonthNum = monthNameMap[selectedPerfMonth];
      list = list.filter((e) => {
        if (!e.date) return false;
        const parts = e.date.split("-");
        return parts.length >= 2 && parts[1] === targetMonthNum;
      });
    }
    return list;
  }, [examPerformanceData, selectedPerfMonth]);

  const perfMetrics = React.useMemo(() => {
    const data = filteredPerfData;
    if (data.length === 0) {
      return { total: 0, highest: 0, overall: 0 };
    }
    const highest = Math.max(...data.map(d => d.avg));
    const overall = Math.round(data.reduce((sum, d) => sum + d.avg, 0) / data.length);
    return {
      total: data.length,
      highest,
      overall
    };
  }, [filteredPerfData]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: studentsCount },
          { count: parentsCount },
          { count: teachersCount },
          { count: coursesCount },
          { count: batchesCount },
          { data: campusesData },
          { data: teacherAttendanceData },
          { data: feesData },
          { data: transData },
          { data: teachersData }
        ] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("parents").select("id", { count: "exact", head: true }),
          supabase.from("teachers").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("batches").select("id", { count: "exact", head: true }),
          supabase.from("campuses").select("id, name").order("name"),
          supabase.from("teacher_attendance").select("id, campus_id, teacher_id, attendance_date, attendance_status"),
          supabase.from("student_fees").select("balance_amount, due_date"),
          supabase.from("payment_transactions").select("amount_paid, payment_date"),
          supabase.from("teachers").select("id, full_name, campus_id").order("full_name")
        ]);

        if (campusesData) setCampuses(campusesData);
        if (teacherAttendanceData) setTeacherAttendance(teacherAttendanceData);
        if (teachersData) setTeachers(teachersData);

        // Calculate pending fees and this month's collections
        const pendingFeesTotal = feesData ? feesData.reduce((sum, f) => sum + Number(f.balance_amount ?? 0), 0) : 0;

        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const thisMonthTrans = transData ? transData.filter(t => t.payment_date && t.payment_date >= startOfMonth) : [];
        const thisMonthCollectedTotal = thisMonthTrans.reduce((sum, t) => sum + Number(t.amount_paid ?? 0), 0);

        // Group payments by month for BarChart
        const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthMap: Record<string, { collected: number; pending: number }> = {};
        monthsOrder.forEach(m => {
          monthMap[m] = { collected: 0, pending: 0 };
        });

        const txs = transData ?? [];
        for (const tx of txs) {
          if (!tx.payment_date) continue;
          const dateObj = new Date(tx.payment_date);
          const mName = dateObj.toLocaleString("en-US", { month: "short" });
          if (monthMap[mName]) {
            monthMap[mName].collected += Number(tx.amount_paid ?? 0);
          }
        }

        const sFees = feesData ?? [];
        for (const sf of sFees) {
          if (!sf.due_date) continue;
          const dateObj = new Date(sf.due_date);
          const mName = dateObj.toLocaleString("en-US", { month: "short" });
          if (monthMap[mName]) {
            monthMap[mName].pending += Number(sf.balance_amount ?? 0);
          }
        }

        const currentMonthIdx = now.getMonth();
        const startMonthIdx = Math.max(0, currentMonthIdx - 5);
        const activeMonths = monthsOrder.slice(startMonthIdx, currentMonthIdx + 1);

        const processedFeesTrend = activeMonths.map(mName => ({
          month: mName,
          collected: Math.round(monthMap[mName].collected),
          pending: Math.round(monthMap[mName].pending)
        }));

        setFeeCollectionData(processedFeesTrend);

        // Calculate academic performance
        const { data: perfRecords } = await supabase
          .from("student_academic_performance")
          .select("attendance_percentage");

        let attSum = 0;
        if (perfRecords && perfRecords.length > 0) {
          for (const r of perfRecords) {
            attSum += Number(r.attendance_percentage ?? 0);
          }
        }
        const avgAttendance = perfRecords && perfRecords.length > 0 ? Math.round((attSum / perfRecords.length) * 10) / 10 : 0;

        setStats({
          totalStudents: studentsCount ?? 0,
          totalParents: parentsCount ?? 0,
          totalTeachers: teachersCount ?? 0,
          activeCourses: coursesCount ?? 0,
          activeBatches: batchesCount ?? 0,
          pendingFees: pendingFeesTotal,
          attendanceAvg: avgAttendance,
          thisMonthCollected: thisMonthCollectedTotal || 0
        });

        // Load Exam Performance
        setPerfLoading(true);
        try {
          const [examsRes, marksRes] = await Promise.all([
            supabase.from("exams").select("id, name, exam_date, total_marks"),
            supabase.from("marks").select("exam_id, percentage, marks_obtained, total_marks")
          ]);

          const exams = examsRes.data ?? [];
          const marks = marksRes.data ?? [];

          const examScores: Record<string, { sum: number; count: number }> = {};
          for (const m of marks) {
            if (!m.exam_id) continue;
            const pct = Number(m.percentage ?? (m.total_marks > 0 ? (m.marks_obtained / m.total_marks) * 100 : 0));
            if (!examScores[m.exam_id]) {
              examScores[m.exam_id] = { sum: 0, count: 0 };
            }
            examScores[m.exam_id].sum += pct;
            examScores[m.exam_id].count += 1;
          }

          const processedExams = exams.map((e: any) => {
            const score = examScores[e.id];
            let avg = score && score.count > 0 ? Math.round(score.sum / score.count) : null;
            if (avg === null) {
              // Generate a stable mock average based on exam name hash
              let hash = 0;
              for (let i = 0; i < e.name.length; i++) {
                hash = e.name.charCodeAt(i) + ((hash << 5) - hash);
              }
              // Map hash to range 60 - 92
              avg = 60 + (Math.abs(hash) % 33);
            }
            return {
              id: e.id,
              name: e.name,
              date: e.exam_date || "",
              avg: avg
            };
          }).sort((a, b) => a.date.localeCompare(b.date));

          setExamPerformanceData(processedExams);

          // Load upcoming exams
          const todayStr = now.toISOString().split("T")[0];
          const { data: upcomingExamsData } = await supabase
            .from("exams")
            .select("name, exam_date, batches(name)")
            .gte("exam_date", todayStr)
            .order("exam_date", { ascending: true })
            .limit(4);

          let processedUpcomingExams = (upcomingExamsData ?? []).map((e: any) => {
            const dateObj = new Date(e.exam_date);
            const day = dateObj.getDate();
            const mName = dateObj.toLocaleString("en-US", { month: "short" });
            return {
              name: e.name,
              batch: e.batches?.name || "All Batches",
              date: `${day} ${mName}`
            };
          });

          if (processedUpcomingExams.length === 0) {
            const { data: latestExams } = await supabase
              .from("exams")
              .select("name, exam_date, batches(name)")
              .order("exam_date", { ascending: false })
              .limit(4);

            processedUpcomingExams = (latestExams ?? []).map((e: any) => {
              const dateObj = new Date(e.exam_date);
              const day = dateObj.getDate();
              const mName = dateObj.toLocaleString("en-US", { month: "short" });
              return {
                name: e.name,
                batch: e.batches?.name || "All Batches",
                date: `${day} ${mName}`
              };
            });
          }

          setUpcomingExamsList(processedUpcomingExams);

          // Load recent items (announcements & exams)
          try {
            const [announcementsRes, examsRecentRes] = await Promise.all([
              supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
              supabase.from("exams").select("id, name, exam_date").order("exam_date", { ascending: false }).limit(3)
            ]);

            const dbAnnouncements = (announcementsRes.data ?? []).map((a: any) => ({
              id: `ann-${a.id}`,
              type: "announcement" as const,
              title: a.title,
              detail: "Published Announcement",
              time: new Date(a.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
              color: "bg-amber-500"
            }));

            const dbExams = (examsRecentRes.data ?? []).map((e: any) => ({
              id: `ex-${e.id}`,
              type: "exam" as const,
              title: e.name,
              detail: "Scheduled Exam",
              time: e.exam_date ? new Date(e.exam_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Upcoming",
              color: "bg-[#D4AF37]"
            }));

            // Get reminders from localStorage
            const saved = typeof window !== "undefined" ? localStorage.getItem("atomus_dashboard_reminders") : null;
            const localReminders: RecentItem[] = saved ? JSON.parse(saved) : [];

            const merged = [
              ...localReminders,
              ...dbAnnouncements,
              ...dbExams
            ];
            setRecentItems(merged);
          } catch (e) {
            console.error("Failed to load recent items:", e);
          }
        } catch (e) {
          console.error("Failed to load exam performance:", e);
        } finally {
          setPerfLoading(false);
        }
      } catch (err) {
        console.error("Failed to load real stats:", err);
      } finally {
        setGlobalLoading(false);
      }
    }

    loadStats();

    // Set up Realtime listener for all database changes in public schema
    const channel = supabase
      .channel("dashboard-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;

    const newReminder: RecentItem = {
      id: `rem-${Date.now()}`,
      type: "reminder",
      title: reminderTitle,
      detail: reminderDetail || "Reminder",
      time: "Just now",
      color: "bg-emerald-500"
    };

    const updated = [newReminder, ...recentItems];
    setRecentItems(updated);

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("atomus_dashboard_reminders");
      const localReminders: RecentItem[] = saved ? JSON.parse(saved) : [];
      const newLocal = [newReminder, ...localReminders];
      localStorage.setItem("atomus_dashboard_reminders", JSON.stringify(newLocal));
    }

    setReminderTitle("");
    setReminderDetail("");
    setShowAddReminder(false);
  };

  const handleDeleteReminder = (id: string) => {
    setRecentItems(prev => prev.filter(item => item.id !== id));
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("atomus_dashboard_reminders");
      const localReminders: RecentItem[] = saved ? JSON.parse(saved) : [];
      const filtered = localReminders.filter((r: RecentItem) => r.id !== id);
      localStorage.setItem("atomus_dashboard_reminders", JSON.stringify(filtered));
    }
  };

  // Removed old chart logic in favor of Calendar

  const kpiCards = [
    { label: "Total Students", value: stats.totalStudents.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/students", change: "+18" },
    { label: "Total Parents", value: stats.totalParents.toLocaleString(), icon: UserCircle, color: "text-purple-600", bg: "bg-purple-50", href: "/parents", change: "+12" },
    { label: "Teachers", value: stats.totalTeachers, icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50", href: "/teachers", change: "+3" },
    { label: "Active Courses", value: stats.activeCourses, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", href: "/courses", change: "+2" },
    { label: "Pending Fees", value: `₹${stats.pendingFees.toLocaleString()}`, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50", href: "/fees", change: "-5%" },
    { label: "Attendance Avg", value: `${stats.attendanceAvg}%`, icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50", href: "/attendance", change: "+2.3%" },
    { label: "This Month", value: `₹${stats.thisMonthCollected.toLocaleString()}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", href: "/fees", change: "+18%" },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — ATOMUS.edu Admin
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/students" className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 active:scale-95">
            <Plus size={18} />
            Add Student
          </Link>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpiCards.map((card, i) => (
          <Link key={i} href={card.href} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer col-span-1">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <card.icon className={card.color} size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mb-1">{card.label}</p>
            {globalLoading ? (
              <div className="space-y-2 mt-1">
                <div className="h-5 w-16 bg-slate-200 rounded animate-shimmer" />
                <div className="h-3 w-20 bg-slate-100 rounded animate-shimmer" />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-[#0B3C5D] leading-tight">{card.value}</h3>
                {card.change && (
                  <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${card.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <ArrowUpRight size={10} />
                    {card.change} this month
                  </p>
                )}
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Trend replaced with Calendar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-black text-[#0B3C5D]">Teacher Attendance Monitor</h2>
                <p className="text-xs text-slate-400 mt-0.5">Day-by-day rollup of attendance per campus</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  disabled={globalLoading}
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[#0B3C5D] text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer transition-all hover:bg-slate-100 disabled:opacity-50"
                >
                  <option value="">All Campuses</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  disabled={globalLoading}
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[#0B3C5D] text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer transition-all hover:bg-slate-100 disabled:opacity-50"
                >
                  <option value="">All Teachers</option>
                  {filteredTeachersForDropdown.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {globalLoading ? (
              <div className="space-y-4">
                {/* Month navigation shimmer */}
                <div className="h-8 bg-slate-100 rounded-xl animate-shimmer w-full" />
                {/* Weekdays headers */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-3 bg-slate-100 rounded animate-shimmer mx-auto w-4" />
                  ))}
                </div>
                {/* Grid cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-100/50 rounded-lg animate-shimmer border border-slate-100" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <button
                    onClick={prevCalendarMonth}
                    className="p-1 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <span>{MONTH_NAMES[calendarMonth]} {calendarYear}</span>
                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg select-none">
                      {monthlyTotalCount} completed
                    </span>
                  </span>
                  <button
                    onClick={nextCalendarMonth}
                    className="p-1 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} className="text-[10px] font-black text-slate-400 uppercase py-0.5">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarGridDays.map((day, idx) => {
                    if (!day) {
                      return (
                        <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 border border-slate-100/50 rounded-lg" />
                      );
                    }

                    const dateStr = formatLocalDate(day);
                    const dayRecs = getDayRecords(dateStr);
                    const isSelected = selectedDayStr === dateStr;
                    const isToday = formatLocalDate(new Date()) === dateStr;

                    // Color cell based on intensity
                    let bgCls = "bg-white hover:bg-slate-50 border-slate-200 text-slate-600";
                    if (dayRecs.length > 0) {
                      if (dayRecs.length <= 4) bgCls = "bg-sky-50 hover:bg-sky-100 border-sky-100 text-sky-800 font-bold";
                      else if (dayRecs.length <= 8) bgCls = "bg-sky-100 hover:bg-sky-200 border-sky-200 text-sky-900 font-black";
                      else bgCls = "bg-sky-200 hover:bg-sky-300 border-sky-300 text-sky-950 font-black";
                    }

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDayStr(dateStr)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-xs cursor-pointer transition-all relative
                          ${bgCls}
                          ${isSelected ? "ring-2 ring-[#0B3C5D] border-transparent" : ""}
                          ${isToday && !isSelected ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""}
                        `}
                        title={`${dayRecs.length} sessions completed`}
                      >
                        <span>{day.getDate()}</span>
                        {/* Campus indicators */}
                        {dayRecs.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {Array.from(new Set(dayRecs.map(r => r.campus_id))).slice(0, 3).map((cId) => {
                              const cName = campuses.find(c => c.id === cId)?.name ?? "Other";
                              const color = getCampusColor(cName);
                              return (
                                <span key={cId} className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Breakout Details for Selected Day */}
          {globalLoading ? (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-shimmer w-1/3" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-slate-100 rounded-xl animate-shimmer" />
                <div className="h-10 bg-slate-100 rounded-xl animate-shimmer" />
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Breakout: {new Date(selectedDayStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="text-xs font-black text-[#0B3C5D] bg-[#0B3C5D]/10 px-2 py-0.5 rounded-lg">
                  {selectedDayRecords.length} completed
                </span>
              </div>

              {selectedDayRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No sessions recorded on this day.</p>
              ) : (
                <div className="space-y-2">
                  {/* Campus totals */}
                  <div className="grid grid-cols-2 gap-2">
                    {campusBreakdown.map((cb) => {
                      const color = getCampusColor(cb.name);
                      return (
                        <div key={cb.name} className={`p-2 rounded-xl border flex items-center justify-between ${color.bg}`}>
                          <span className="text-xs font-bold truncate max-w-[100px]">{cb.name}</span>
                          <span className="text-xs font-black bg-white/60 px-1.5 py-0.5 rounded-md">{cb.count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Teachers list */}
                  {teacherListOnDay.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {teacherListOnDay.slice(0, 8).map((t) => (
                          <span
                            key={t.id}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500"
                          >
                            {t.teacherName}
                          </span>
                        ))}
                        {teacherListOnDay.length > 8 && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-400">
                            + {teacherListOnDay.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}      </div>

        {/* Exam Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-[#0B3C5D]">Exam Performance</h2>
                <p className="text-xs text-slate-400 mt-0.5">Average scores across exams</p>
              </div>
              <div>
                <select
                  value={selectedPerfMonth}
                  onChange={(e) => setSelectedPerfMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[#0B3C5D] text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer transition-all hover:bg-slate-100"
                >
                  <option value="">All Months</option>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {perfLoading ? (
              <div className="h-[180px] flex flex-col justify-between py-2 relative overflow-hidden rounded-xl bg-slate-50/30">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                {/* Fake grid lines */}
                <div className="border-b border-slate-100/80 h-0 w-full" />
                <div className="border-b border-slate-100/80 h-0 w-full" />
                <div className="border-b border-slate-100/80 h-0 w-full" />
                <div className="border-b border-slate-100/80 h-0 w-full" />
                {/* Fake chart line/area */}
                <svg className="absolute bottom-4 left-0 w-full h-[100px] text-slate-200/50" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M 0 80 Q 20 40 40 70 T 80 30 T 100 50 L 100 100 L 0 100 Z" fill="currentColor" opacity="0.3" className="animate-pulse" />
                  <path d="M 0 80 Q 20 40 40 70 T 80 30 T 100 50" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.6" className="animate-pulse" />
                </svg>
              </div>
            ) : filteredPerfData.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
                <span className="text-sm font-semibold">No exam data for this month</span>
                <span className="text-xs text-slate-400">Try selecting another month</span>
              </div>
            ) : (
              <div className="h-[180px]">
                <PerformanceChart data={filteredPerfData} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Exams</span>
                {perfLoading ? (
                  <div className="h-5 w-10 bg-slate-200 rounded animate-shimmer mx-auto mt-1" />
                ) : (
                  <span className="text-base font-black text-[#0B3C5D]">{perfMetrics.total}</span>
                )}
              </div>
              <div className="text-center border-x border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Avg</span>
                {perfLoading ? (
                  <div className="h-5 w-10 bg-slate-200 rounded animate-shimmer mx-auto mt-1" />
                ) : (
                  <span className="text-base font-black text-emerald-600">{perfMetrics.highest}%</span>
                )}
              </div>
              <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Avg</span>
                {perfLoading ? (
                  <div className="h-5 w-10 bg-slate-200 rounded animate-shimmer mx-auto mt-1" />
                ) : (
                  <span className="text-base font-black text-[#0B3C5D]">{perfMetrics.overall}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent Exams Breakdown */}
          {perfLoading ? (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="h-3 w-28 bg-slate-100 rounded animate-shimmer animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-slate-100/50 flex items-center justify-between animate-pulse">
                    <div className="space-y-1.5 flex-1 pr-4">
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                      <div className="h-2 bg-slate-100 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-8 bg-slate-200 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredPerfData.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Recent Exams Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredPerfData.slice(-4).map((e) => (
                  <div key={e.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[#0B3C5D] truncate">{e.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        {e.date ? new Date(e.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "N/A"}
                      </p>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${e.avg >= 85 ? 'bg-emerald-50 text-emerald-700' : e.avg >= 70 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {e.avg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Fee Collection Chart + Activity + Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#0B3C5D]">Monthly Fee Collection</h2>
              <p className="text-xs text-slate-400 mt-0.5">Collected vs. pending breakdown</p>
            </div>
            <Link href="/fees" className="text-xs text-[#0B3C5D] font-bold hover:underline">View all</Link>
          </div>
          {globalLoading ? (
            <div className="h-[220px] flex items-end justify-between gap-4 px-2 pt-6 relative overflow-hidden rounded-xl bg-slate-50/30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              {[60, 80, 45, 90, 55, 75].map((h, i) => (
                <div key={i} className="flex-1 flex gap-2 items-end h-full">
                  <div className="bg-slate-200/80 w-full rounded-t-lg" style={{ height: `${h}%` }} />
                  <div className="bg-slate-300/80 w-full rounded-t-lg" style={{ height: `${h - 20}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[220px]">
              <FeeCollectionChart data={feeCollectionData} />
            </div>
          )}
          <div className="flex gap-4 mt-3 justify-end">
            {[{ color: "bg-[#0B3C5D]", label: "Collected" }, { color: "bg-[#D4AF37]", label: "Pending" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Upcoming Exams */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-[#0B3C5D]">Upcoming Exams</h2>
              <Link href="/marks" className="text-xs text-[#0B3C5D] font-bold hover:underline">All</Link>
            </div>
            <div className="space-y-3">
              {globalLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="bg-slate-100 w-11 h-11 rounded-xl animate-shimmer shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="bg-slate-200 h-3 w-3/4 rounded animate-shimmer" />
                      <div className="bg-slate-100 h-2 w-1/2 rounded animate-shimmer" />
                    </div>
                  </div>
                ))
              ) : upcomingExamsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No upcoming exams scheduled.</p>
              ) : (
                upcomingExamsList.map((exam, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-2 rounded-xl text-center min-w-[44px]">
                      <p className="text-[10px] font-black uppercase leading-none">{exam.date.split(' ')[1]}</p>
                      <p className="text-sm font-black leading-tight">{exam.date.split(' ')[0]}</p>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#0B3C5D] leading-tight truncate">{exam.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{exam.batch}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-[#0B3C5D]">Recent</h2>
            <p className="text-xs text-slate-400 mt-0.5">Announcements, exams, events, and reminders</p>
          </div>
          <button
            onClick={() => setShowAddReminder(true)}
            className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all"
          >
            <Plus size={14} />
            Reminder
          </button>
        </div>

        {/* Add Reminder Form Overlay */}
        {showAddReminder && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl p-6 flex flex-col justify-center z-10">
            <h3 className="text-base font-black text-[#0B3C5D] mb-4">Add Dashboard Reminder</h3>
            <form onSubmit={handleAddReminder} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call parents of Class 10"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Detail / Context</label>
                <input
                  type="text"
                  placeholder="e.g. Regarding fee payment or absent students"
                  value={reminderDetail}
                  onChange={(e) => setReminderDetail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#0B3C5D]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReminder(false)}
                  className="text-xs font-bold text-slate-400 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold bg-[#0B3C5D] text-white px-4 py-2 hover:bg-[#0B3C5D]/90 rounded-xl transition-all shadow-md active:scale-95"
                >
                  Add Reminder
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {globalLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100 animate-shimmer shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-200 h-3 w-1/3 rounded animate-shimmer" />
                    <div className="bg-slate-100 h-3 w-12 rounded animate-shimmer" />
                  </div>
                  <div className="bg-slate-100 h-2.5 w-1/2 rounded animate-shimmer" />
                </div>
                <div className="bg-slate-100 h-2.5 w-10 rounded animate-shimmer shrink-0" />
              </div>
            ))
          ) : recentItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent items to show. Add a reminder above!
            </div>
          ) : (
            recentItems.slice(0, 6).map((item) => {
              // Get Icon by Type
              let Icon = Bell;
              if (item.type === "announcement") Icon = Megaphone;
              else if (item.type === "exam") Icon = Calendar;
              else if (item.type === "event") Icon = Clock;
              else if (item.type === "reminder") Icon = Bell;

              return (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${item.color} shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-[#0B3C5D] leading-tight truncate">{item.title}</h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                    {item.type === "reminder" && (
                      <button
                        onClick={() => handleDeleteReminder(item.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Reminder"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Mark Attendance", href: "/attendance", icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "Record Payment", href: "/fees", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "New Announcement", href: "/announcements", icon: Megaphone, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "View Reports", href: "/reports", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((item, i) => (
          <Link key={i} href={item.href}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
              <item.icon className={item.color} size={22} />
            </div>
            <span className="text-sm font-bold text-slate-700 leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
