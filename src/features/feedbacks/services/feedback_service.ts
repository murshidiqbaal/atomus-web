import { supabase } from "@/lib/supabase";
import { DailyStudentReport, FeedbackFilters, FeedbackStats } from "../types";

export const feedbackService = {
  async getDailyStudentReports(filters?: Partial<FeedbackFilters>): Promise<DailyStudentReport[]> {
    let query = supabase
      .from("daily_student_reports")
      .select(`
        id,
        daily_report_id,
        student_id,
        status,
        comment,
        behavior_rating,
        study_engagement,
        homework_status,
        created_at,
        students:student_id (
          id,
          full_name,
          admission_number,
          roll_number,
          course_id,
          batch_id
        ),
        daily_class_reports:daily_report_id (
          id,
          report_date,
          session_type,
          topics_covered,
          homework,
          general_remarks,
          teacher_id,
          course_id,
          batch_id,
          subject_id,
          teachers:teacher_id (
            id,
            full_name,
            email
          ),
          courses:course_id (
            id,
            name
          ),
          batches:batch_id (
            id,
            name
          ),
          subjects:subject_id (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "All") {
      query = query.eq("status", filters.status);
    }

    if (filters?.behaviorRating && filters.behaviorRating !== "All") {
      query = query.eq("behavior_rating", filters.behaviorRating);
    }

    if (filters?.studyEngagement && filters.studyEngagement !== "All") {
      query = query.eq("study_engagement", filters.studyEngagement);
    }

    if (filters?.homeworkStatus && filters.homeworkStatus !== "All") {
      query = query.eq("homework_status", filters.homeworkStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching daily student reports:", error);
      throw error;
    }

    let reports = (data || []) as unknown as DailyStudentReport[];

    // Additional client-side filtering for search, date range, and course
    if (filters?.courseId && filters.courseId !== "All") {
      reports = reports.filter((r) => r.daily_class_reports?.course_id === filters.courseId);
    }

    if (filters?.startDate) {
      reports = reports.filter((r) => {
        const reportDate = r.daily_class_reports?.report_date || r.created_at.substring(0, 10);
        return reportDate >= filters.startDate!;
      });
    }

    if (filters?.endDate) {
      reports = reports.filter((r) => {
        const reportDate = r.daily_class_reports?.report_date || r.created_at.substring(0, 10);
        return reportDate <= filters.endDate!;
      });
    }

    if (filters?.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase().trim();
      reports = reports.filter((r) => {
        const studentName = r.students?.full_name?.toLowerCase() || "";
        const admissionNo = r.students?.admission_number?.toLowerCase() || "";
        const teacherName = r.daily_class_reports?.teachers?.full_name?.toLowerCase() || "";
        const subjectName = r.daily_class_reports?.subjects?.name?.toLowerCase() || "";
        const comment = r.comment?.toLowerCase() || "";
        const topics = r.daily_class_reports?.topics_covered?.toLowerCase() || "";

        return (
          studentName.includes(q) ||
          admissionNo.includes(q) ||
          teacherName.includes(q) ||
          subjectName.includes(q) ||
          comment.includes(q) ||
          topics.includes(q)
        );
      });
    }

    return reports;
  },

  async deleteDailyStudentReport(id: string): Promise<void> {
    const { error } = await supabase.from("daily_student_reports").delete().eq("id", id);
    if (error) throw error;
  },

  async getLookups() {
    const [coursesRes, batchesRes, subjectsRes, teachersRes] = await Promise.all([
      supabase.from("courses").select("id, name").order("name"),
      supabase.from("batches").select("id, name, course_id").order("name"),
      supabase.from("subjects").select("id, name, course_id").order("name"),
      supabase.from("teachers").select("id, full_name").order("full_name"),
    ]);

    return {
      courses: coursesRes.data || [],
      batches: batchesRes.data || [],
      subjects: subjectsRes.data || [],
      teachers: teachersRes.data || [],
    };
  },
};
