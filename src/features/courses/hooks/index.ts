import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campusRepository, CampusInput } from "@/lib/repositories/campus_repository";
import { courseRepository, CourseInput, BatchInput } from "@/lib/repositories/course_repository";
import { CourseFilters } from "@/lib/types";
import { subjectsService, SubjectInput } from "../services/subjects_service";

export const QK = {
  courses: (filters?: CourseFilters) => ["courses", filters ?? {}] as const,
  course: (id: string) => ["courses", "by-id", id] as const,
  campuses: (activeOnly?: boolean) => ["campuses", activeOnly ?? false] as const,
  batches: (courseId: string) => ["courses", "batches", courseId] as const,
  subjects: (courseId: string) => ["courses", "subjects", courseId] as const,
};

// ── Courses ──────────────────────────────────────────────────────
export function useCourses(filters?: CourseFilters) {
  return useQuery({
    queryKey: QK.courses(filters),
    queryFn: () => courseRepository.getCourses(filters),
    staleTime: 30_000,
  });
}

export function useCourseDetail(id: string | null) {
  return useQuery({
    queryKey: id ? QK.course(id) : ["courses", "by-id", "none"],
    queryFn: () => courseRepository.getCourseById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseInput) => courseRepository.addCourse(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
      qc.invalidateQueries({ queryKey: ["campuses"], exact: false });
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CourseInput> }) =>
      courseRepository.updateCourse(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
      qc.invalidateQueries({ queryKey: ["campuses"], exact: false });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => courseRepository.deleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
      qc.invalidateQueries({ queryKey: ["campuses"], exact: false });
    },
  });
}

export function useUploadThumbnail() {
  return useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) =>
      courseRepository.uploadThumbnail(courseId, file),
  });
}

// ── Campuses ─────────────────────────────────────────────────────
export function useCampuses(activeOnly = false) {
  return useQuery({
    queryKey: QK.campuses(activeOnly),
    queryFn: () => campusRepository.getCampuses({ activeOnly }),
    staleTime: 60_000,
  });
}

export function useCreateCampus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampusInput) => campusRepository.addCampus(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campuses"], exact: false }),
  });
}

export function useUpdateCampus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CampusInput> }) =>
      campusRepository.updateCampus(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campuses"], exact: false }),
  });
}

export function useDeleteCampus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campusRepository.deleteCampus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campuses"], exact: false });
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
    },
  });
}

// ── Batches ──────────────────────────────────────────────────────
export function useBatchesForCourse(courseId: string | null) {
  return useQuery({
    queryKey: courseId ? QK.batches(courseId) : ["courses", "batches", "none"],
    queryFn: () => courseRepository.getBatchesByCourse(courseId!),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchInput) => courseRepository.addBatch(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.batches(vars.courseId) });
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
    },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => courseRepository.deleteBatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
    },
  });
}

// ── Subjects ─────────────────────────────────────────────────────
export function useSubjectsForCourse(courseId: string | null) {
  return useQuery({
    queryKey: courseId ? QK.subjects(courseId) : ["courses", "subjects", "none"],
    queryFn: () => subjectsService.listByCourse(courseId!),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectInput) => subjectsService.create(input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: QK.subjects(v.courseId) });
      qc.invalidateQueries({ queryKey: ["courses"], exact: false });
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SubjectInput> }) =>
      subjectsService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"], exact: false }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"], exact: false }),
  });
}
