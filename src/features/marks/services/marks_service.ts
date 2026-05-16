import { supabase } from "@/lib/supabase";
import {
  Exam, Course, Batch, Subject, StudentLite, Mark,
  DashboardStats, ExamPerformancePoint, SubjectAvg, BatchAvg, TopperRow,
  ExamScope,
} from "../types";

export const marksService = {
  // ── Lookups ──────────────────────────────────────────────────────
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Course[];
  },

  async getBatches(courseId?: string): Promise<Batch[]> {
    let q = supabase.from("batches").select("id, course_id, name").order("name");
    if (courseId) q = q.eq("course_id", courseId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Batch[];
  },

  async getSubjects(courseId?: string): Promise<Subject[]> {
    let q = supabase
      .from("subjects")
      .select("id, course_id, name, subject_code")
      .order("name");
    if (courseId) q = q.eq("course_id", courseId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Subject[];
  },

  // ── Exams ────────────────────────────────────────────────────────
  async getExams(filters: { course_id?: string; batch_id?: string }): Promise<Exam[]> {
    let q = supabase
      .from("exams")
      .select("*, courses(name), batches(name)")
      .order("exam_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filters.course_id) q = q.eq("course_id", filters.course_id);
    if (filters.batch_id) {
      // include course-wide exams (batch_id null) when a batch is selected
      q = q.or(`batch_id.eq.${filters.batch_id},and(exam_scope.eq.course,batch_id.is.null)`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Exam[];
  },

  async getAllExams(): Promise<Exam[]> {
    const { data, error } = await supabase
      .from("exams")
      .select("*, courses(name), batches(name)")
      .order("exam_date", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as Exam[];
  },

  async createExam(payload: {
    name: string;
    course_id: string;
    batch_id: string | null;
    exam_scope: ExamScope;
    exam_date: string;
    total_marks: number;
  }): Promise<Exam> {
    const { data, error } = await supabase
      .from("exams")
      .insert([payload])
      .select("*, courses(name), batches(name)")
      .single();
    if (error) throw error;
    return data as Exam;
  },

  async deleteExam(id: string): Promise<void> {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Students ─────────────────────────────────────────────────────
  async getStudentsForExam(exam: Exam): Promise<StudentLite[]> {
    let q = supabase
      .from("students")
      .select("id, full_name, roll_number, batch_id, course_id, batches(name)")
      .order("roll_number", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });

    if (exam.exam_scope === "batch" && exam.batch_id) {
      q = q.eq("batch_id", exam.batch_id);
    } else if (exam.exam_scope === "course") {
      q = q.eq("course_id", exam.course_id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as StudentLite[];
  },

  // ── Marks ────────────────────────────────────────────────────────
  async getMarks(examId: string, subjectId: string | null): Promise<Mark[]> {
    let q = supabase.from("marks").select("*").eq("exam_id", examId);
    q = subjectId ? q.eq("subject_id", subjectId) : q.is("subject_id", null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Mark[];
  },

  async upsertMarks(records: Mark[]): Promise<void> {
    const valid = records.filter((r) => r.exam_id && r.student_id);
    if (!valid.length) return;

    const sanitized = valid.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      exam_id: r.exam_id,
      student_id: r.student_id,
      subject_id: r.subject_id ?? null,
      marks_obtained: r.marks_obtained ?? 0,
      total_marks: r.total_marks ?? 100,
      remarks: r.remarks ?? null,
    }));

    // Split: existing rows -> update by id; new rows -> insert (DB unique
    // index on exam/student/subject prevents duplicates).
    const updates = sanitized.filter((r) => r.id);
    const inserts = sanitized.filter((r) => !r.id);

    if (updates.length) {
      const { error } = await supabase.from("marks").upsert(updates);
      if (error) throw error;
    }
    if (inserts.length) {
      const { error } = await supabase.from("marks").insert(inserts);
      if (error) throw error;
    }
  },

  // ── Dashboard / Analytics ────────────────────────────────────────
  /**
   * One round-trip aggregator. Pulls a wide-but-shallow selection
   * (no joins of students/courses), then aggregates client-side.
   * Cap the marks scan to a recent window for large datasets.
   */
  async getDashboard(): Promise<DashboardStats> {
    const [examsRes, coursesRes, marksRes, batchesRes] = await Promise.all([
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id, name"),
      supabase.from("marks").select("student_id, percentage, exam_id"),
      supabase.from("batches").select("id, name"),
    ]);

    if (marksRes.error) throw marksRes.error;
    if (coursesRes.error) throw coursesRes.error;
    if (batchesRes.error) throw batchesRes.error;

    const marks = (marksRes.data ?? []) as { student_id: string; percentage: number; exam_id: string }[];
    const courses = (coursesRes.data ?? []) as { id: string; name: string }[];
    const batches = (batchesRes.data ?? []) as { id: string; name: string }[];

    const studentSet = new Set(marks.map((m) => m.student_id));
    const avg = marks.length
      ? marks.reduce((a, b) => a + Number(b.percentage ?? 0), 0) / marks.length
      : 0;

    // Top batch — query batch_id per mark via a second small request
    let topBatch: DashboardStats["topBatch"] = null;
    if (marks.length) {
      const { data: marksWithBatch } = await supabase
        .from("marks")
        .select("percentage, students!inner(batch_id)")
        .limit(5000);
      if (marksWithBatch?.length) {
        const acc = new Map<string, { sum: number; n: number }>();
        type MarkWithBatch = { percentage: number | null; students: { batch_id: string | null } | null };
        for (const m of marksWithBatch as unknown as MarkWithBatch[]) {
          const bid = m.students?.batch_id;
          if (!bid) continue;
          const cur = acc.get(bid) ?? { sum: 0, n: 0 };
          cur.sum += Number(m.percentage ?? 0);
          cur.n += 1;
          acc.set(bid, cur);
        }
        let best: { id: string; avg: number } | null = null;
        for (const [id, v] of acc) {
          const a = v.sum / v.n;
          if (!best || a > best.avg) best = { id, avg: a };
        }
        if (best) {
          const b = batches.find((x) => x.id === best!.id);
          topBatch = { id: best.id, name: b?.name ?? "—", avg: best.avg };
        }
      }
    }

    return {
      totalExams: examsRes.count ?? 0,
      activeCourses: courses.length,
      studentsEvaluated: studentSet.size,
      avgPerformance: avg,
      topBatch,
    };
  },

  /** Exam-by-exam average + top percentage for the trend chart. */
  async getExamPerformanceTrend(limit = 12): Promise<ExamPerformancePoint[]> {
    const { data: exams, error } = await supabase
      .from("exams")
      .select("id, name, exam_date")
      .order("exam_date", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    if (!exams?.length) return [];

    const ids = exams.map((e) => e.id);
    const { data: marks, error: mErr } = await supabase
      .from("marks")
      .select("exam_id, student_id, percentage")
      .in("exam_id", ids);
    if (mErr) throw mErr;

    const byExam = new Map<string, { pcts: number[]; students: Set<string> }>();
    for (const m of marks ?? []) {
      const cur = byExam.get(m.exam_id) ?? { pcts: [], students: new Set() };
      cur.pcts.push(Number(m.percentage ?? 0));
      cur.students.add(m.student_id);
      byExam.set(m.exam_id, cur);
    }

    return exams
      .slice()
      .reverse()
      .map((e) => {
        const bucket = byExam.get(e.id);
        const pcts = bucket?.pcts ?? [];
        const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
        const top = pcts.length ? Math.max(...pcts) : 0;
        return {
          examId: e.id,
          name: e.name,
          date: e.exam_date,
          avg,
          top,
          studentCount: bucket?.students.size ?? 0,
        };
      });
  },

  async getSubjectAverages(courseId?: string): Promise<SubjectAvg[]> {
    let subQ = supabase.from("subjects").select("id, name, course_id");
    if (courseId) subQ = subQ.eq("course_id", courseId);
    const { data: subjects, error: sErr } = await subQ;
    if (sErr) throw sErr;
    if (!subjects?.length) return [];

    const ids = subjects.map((s) => s.id);
    const { data: marks, error: mErr } = await supabase
      .from("marks")
      .select("subject_id, exam_id, percentage")
      .in("subject_id", ids);
    if (mErr) throw mErr;

    const agg = new Map<string, { sum: number; n: number; exams: Set<string> }>();
    for (const m of marks ?? []) {
      if (!m.subject_id) continue;
      const cur = agg.get(m.subject_id) ?? { sum: 0, n: 0, exams: new Set() };
      cur.sum += Number(m.percentage ?? 0);
      cur.n += 1;
      cur.exams.add(m.exam_id);
      agg.set(m.subject_id, cur);
    }
    return subjects.map((s) => {
      const a = agg.get(s.id);
      return {
        subjectId: s.id,
        name: s.name,
        avg: a && a.n ? a.sum / a.n : 0,
        examCount: a?.exams.size ?? 0,
      };
    }).sort((a, b) => b.avg - a.avg);
  },

  async getBatchAverages(courseId?: string): Promise<BatchAvg[]> {
    let bq = supabase.from("batches").select("id, name, course_id");
    if (courseId) bq = bq.eq("course_id", courseId);
    const { data: batches, error: bErr } = await bq;
    if (bErr) throw bErr;
    if (!batches?.length) return [];

    const { data: students, error: stuErr } = await supabase
      .from("students")
      .select("id, batch_id")
      .in("batch_id", batches.map((b) => b.id));
    if (stuErr) throw stuErr;

    const studentToBatch = new Map<string, string>();
    const batchStudents = new Map<string, Set<string>>();
    for (const s of students ?? []) {
      if (!s.batch_id) continue;
      studentToBatch.set(s.id, s.batch_id);
      const set = batchStudents.get(s.batch_id) ?? new Set<string>();
      set.add(s.id);
      batchStudents.set(s.batch_id, set);
    }

    const studentIds = Array.from(studentToBatch.keys());
    if (!studentIds.length) {
      return batches.map((b) => ({ batchId: b.id, name: b.name, avg: 0, studentCount: 0 }));
    }
    const { data: marks, error: mErr } = await supabase
      .from("marks")
      .select("student_id, percentage")
      .in("student_id", studentIds);
    if (mErr) throw mErr;

    const acc = new Map<string, { sum: number; n: number }>();
    for (const m of marks ?? []) {
      const bid = studentToBatch.get(m.student_id);
      if (!bid) continue;
      const cur = acc.get(bid) ?? { sum: 0, n: 0 };
      cur.sum += Number(m.percentage ?? 0);
      cur.n += 1;
      acc.set(bid, cur);
    }
    return batches
      .map((b) => {
        const a = acc.get(b.id);
        return {
          batchId: b.id,
          name: b.name,
          avg: a && a.n ? a.sum / a.n : 0,
          studentCount: batchStudents.get(b.id)?.size ?? 0,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  },

  /** Top N performers across the given filter set, in one query. */
  async getToppers(filters: {
    course_id?: string;
    batch_id?: string;
    exam_id?: string;
    subject_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<TopperRow[]> {
    let q = supabase
      .from("marks")
      .select(`
        student_id, percentage, marks_obtained, total_marks,
        students!inner(id, full_name, roll_number, batch_id, course_id, batches(name)),
        exams!inner(id, course_id, batch_id, exam_date, exam_scope)
      `)
      .order("percentage", { ascending: false })
      .limit(filters.limit ?? 25);

    if (filters.exam_id) q = q.eq("exam_id", filters.exam_id);
    if (filters.subject_id) q = q.eq("subject_id", filters.subject_id);
    if (filters.course_id) q = q.eq("students.course_id", filters.course_id);
    if (filters.batch_id) q = q.eq("students.batch_id", filters.batch_id);
    if (filters.date_from) q = q.gte("exams.exam_date", filters.date_from);
    if (filters.date_to) q = q.lte("exams.exam_date", filters.date_to);

    const { data, error } = await q;
    if (error) throw error;

    type TopperRowResult = {
      percentage: number | null;
      marks_obtained: number | null;
      total_marks: number | null;
      students: {
        id: string;
        full_name: string;
        roll_number: string | null;
        batches: { name: string } | null;
      };
    };

    return (data ?? []).map((row) => {
      const r = row as unknown as TopperRowResult;
      return {
        studentId: r.students.id,
        studentName: r.students.full_name,
        rollNumber: r.students.roll_number,
        batchName: r.students.batches?.name ?? null,
        percentage: Number(r.percentage ?? 0),
        marksObtained: Number(r.marks_obtained ?? 0),
        totalMarks: Number(r.total_marks ?? 0),
      };
    });
  },
};
