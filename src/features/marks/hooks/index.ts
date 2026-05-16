import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marksService } from "../services/marks_service";
import { Exam, Mark } from "../types";

const QK = {
  courses: ["marks", "courses"] as const,
  batches: (courseId: string) => ["marks", "batches", courseId] as const,
  subjects: (courseId: string) => ["marks", "subjects", courseId] as const,
  exams: (courseId: string, batchId: string) =>
    ["marks", "exams", courseId, batchId] as const,
  examsAll: ["marks", "exams-all"] as const,
  students: (examId: string) => ["marks", "students", examId] as const,
  marks: (examId: string, subjectId: string) =>
    ["marks", "marks", examId, subjectId] as const,

  dashboard: ["marks", "dashboard"] as const,
  trend: ["marks", "trend"] as const,
  subjectAvgs: (courseId: string) => ["marks", "subject-avg", courseId] as const,
  batchAvgs: (courseId: string) => ["marks", "batch-avg", courseId] as const,
  toppers: (filters: Record<string, string | number | undefined>) =>
    ["marks", "toppers", filters] as const,
};

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

export function useExams(courseId: string, batchId: string) {
  return useQuery({
    queryKey: QK.exams(courseId, batchId),
    queryFn: () => marksService.getExams({ course_id: courseId, batch_id: batchId }),
    enabled: !!courseId && !!batchId,
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

export function useMarks(examId: string, subjectId: string) {
  return useQuery({
    queryKey: QK.marks(examId, subjectId),
    queryFn: () => marksService.getMarks(examId, subjectId || null),
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
    },
  });
}

export function useSaveMarks(examId: string, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: Mark[]) => marksService.upsertMarks(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.marks(examId, subjectId) });
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
