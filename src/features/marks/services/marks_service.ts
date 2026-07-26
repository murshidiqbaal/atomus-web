import { supabase } from "@/lib/supabase";
import {
  Exam, Course, Batch, Subject, StudentLite, Mark,
  DashboardStats, ExamPerformancePoint, SubjectAvg, BatchAvg, TopperRow,
  ExamScope, ExamDirectoryRow, ExamSummaryRow, ExamCreator,
  ExamsDirectoryFilters, CreatorRole,
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
    is_daily?: boolean;
    subject_id?: string | null;
  }): Promise<Exam> {
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Failed to create exam (HTTP ${res.status})`);
    return json as Exam;
  },

  async deleteExam(id: string): Promise<void> {
    const res = await fetch(`/api/exams?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Failed to delete exam (HTTP ${res.status})`);
    }
  },

  async updateExam(id: string, payload: Partial<{
    name: string;
    course_id: string;
    batch_id: string | null;
    exam_scope: ExamScope;
    exam_date: string;
    total_marks: number;
    is_daily?: boolean;
    subject_id?: string | null;
  }>): Promise<Exam> {
    const res = await fetch(`/api/exams?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Failed to update exam (HTTP ${res.status})`);
    return json as Exam;
  },


  // ── Exams directory (admin view across creators) ────────────────
  /**
   * Returns exams matching the filter set, each enriched with the
   * exam_summary view's analytics row (avg / top / pass / counts).
   * Used by the "Total Exams" directory modal.
   */
  async getExamsDirectory(filters: ExamsDirectoryFilters): Promise<ExamDirectoryRow[]> {
    let q = supabase
      .from("exams")
      .select("*, courses(name), batches(name)")
      .order("exam_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (filters.course_id) q = q.eq("course_id", filters.course_id);
    if (filters.batch_id) q = q.eq("batch_id", filters.batch_id);
    if (filters.creator_role) q = q.eq("creator_role", filters.creator_role);
    if (filters.created_by) q = q.eq("created_by", filters.created_by);
    if (filters.date_from) q = q.gte("exam_date", filters.date_from);
    if (filters.date_to) q = q.lte("exam_date", filters.date_to);
    if (filters.search) q = q.ilike("name", `%${filters.search}%`);

    const { data: exams, error } = await q;
    if (error) throw error;
    if (!exams || exams.length === 0) return [];

    const examIds = exams.map((e) => e.id);
    const { data: stats } = await supabase
      .from("exam_summary")
      .select("*")
      .in("exam_id", examIds);

    const statsById = new Map<string, ExamSummaryRow>();
    for (const s of (stats ?? []) as ExamSummaryRow[]) statsById.set(s.exam_id, s);

    return exams.map((e) => ({
      ...(e as Exam),
      stats: statsById.get(e.id) ?? null,
    }));
  },

  /**
   * Distinct creators across the exams table — used to populate the
   * creator filter dropdown. Ordered by exam count desc so the most
   * active creators surface first.
   */
  async getExamCreators(): Promise<ExamCreator[]> {
    const { data, error } = await supabase
      .from("exams")
      .select("created_by, creator_name, creator_role")
      .not("created_by", "is", null);
    if (error) throw error;

    const acc = new Map<string, ExamCreator>();
    for (const row of (data ?? []) as { created_by: string; creator_name: string | null; creator_role: CreatorRole | null }[]) {
      if (!row.created_by || !row.creator_role) continue;
      const existing = acc.get(row.created_by);
      if (existing) {
        existing.exam_count += 1;
      } else {
        acc.set(row.created_by, {
          id: row.created_by,
          name: row.creator_name ?? "Unknown",
          role: row.creator_role,
          exam_count: 1,
        });
      }
    }
    return Array.from(acc.values()).sort((a, b) => b.exam_count - a.exam_count);
  },

  /**
   * Top N performers for a specific exam, ordered by percentage desc.
   * Aggregates across subject-scoped rows (sum marks_obtained / sum total).
   */
  async getExamToppers(examId: string, limit = 10): Promise<TopperRow[]> {
    const { data, error } = await supabase
      .from("marks")
      .select(`
        student_id, percentage, marks_obtained, total_marks, subject_id,
        students!inner(id, full_name, roll_number, batches(name))
      `)
      .eq("exam_id", examId);
    if (error) throw error;

    type Row = {
      student_id: string;
      percentage: number | null;
      marks_obtained: number | null;
      total_marks: number | null;
      subject_id: string | null;
      students: {
        id: string;
        full_name: string;
        roll_number: string | null;
        batches: { name: string } | null;
      };
    };

    // Aggregate per student across (possibly multiple) subject rows.
    const acc = new Map<string, {
      studentId: string;
      studentName: string;
      rollNumber: string | null;
      batchName: string | null;
      obtained: number;
      total: number;
    }>();

    for (const r of (data ?? []) as unknown as Row[]) {
      const key = r.students.id;
      const cur = acc.get(key) ?? {
        studentId: r.students.id,
        studentName: r.students.full_name,
        rollNumber: r.students.roll_number,
        batchName: r.students.batches?.name ?? null,
        obtained: 0,
        total: 0,
      };
      cur.obtained += Number(r.marks_obtained ?? 0);
      cur.total += Number(r.total_marks ?? 0);
      acc.set(key, cur);
    }

    return Array.from(acc.values())
      .map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        rollNumber: s.rollNumber,
        batchName: s.batchName,
        marksObtained: s.obtained,
        totalMarks: s.total,
        percentage: s.total > 0 ? (s.obtained / s.total) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);
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
  /**
   * Read the editable mark rows for one (exam, subject) slot.
   *
   * For daily exams, callers pass `markDate` (YYYY-MM-DD) and only that day's
   * rows come back. For one-shot exams, `markDate` is omitted and we filter
   * `mark_date IS NULL` so historical (non-daily) rows are unaffected by the
   * new column.
   *
   * `teacher_id` may be set by either the admin web or the teacher's Flutter
   * app — the column is just `auth.users.id` of whoever entered the row, so
   * we resolve display names in a second query and attach them as
   * `entered_by` on each Mark.
   */
  async getMarks(
    examId: string,
    subjectId: string | null,
    markDate?: string | null,
  ): Promise<Mark[]> {
    let q = supabase.from("marks").select("*").eq("exam_id", examId);
    q = subjectId ? q.eq("subject_id", subjectId) : q.is("subject_id", null);
    q = markDate ? q.eq("mark_date", markDate) : q.is("mark_date", null);
    const { data, error } = await q;
    if (error) throw error;
    return attachEnteredBy((data ?? []) as Mark[]);
  },

  /**
   * Pull every mark row for an exam regardless of subject. Powers the
   * "Overall" pivot view that aggregates each student's per-subject scores
   * into a single totals table.
   *
   * For daily exams, `markDate` scopes to a single day; for one-shot exams,
   * `markDate` should be null so the IS NULL filter matches historical rows.
   */
  async getAllSubjectMarks(
    examId: string,
    markDate?: string | null,
  ): Promise<Mark[]> {
    let q = supabase.from("marks").select("*").eq("exam_id", examId);
    q = markDate ? q.eq("mark_date", markDate) : q.is("mark_date", null);
    const { data, error } = await q;
    if (error) throw error;
    return attachEnteredBy((data ?? []) as Mark[]);
  },

  async upsertMarks(records: Mark[]): Promise<void> {
    const valid = records.filter((r) => r.exam_id && r.student_id);
    if (!valid.length) return;

    // Stamp the current admin's auth.uid into `teacher_id` ONLY if they are a teacher
    // so admin-entered marks carry attribution that mirrors what the Flutter teacher app
    // already writes via /api/marks. Falls back to null for the
    // master-admin override (no real auth session).
    const { data: authData } = await supabase.auth.getUser();
    const currentAuthId = authData?.user?.id ?? null;

    let isTeacher = false;
    if (currentAuthId) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("auth_id", currentAuthId)
        .maybeSingle();
      isTeacher = !!teacher;
    }

    // Group by exam_id, subject_id and mark_date so each batch reads existing
    // rows for a single (exam, subject, date) slot in one round trip.
    const groups = new Map<string, Mark[]>();
    for (const r of valid) {
      const key = `${r.exam_id}-${r.subject_id || 'none'}-${r.mark_date || 'none'}`;
      const arr = groups.get(key);
      if (arr) arr.push(r);
      else groups.set(key, [r]);
    }

    for (const group of groups.values()) {
      const sample = group[0];
      
      // If saving subject-specific marks, clean up legacy overall marks (subject_id = null)
      if (sample.subject_id) {
        const { error: delErr } = await supabase
          .from("marks")
          .delete()
          .eq("exam_id", sample.exam_id)
          .is("subject_id", null)
          .in("student_id", group.map((r) => r.student_id));
        if (delErr) {
          console.error(`Failed to delete legacy overall marks for exam ${sample.exam_id}:`, delErr);
        }
      }

      let readQ = supabase
        .from("marks")
        .select("id, student_id")
        .eq("exam_id", sample.exam_id)
        .in("student_id", group.map((r) => r.student_id));

      if (sample.subject_id) {
        readQ = readQ.eq("subject_id", sample.subject_id);
      } else {
        readQ = readQ.is("subject_id", null);
      }

      if (sample.mark_date) {
        readQ = readQ.eq("mark_date", sample.mark_date);
      } else {
        readQ = readQ.is("mark_date", null);
      }

      const { data: existing, error: readErr } = await readQ;
      if (readErr) throw new Error(`Failed to read existing marks: ${readErr.message}`);

      const existingMap = new Map<string, string>();
      for (const row of existing ?? []) {
        existingMap.set(row.student_id, row.id);
      }

      const toInsert: any[] = [];
      for (const r of group) {
        const payload: Record<string, unknown> = {
          exam_id: r.exam_id,
          student_id: r.student_id,
          subject_id: r.subject_id || null,
          mark_date: r.mark_date || null,
          marks_obtained: r.marks_obtained,
          total_marks: r.total_marks,
          remarks: r.remarks || null,
        };
        // Only stamp teacher_id when we actually know who is writing — never
        // overwrite an existing teacher's attribution on update.
        if (currentAuthId && isTeacher) payload.teacher_id = currentAuthId;

        const id = existingMap.get(r.student_id);
        if (id) {
          const { error: upErr } = await supabase.from("marks").update(payload).eq("id", id);
          if (upErr) throw new Error(`Marks update failed: ${upErr.message}`);
        } else {
          toInsert.push(payload);
        }
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("marks").insert(toInsert);
        if (insErr) throw new Error(`Marks insert failed: ${insErr.message}`);
      }
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
        student_id, percentage, marks_obtained, total_marks, subject_id,
        students!inner(id, full_name, roll_number, batch_id, course_id, batches(name)),
        exams!inner(id, course_id, batch_id, exam_date, exam_scope)
      `)
      .limit(5000);

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
      subject_id: string | null;
      students: {
        id: string;
        full_name: string;
        roll_number: string | null;
        batch_id: string | null;
        course_id: string | null;
        batches: { name: string } | null;
      };
      exams?: {
        id: string;
        course_id: string;
        batch_id: string | null;
        exam_date: string | null;
        exam_scope: string;
      } | null;
    };

    const rawData = (data ?? []) as unknown as TopperRowResult[];

    // Identify which (student, exam) pairs have subject-specific marks
    const studentExamWithSubjects = new Set<string>();
    for (const row of rawData) {
      const sId = row.students?.id;
      const examId = row.exams?.id;
      if (sId && examId && row.subject_id !== null && row.subject_id !== undefined) {
        studentExamWithSubjects.add(`${sId}|${examId}`);
      }
    }

    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      rollNumber: string | null;
      batchName: string | null;
      marksObtained: number;
      totalMarks: number;
      subjectMarks: Record<string, { sum: number; count: number }>;
    }>();

    for (const row of rawData) {
      const sId = row.students?.id;
      if (!sId) continue;
      const examId = row.exams?.id;

      // Exclude overall marks (subject_id == null) if there are subject-specific marks for this exam for this student
      if (examId && (row.subject_id === null || row.subject_id === undefined) && studentExamWithSubjects.has(`${sId}|${examId}`)) {
        continue;
      }

      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          studentName: row.students.full_name,
          rollNumber: row.students.roll_number,
          batchName: row.students.batches?.name ?? null,
          marksObtained: 0,
          totalMarks: 0,
          subjectMarks: {},
        });
      }

      const stud = studentMap.get(sId)!;
      stud.marksObtained += Number(row.marks_obtained ?? 0);
      stud.totalMarks += Number(row.total_marks ?? 100);

      const subId = row.subject_id || "unscoped";
      if (!stud.subjectMarks[subId]) {
        stud.subjectMarks[subId] = { sum: 0, count: 0 };
      }
      
      const pct = row.percentage ?? ((Number(row.marks_obtained ?? 0) / Number(row.total_marks ?? 100)) * 100);
      stud.subjectMarks[subId].sum += pct;
      stud.subjectMarks[subId].count += 1;
    }

    const toppers: TopperRow[] = Array.from(studentMap.values()).map((s) => {
      let finalPercentage = 0;
      
      if (filters.subject_id) {
        // Specific subject selected
        const subData = s.subjectMarks[filters.subject_id];
        finalPercentage = subData && subData.count > 0 ? subData.sum / subData.count : 0;
      } else {
        // Overall: average of the subject averages
        const subjectKeys = Object.keys(s.subjectMarks);
        if (subjectKeys.length > 0) {
          const avgs = subjectKeys.map(subId => s.subjectMarks[subId].sum / s.subjectMarks[subId].count);
          finalPercentage = avgs.reduce((a, b) => a + b, 0) / avgs.length;
        }
      }

      return {
        studentId: s.studentId,
        studentName: s.studentName,
        rollNumber: s.rollNumber,
        batchName: s.batchName,
        marksObtained: s.marksObtained,
        totalMarks: s.totalMarks,
        percentage: finalPercentage,
      };
    });

    return toppers
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, filters.limit ?? 25);
  },
};

