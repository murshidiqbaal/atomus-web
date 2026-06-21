import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { attendanceService } from "../services/attendance_service";
import {
  AttendanceRecord,
  AttendanceUpsertRow,
  TeacherProfile,
} from "../types";

export const QK = {
  user: ["attendance", "currentUser"] as const,
  teacher: (authId: string | null) => ["attendance", "teacher", authId] as const,
  campuses: (campusFilter: string | null) =>
    ["attendance", "campuses", campusFilter ?? "*"] as const,
  courses: (campusId: string, restrict: string[] | null) =>
    ["attendance", "courses", campusId, restrict ? restrict.join(",") : "*"] as const,
  batches: (courseId: string, campusId: string, restrict: string[] | null) =>
    ["attendance", "batches", courseId, campusId, restrict ? restrict.join(",") : "*"] as const,
  subjects: (courseId: string, restrict: string[] | null) =>
    ["attendance", "subjects", courseId, restrict ? restrict.join(",") : "*"] as const,
  students: (campusId: string, courseId: string, batchId?: string) =>
    ["attendance", "students", campusId, courseId, batchId ?? "all"] as const,
  records: (
    campusId: string,
    courseId: string,
    batchId: string | undefined,
    date: string,
    subjectId: string | null,
    studentIds?: string[],
  ) =>
    [
      "attendance",
      "records",
      campusId || "all",
      courseId || "all",
      batchId || "all",
      date,
      subjectId || "overall",
      studentIds ? studentIds.join(",") : "all",
    ] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: QK.user,
    queryFn: () => attendanceService.getCurrentUser(),
    staleTime: 5 * 60_000,
  });
}

export function useTeacherProfile() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: QK.teacher(user?.id ?? null),
    queryFn: () => attendanceService.getTeacherProfile(user!.id),
    enabled: user?.role === "teacher",
    staleTime: 5 * 60_000,
  });
}

export function useTeacherRestrictions() {
  const { data: user } = useCurrentUser();
  const { data: teacher } = useTeacherProfile();

  return useMemo(() => {
    if (user?.role !== "teacher") {
      return {
        isTeacher: false,
        ready: !!user,
        teacher: null as TeacherProfile | null,
        campusFilter: null as string | null,
        courseFilter: null as string[] | null,
        batchFilter: null as string[] | null,
        subjectFilter: null as string[] | null,
      };
    }
    return {
      isTeacher: true,
      ready: !!teacher,
      teacher: teacher ?? null,
      campusFilter: teacher?.campus_id ?? null,
      courseFilter: teacher?.course_ids ?? [],
      batchFilter: teacher?.batch_ids ?? [],
      subjectFilter: teacher?.subject_ids ?? [],
    };
  }, [user, teacher]);
}

export function useAttCampuses() {
  const r = useTeacherRestrictions();
  return useQuery({
    queryKey: QK.campuses(r.campusFilter),
    queryFn: () => attendanceService.listCampuses(r.campusFilter),
    enabled: r.ready,
    staleTime: 5 * 60_000,
  });
}

export function useAttCourses(campus_id: string) {
  const r = useTeacherRestrictions();
  return useQuery({
    queryKey: QK.courses(campus_id, r.courseFilter),
    queryFn: () => attendanceService.listCoursesByCampus(campus_id, r.courseFilter),
    enabled: r.ready,
    staleTime: 60_000,
  });
}

export function useAttBatches(course_id: string, campus_id: string) {
  const r = useTeacherRestrictions();
  return useQuery({
    queryKey: QK.batches(course_id, campus_id, r.batchFilter),
    queryFn: () => attendanceService.listBatchesByCourseAndCampus(course_id, campus_id, r.batchFilter),
    enabled: r.ready,
    staleTime: 60_000,
  });
}

export function useAttSubjects(course_id: string) {
  const r = useTeacherRestrictions();
  return useQuery({
    queryKey: QK.subjects(course_id, r.subjectFilter),
    queryFn: () => attendanceService.listSubjectsByCourse(course_id, r.subjectFilter),
    enabled: r.ready,
    staleTime: 60_000,
  });
}

export function useAttStudents(campus_id: string, course_id: string, batch_id?: string) {
  return useQuery({
    queryKey: QK.students(campus_id, course_id, batch_id),
    queryFn: () => attendanceService.listStudents({ campus_id, course_id, batch_id }),
    enabled: true,
    staleTime: 30_000,
  });
}

export function useAttRecords(
  campus_id: string,
  course_id: string,
  batch_id: string | undefined,
  attendance_date: string,
  subject_id: string | null,
  student_ids?: string[],
) {
  return useQuery({
    queryKey: QK.records(
      campus_id,
      course_id,
      batch_id,
      attendance_date,
      subject_id,
      student_ids,
    ),
    queryFn: () =>
      attendanceService.listAttendance({
        campus_id: campus_id || undefined,
        course_id: course_id || undefined,
        batch_id: batch_id || undefined,
        attendance_date,
        subject_id,
        student_ids,
      }),
    enabled: !!attendance_date && (!student_ids || student_ids.length > 0),
    staleTime: 10_000,
  });
}

/**
 * Auto-save mutation with optimistic cache update.
 *
 * On mutate: patches the records cache so the UI reflects the save without
 * waiting on the network. On success: invalidates to pick up server truth
 * (ids, timestamps). On error: rolls back to the snapshot.
 */
export function useSaveAttendance(
  campus_id: string,
  course_id: string,
  batch_id: string | undefined,
  attendance_date: string,
  subject_id: string | null,
  student_ids?: string[],
) {
  const qc = useQueryClient();
  const key = QK.records(campus_id, course_id, batch_id, attendance_date, subject_id, student_ids);

  return useMutation({
    mutationFn: (rows: AttendanceUpsertRow[]) => attendanceService.upsertAttendance(rows),

    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceRecord[]>(key) ?? [];

      // Lookup keyed by (student, subject_id) so an edit doesn't overwrite a different
      // subject's row in the cache. The DB enforces the same uniqueness via
      // (student, COALESCE(subject, sentinel), date).
      const cellKey = (sid: string, subjectId: string | null) =>
        `${sid}|${subjectId ?? "null"}`;
      const lookup = new Map<string, number>();
      prev.forEach((r, idx) => {
        lookup.set(cellKey(r.student_id, r.subject_id), idx);
      });

      const next = prev.slice();
      for (const r of rows) {
        const k = cellKey(r.student_id, r.subject_id);
        const idx = lookup.get(k);
        if (idx != null) {
          next[idx] = {
            ...next[idx],
            status: r.status,
            remarks: r.remarks ?? next[idx].remarks,
            teacher_id: r.teacher_id ?? next[idx].teacher_id,
            marked_by: r.marked_by ?? next[idx].marked_by,
            updated_at: new Date().toISOString(),
          };
        } else {
          // Synthetic optimistic row — replaced after invalidation succeeds.
          next.push({
            id: `optimistic-${r.student_id}|${r.subject_id ?? "null"}-${Date.now()}`,
            student_id: r.student_id,
            campus_id: r.campus_id,
            course_id: r.course_id,
            batch_id: r.batch_id,
            subject_id: r.subject_id,
            teacher_id: r.teacher_id ?? null,
            attendance_date: r.attendance_date,
            status: r.status,
            remarks: r.remarks ?? null,
            marked_by: r.marked_by ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          lookup.set(k, next.length - 1);
        }
      }

      qc.setQueryData(key, next);
      return { prev };
    },

    onError: (_err, _rows, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
