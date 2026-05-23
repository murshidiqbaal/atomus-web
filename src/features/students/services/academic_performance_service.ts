import { supabase } from "@/lib/supabase";

export interface StudentPerformanceData {
  id?: string;
  student_id: string;
  campus_id: string | null;
  course_id: string | null;
  batch_id: string | null;
  attendance_percentage: number;
  marks_percentage: number;
  academic_performance_score: number;
  performance_rank: number | null;
  progress_status: "Excellent" | "Good" | "Average" | "Needs Improvement" | "At Risk";
  total_exams: number;
  total_periods: number;
  present_periods: number;
  absent_periods: number;
  late_periods: number;
  leave_periods: number;
  calculated_at?: string;
  updated_at?: string;
}

export const getAttendanceWeight = (status: string): number | null => {
  switch (status) {
    case "Present":
      return 1.0;
    case "Late":
      return 0.75;
    case "Leave":
      return 0.50;
    case "Absent":
      return 0.0;
    default:
      return null; // Ignore 'Unmarked' or others
  }
};

export const getProgressStatus = (score: number): "Excellent" | "Good" | "Average" | "Needs Improvement" | "At Risk" => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  if (score >= 40) return "Needs Improvement";
  return "At Risk";
};

export const academicPerformanceService = {
  /**
   * Recalculates stats for a single student.
   * Pulls attendance and marks, calculates averages and scores,
   * then upserts to student_academic_performance and updates the students table.
   */
  async recalculateForStudent(studentId: string): Promise<StudentPerformanceData> {
    // 1. Fetch student info
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id, campus_id, course_id, batch_id")
      .eq("id", studentId)
      .single();

    if (studentErr || !student) {
      throw new Error(`Student not found: ${studentErr?.message || "unknown"}`);
    }

    // 2. Fetch all attendance logs for the student from both attendance and subject_attendance
    const [attRes, subAttRes] = await Promise.all([
      supabase.from("attendance").select("status, subject_id, attendance_date").eq("student_id", studentId),
      supabase.from("subject_attendance").select("status, subject_id, attendance_date").eq("student_id", studentId),
    ]);

    const attRecords = attRes.data ?? [];
    const subAttRecords = subAttRes.data ?? [];

    // Aggregate attendance periods
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let weightedSum = 0;
    let validPeriods = 0;

    // Use a unique set to prevent double counting if the same day/subject is marked in both tables
    const processedKeys = new Set<string>();

    const processRecord = (status: string, date: string, subId?: string | null) => {
      const key = `${date}|${subId ?? "none"}`;
      if (processedKeys.has(key)) return;
      processedKeys.add(key);

      const weight = getAttendanceWeight(status);
      if (weight !== null) {
        weightedSum += weight;
        validPeriods++;

        if (status === "Present") presentCount++;
        else if (status === "Absent") absentCount++;
        else if (status === "Late") lateCount++;
        else if (status === "Leave") leaveCount++;
      }
    };

    // Process period-level attendance records first
    for (const r of attRecords) {
      processRecord(r.status, r.attendance_date, r.subject_id);
    }
    // Process subject-level summarized records
    for (const r of subAttRecords) {
      processRecord(r.status, r.attendance_date, r.subject_id);
    }

    const attendancePercentage = validPeriods > 0 ? (weightedSum / validPeriods) * 100 : 0;

    // 3. Fetch marks
    const { data: marksRecords } = await supabase
      .from("marks")
      .select("marks_obtained, total_marks, exam_id")
      .eq("student_id", studentId);

    let marksSum = 0;
    let totalMarksSum = 0;
    const examIds = new Set<string>();

    for (const m of marksRecords ?? []) {
      const obtained = Number(m.marks_obtained ?? 0);
      const total = Number(m.total_marks ?? 100);
      if (total > 0) {
        marksSum += obtained;
        totalMarksSum += total;
        if (m.exam_id) examIds.add(m.exam_id);
      }
    }

    const marksPercentage = totalMarksSum > 0 ? (marksSum / totalMarksSum) * 100 : 0;

    // 4. Calculate Academic Performance Score (30% Attendance + 70% Marks)
    const academicScore = (attendancePercentage * 0.3) + (marksPercentage * 0.7);
    const progressStatus = getProgressStatus(academicScore);

    // 5. Build payload
    const performancePayload: StudentPerformanceData = {
      student_id: studentId,
      campus_id: student.campus_id,
      course_id: student.course_id,
      batch_id: student.batch_id,
      attendance_percentage: Math.round(attendancePercentage * 100) / 100,
      marks_percentage: Math.round(marksPercentage * 100) / 100,
      academic_performance_score: Math.round(academicScore * 100) / 100,
      performance_rank: null, // Will be computed in the ranking step
      progress_status: progressStatus,
      total_exams: examIds.size,
      total_periods: validPeriods,
      present_periods: presentCount,
      absent_periods: absentCount,
      late_periods: lateCount,
      leave_periods: leaveCount,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 6. Upsert to student_academic_performance
    const { error: upsertErr } = await supabase
      .from("student_academic_performance")
      .upsert(performancePayload, { onConflict: "student_id" });

    if (upsertErr) {
      console.error(`Error upserting academic performance for student ${studentId}:`, upsertErr);
    }

    // 7. Update students table (backward compatibility columns)
    const { error: updateStudentErr } = await supabase
      .from("students")
      .update({
        attendance_percentage: Math.round(attendancePercentage * 100) / 100,
        progress_status: progressStatus
      })
      .eq("id", studentId);

    if (updateStudentErr) {
      console.error(`Error updating student info for student ${studentId}:`, updateStudentErr);
    }

    return performancePayload;
  },

  /**
   * Recalculates stats for all students in a batch.
   */
  async recalculateForBatch(batchId: string): Promise<void> {
    const { data: students, error } = await supabase
      .from("students")
      .select("id")
      .eq("batch_id", batchId);

    if (error || !students) {
      console.error(`Error fetching students for batch ${batchId}:`, error);
      return;
    }

    console.log(`Recalculating performance for ${students.length} students in batch ${batchId}...`);
    for (const student of students) {
      try {
        await this.recalculateForStudent(student.id);
      } catch (err) {
        console.error(`Failed to recalculate student ${student.id}:`, err);
      }
    }

    // Update rankings globally after modifying scores
    await this.recalculateAllRankings();
  },

  /**
   * Recalculates performance_rank for all students in the performance table.
   * Ranks are sorted in descending order of academic_performance_score.
   */
  async recalculateAllRankings(): Promise<void> {
    const { data, error } = await supabase
      .from("student_academic_performance")
      .select("student_id, academic_performance_score")
      .order("academic_performance_score", { ascending: false });

    if (error || !data) {
      console.error("Error fetching academic performance scores for ranking:", error);
      return;
    }

    console.log(`Updating ranks for ${data.length} student records...`);
    const updates = data.map((item, idx) => ({
      student_id: item.student_id,
      performance_rank: idx + 1,
    }));

    if (updates.length > 0) {
      const { error: rankErr } = await supabase
        .from("student_academic_performance")
        .upsert(updates, { onConflict: "student_id" });

      if (rankErr) {
        console.error("Error updating performance ranks:", rankErr);
      }
    }
  },

  /**
   * Retrieves high-level analytics stats from student_academic_performance.
   */
  async getAnalyticsDashboardStats() {
    const { data, error } = await supabase
      .from("student_academic_performance")
      .select("attendance_percentage, marks_percentage, academic_performance_score, progress_status");

    if (error || !data) {
      return {
        avgAttendance: 0,
        avgMarks: 0,
        avgAcademicScore: 0,
        excellentCount: 0,
        goodCount: 0,
        averageCount: 0,
        needsImprovementCount: 0,
        atRiskCount: 0,
        totalEvaluated: 0,
      };
    }

    let attSum = 0;
    let marksSum = 0;
    let scoreSum = 0;
    let excellent = 0;
    let good = 0;
    let average = 0;
    let needsImp = 0;
    let atRisk = 0;

    for (const r of data) {
      attSum += Number(r.attendance_percentage ?? 0);
      marksSum += Number(r.marks_percentage ?? 0);
      scoreSum += Number(r.academic_performance_score ?? 0);

      const status = r.progress_status;
      if (status === "Excellent") excellent++;
      else if (status === "Good") good++;
      else if (status === "Average") average++;
      else if (status === "Needs Improvement") needsImp++;
      else if (status === "At Risk") atRisk++;
    }

    const n = data.length || 1;
    return {
      avgAttendance: Math.round((attSum / n) * 10) / 10,
      avgMarks: Math.round((marksSum / n) * 10) / 10,
      avgAcademicScore: Math.round((scoreSum / n) * 10) / 10,
      excellentCount: excellent,
      goodCount: good,
      averageCount: average,
      needsImprovementCount: needsImp,
      atRiskCount: atRisk,
      totalEvaluated: data.length,
    };
  },

  /**
   * Gathers subject-wise performance averages.
   */
  async getSubjectAnalytics(filters?: { campus_id?: string; course_id?: string; batch_id?: string }) {
    // 1. Fetch subjects
    let subQ = supabase.from("subjects").select("id, name, course_id");
    if (filters?.course_id) subQ = subQ.eq("course_id", filters.course_id);
    const { data: subjects } = await subQ;
    if (!subjects || subjects.length === 0) return [];

    // 2. Fetch all marks and attendance grouped by subject
    const subjectIds = subjects.map(s => s.id);
    
    // Fetch marks
    let marksQ = supabase
      .from("marks")
      .select("subject_id, marks_obtained, total_marks, student_id")
      .in("subject_id", subjectIds);
    
    if (filters?.batch_id) {
      marksQ = marksQ.eq("students.batch_id", filters.batch_id);
    } else if (filters?.course_id) {
      marksQ = marksQ.eq("students.course_id", filters.course_id);
    } else if (filters?.campus_id) {
      marksQ = marksQ.eq("students.campus_id", filters.campus_id);
    }
    const { data: marks } = await marksQ;

    // Fetch attendance
    let attQ = supabase
      .from("attendance")
      .select("subject_id, status, student_id")
      .in("subject_id", subjectIds);

    if (filters?.batch_id) {
      attQ = attQ.eq("batch_id", filters.batch_id);
    } else if (filters?.course_id) {
      attQ = attQ.eq("course_id", filters.course_id);
    } else if (filters?.campus_id) {
      attQ = attQ.eq("campus_id", filters.campus_id);
    }
    const { data: attendance } = await attQ;

    // Aggregate client side
    return subjects.map(subject => {
      // Aggregate marks
      const subMarks = (marks ?? []).filter(m => m.subject_id === subject.id);
      let marksSum = 0;
      let totalMarksSum = 0;
      for (const m of subMarks) {
        marksSum += Number(m.marks_obtained ?? 0);
        totalMarksSum += Number(m.total_marks ?? 100);
      }
      const marksAvg = totalMarksSum > 0 ? (marksSum / totalMarksSum) * 100 : 0;

      // Aggregate attendance
      const subAtt = (attendance ?? []).filter(a => a.subject_id === subject.id);
      let attWeightedSum = 0;
      let attValidPeriods = 0;
      for (const a of subAtt) {
        const weight = getAttendanceWeight(a.status);
        if (weight !== null) {
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
        studentCount: new Set([...subMarks.map(m => m.student_id), ...subAtt.map(a => a.student_id)]).size,
      };
    }).sort((a, b) => b.avgMarks - a.avgMarks);
  }
};