// ── Helpers ────────────────────────────────────────────────────

/**
 * Resolve `teacher_id` (= auth.users.id) on a batch of mark rows to the
 * teacher's display name. `marks.teacher_id` is set by:
 *   - the Flutter teacher app (POST /api/marks) — typically a real teacher
 *   - the admin web (upsertMarks above) — could be admin/staff
 *
 * We look up the teachers table by `auth_id` to find subject teachers, and
 * fall back to "Admin" for ids that don't map to a teacher row so admins/
 * staff still surface meaningfully in the UI.
 */
async function attachEnteredBy(rows: Mark[]): Promise<Mark[]> {
  const ids = Array.from(
    new Set(rows.map((r) => r.teacher_id).filter((v): v is string => !!v)),
  );
  if (ids.length === 0) return rows;

  const { data, error } = await supabase
    .from("teachers")
    .select("auth_id, full_name")
    .in("auth_id", ids);
  if (error) return rows; // attribution is best-effort — never block the read

  const teacherByAuth = new Map<string, string>();
  for (const t of (data ?? []) as { auth_id: string | null; full_name: string }[]) {
    if (t.auth_id) teacherByAuth.set(t.auth_id, t.full_name);
  }

  return rows.map((r) => {
    if (!r.teacher_id) return r;
    const teacherName = teacherByAuth.get(r.teacher_id);
    return {
      ...r,
      entered_by: teacherName
        ? { auth_id: r.teacher_id, full_name: teacherName, role: "teacher" }
        : { auth_id: r.teacher_id, full_name: "Admin", role: "admin" },
    };
  });
}
