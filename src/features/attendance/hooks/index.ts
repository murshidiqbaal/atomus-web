import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../services/attendance_service";
import { AttendanceUpsertRow } from "../types";

export const QK = {
  campuses: ["attendance", "campuses"] as const,
  courses: (campusId: string) => ["attendance", "courses", campusId] as const,
  batches: (courseId: string, campusId: string) =>
    ["attendance", "batches", courseId, campusId] as const,
  subjects: (courseId: string) => ["attendance", "subjects", courseId] as const,
  students: (campusId: string, courseId: string, batchId: string) => ["attendance", "students", campusId, courseId, batchId] as const,
  records: (campusId: string, courseId: string, batchId: string, date: string, subjectId: string | null) =>
    ["attendance", "records", campusId, courseId, batchId, date, subjectId ?? "overall"] as const,
};

export function useAttCampuses() {
  return useQuery({
    queryKey: QK.campuses,
    queryFn: () => attendanceService.listCampuses(),
    staleTime: 5 * 60_000,
  });
}

export function useAttCourses(campus_id: string) {
  return useQuery({
    queryKey: QK.courses(campus_id),
    queryFn: () => attendanceService.listCoursesByCampus(campus_id),
    enabled: !!campus_id,
    staleTime: 60_000,
  });
}

export function useAttBatches(course_id: string, campus_id: string) {
  return useQuery({
    queryKey: QK.batches(course_id, campus_id),
    queryFn: () => attendanceService.listBatchesByCourseAndCampus(course_id, campus_id),
    enabled: !!course_id && !!campus_id,
    staleTime: 60_000,
  });
}

export function useAttSubjects(course_id: string) {
  return useQuery({
    queryKey: QK.subjects(course_id),
    queryFn: () => attendanceService.listSubjectsByCourse(course_id),
    enabled: !!course_id,
    staleTime: 60_000,
  });
}

export function useAttStudents(campus_id: string, course_id: string, batch_id: string) {
  return useQuery({
    queryKey: QK.students(campus_id, course_id, batch_id),
    queryFn: () => attendanceService.listStudents({ campus_id, course_id, batch_id }),
    staleTime: 30_000,
  });
}

export function useAttRecords(
  campus_id: string,
  course_id: string,
  batch_id: string,
  attendance_date: string,
  subject_id: string | null,
) {
  return useQuery({
    queryKey: QK.records(campus_id, course_id, batch_id, attendance_date, subject_id),
    queryFn: () => attendanceService.listAttendance({ campus_id, course_id, batch_id, attendance_date, subject_id }),
    enabled: !!attendance_date,
    staleTime: 10_000,
  });
}

export function useSaveAttendance(
  campus_id: string,
  course_id: string,
  batch_id: string,
  attendance_date: string,
  subject_id: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: AttendanceUpsertRow[]) => attendanceService.upsertAttendance(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.records(campus_id, course_id, batch_id, attendance_date, subject_id) });
    },
  });
}
