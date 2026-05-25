const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const getAttendanceWeight = (status) => {
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
      return null;
  }
};

const getProgressStatus = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  if (score >= 40) return "Needs Improvement";
  return "At Risk";
};

async function recalculateForStudent(studentId) {
  // 1. Fetch student info
  const { data: student, error: studentErr } = await supabaseAdmin
    .from("students")
    .select("id, campus_id, course_id, batch_id")
    .eq("id", studentId)
    .single();

  if (studentErr || !student) {
    throw new Error(`Student not found: ${studentErr?.message || "unknown"}`);
  }

  // 2. Fetch all attendance logs
  const [attRes, subAttRes] = await Promise.all([
    supabaseAdmin.from("attendance").select("status, subject_id, attendance_date").eq("student_id", studentId),
    supabaseAdmin.from("subject_attendance").select("status, subject_id, attendance_date").eq("student_id", studentId),
  ]);

  const attRecords = attRes.data ?? [];
  const subAttRecords = subAttRes.data ?? [];

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let weightedSum = 0;
  let validPeriods = 0;

  const processedKeys = new Set();

  const processRecord = (status, date, subId) => {
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

  for (const r of attRecords) {
    processRecord(r.status, r.attendance_date, r.subject_id);
  }
  for (const r of subAttRecords) {
    processRecord(r.status, r.attendance_date, r.subject_id);
  }

  const attendancePercentage = validPeriods > 0 ? (weightedSum / validPeriods) * 100 : 0;

  // 3. Fetch marks
  const { data: marksRecords } = await supabaseAdmin
    .from("marks")
    .select("marks_obtained, total_marks, exam_id, subject_id")
    .eq("student_id", studentId);

  const examsWithSubjectSpecificMarks = new Set();
  for (const m of marksRecords ?? []) {
    if (m.exam_id && m.subject_id !== null && m.subject_id !== undefined) {
      examsWithSubjectSpecificMarks.add(m.exam_id);
    }
  }

  let marksSum = 0;
  let totalMarksSum = 0;
  const examIds = new Set();

  for (const m of marksRecords ?? []) {
    // Exclude overall marks (subject_id == null) if there are subject-specific marks for this exam
    if (m.exam_id && (m.subject_id === null || m.subject_id === undefined) && examsWithSubjectSpecificMarks.has(m.exam_id)) {
      continue;
    }

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
  const performancePayload = {
    student_id: studentId,
    campus_id: student.campus_id,
    course_id: student.course_id,
    batch_id: student.batch_id,
    attendance_percentage: Math.round(attendancePercentage * 100) / 100,
    marks_percentage: Math.round(marksPercentage * 100) / 100,
    academic_performance_score: Math.round(academicScore * 100) / 100,
    performance_rank: null,
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
  const { error: upsertErr } = await supabaseAdmin
    .from("student_academic_performance")
    .upsert(performancePayload, { onConflict: "student_id" });

  if (upsertErr) {
    console.error(`Error upserting academic performance for student ${studentId}:`, upsertErr);
  } else {
    console.log(`Successfully updated performance score to ${performancePayload.academic_performance_score} (Marks %: ${performancePayload.marks_percentage})`);
  }

  // 7. Update students table (backward compatibility columns)
  const { error: updateStudentErr } = await supabaseAdmin
    .from("students")
    .update({
      attendance_percentage: Math.round(attendancePercentage * 100) / 100,
      progress_status: progressStatus
    })
    .eq("id", studentId);

  if (updateStudentErr) {
    console.error(`Error updating student info for student ${studentId}:`, updateStudentErr);
  }
}

async function run() {
  const studentId = 'd978fb66-f456-465e-93c8-af644d22db0b';
  console.log('Recalculating for student:', studentId);
  await recalculateForStudent(studentId);
}

run();
