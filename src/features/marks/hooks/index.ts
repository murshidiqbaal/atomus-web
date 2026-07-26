import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marksService } from "../services/marks_service";
import { Exam, Mark, ExamsDirectoryFilters } from "../types";

const QK = {
  courses: ["marks", "courses"] as const,
  batches: (courseId: string) => ["marks", "batches", courseId] as const,
  subjects: (courseId: string) => ["marks", "subjects", courseId] as const,
  exams: (courseId?: string, batchId?: string) =>
    ["marks", "exams", courseId || "all", batchId || "all"] as const,
  examsAll: ["marks", "exams-all"] as const,
  students: (examId: string) => ["marks", "students", examId] as const,
  marks: (examId: string, subjectId: string, markDate: string) =>
    ["marks", "marks", examId, subjectId, markDate] as const,
  marksAllSubjects: (examId: string, markDate: string) =>
    ["marks", "marks-all-subjects", examId, markDate] as const,

  dashboard: ["marks", "dashboard"] as const,
  trend: ["marks", "trend"] as const,
  subjectAvgs: (courseId: string) => ["marks", "subject-avg", courseId] as const,
  batchAvgs: (courseId: string) => ["marks", "batch-avg", courseId] as const,
  toppers: (filters: Record<string, string | number | undefined>) =>
    ["marks", "toppers", filters] as const,

  directory: (filters: ExamsDirectoryFilters) =>
    ["marks", "exams-directory", filters] as const,
  creators: ["marks", "exam-creators"] as const,
  examToppers: (examId: string, limit: number) =>
    ["marks", "exam-toppers", examId, limit] as const,
};

export function useCampuses() {
  return useQuery({
    queryKey: ["marks", "campuses"],
    queryFn: () => marksService.getCampuses(),
    staleTime: 5 * 60_000,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: QK.courses,
    queryFn: () => marksService.getCourses(),
    staleTime: 5 * 60_000,
  });
}

export function useBatches(courseId: string) {
  return useQuery({
    queryKey: QK.batches(courseId),
    queryFn: () => marksService.getBatches(courseId),
    enabled: !!courseId,
    staleTime: 60_000,
  });
}

export function useSubjects(courseId: string) {
  return useQuery({
    queryKey: QK.subjects(courseId),
    queryFn: () => marksService.getSubjects(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60_000,
  });
}

export function useExams(courseId?: string, batchId?: string) {
  return useQuery({
    queryKey: QK.exams(courseId, batchId),
    queryFn: () => marksService.getExams({ course_id: courseId, batch_id: batchId }),
    staleTime: 30_000,
  });
}

export function useAllExams() {
  return useQuery({
    queryKey: QK.examsAll,
    queryFn: () => marksService.getAllExams(),
    staleTime: 60_000,
  });
}

export function useStudentsForExam(exam: Exam | null) {
  return useQuery({
    queryKey: exam ? QK.students(exam.id) : ["marks", "students", "none"],
    queryFn: () => marksService.getStudentsForExam(exam!),
    enabled: !!exam,
    staleTime: 60_000,
  });
}

export function useMarks(examId: string, subjectId: string, markDate?: string | null) {
  const date = markDate || "";
  return useQuery({
    queryKey: QK.marks(examId, subjectId, date),
    queryFn: () => marksService.getMarks(examId, subjectId || null, markDate || null),
    enabled: !!examId,
    staleTime: 10_000,
  });
}

/**
 * All mark rows for one exam (any subject) — used by the read-only "Overall"
 * pivot view in MarksEntry to aggregate per-student totals across subjects.
 */
export function useAllSubjectMarks(examId: string, markDate?: string | null) {
  const date = markDate || "";
  return useQuery({
    queryKey: QK.marksAllSubjects(examId, date),
    queryFn: () => marksService.getAllSubjectMarks(examId, markDate || null),
    enabled: !!examId,
    staleTime: 10_000,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marksService.createExam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marks", "exams"], exact: false });
      qc.invalidateQueries({ queryKey: QK.examsAll });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: ["marks", "exams-directory"], exact: false });
      qc.invalidateQueries({ queryKey: QK.creators });
    },
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof marksService.updateExam>[1] }) =>
      marksService.updateExam(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marks", "exams"], exact: false });
      qc.invalidateQueries({ queryKey: QK.examsAll });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: ["marks", "exams-directory"], exact: false });
      qc.invalidateQueries({ queryKey: QK.creators });
    },
  });
}

export function useDeleteExam() {

  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marksService.deleteExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marks", "exams"], exact: false });
      qc.invalidateQueries({ queryKey: QK.examsAll });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: ["marks", "exams-directory"], exact: false });
      qc.invalidateQueries({ queryKey: QK.creators });
    },
  });
}

export function useSaveMarks(examId: string, subjectId: string, markDate?: string | null) {
  const qc = useQueryClient();
  const date = markDate || "";
  return useMutation({
    mutationFn: (records: Mark[]) => marksService.upsertMarks(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.marks(examId, subjectId, date) });
      qc.invalidateQueries({ queryKey: QK.marksAllSubjects(examId, date) });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.trend });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: QK.dashboard,
    queryFn: () => marksService.getDashboard(),
    staleTime: 60_000,
  });
}

export function useExamTrend() {
  return useQuery({
    queryKey: QK.trend,
    queryFn: () => marksService.getExamPerformanceTrend(12),
    staleTime: 60_000,
  });
}

export function useSubjectAverages(courseId: string) {
  return useQuery({
    queryKey: QK.subjectAvgs(courseId || "all"),
    queryFn: () => marksService.getSubjectAverages(courseId || undefined),
    staleTime: 60_000,
  });
}

export function useBatchAverages(courseId: string) {
  return useQuery({
    queryKey: QK.batchAvgs(courseId || "all"),
    queryFn: () => marksService.getBatchAverages(courseId || undefined),
    staleTime: 60_000,
  });
}

export function useExamsDirectory(filters: ExamsDirectoryFilters, enabled = true) {
  return useQuery({
    queryKey: QK.directory(filters),
    queryFn: () => marksService.getExamsDirectory(filters),
    enabled,
    staleTime: 30_000,
  });
}

export function useExamCreators(enabled = true) {
  return useQuery({
    queryKey: QK.creators,
    queryFn: () => marksService.getExamCreators(),
    enabled,
    staleTime: 60_000,
  });
}

export function useExamToppers(examId: string | null, limit = 10) {
  return useQuery({
    queryKey: QK.examToppers(examId ?? "none", limit),
    queryFn: () => marksService.getExamToppers(examId!, limit),
    enabled: !!examId,
    staleTime: 30_000,
  });
}

export function useToppers(filters: {
  course_id?: string;
  batch_id?: string;
  exam_id?: string;
  subject_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: QK.toppers(filters as Record<string, string | number | undefined>),
    queryFn: () => marksService.getToppers(filters),
    staleTime: 30_000,
  });
}
