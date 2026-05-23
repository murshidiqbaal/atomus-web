import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherAttendanceService } from "../services/teacher_attendance_service";
import type {
  AdminAttendanceOverride, TeacherAttendanceFilters,
} from "../types";

/**
 * 20s feels right for a wall-mounted admin board: fast enough that the active
 * panel feels live, slow enough not to thrash Supabase or annoy network tabs.
 */
export const ACTIVE_SESSIONS_REFETCH_MS = 20_000;

export const QK = {
  active: (f: TeacherAttendanceFilters) => ["teacher-attendance", "active", f] as const,
  list: (f: TeacherAttendanceFilters) => ["teacher-attendance", "list", f] as const,
  analytics: ["teacher-attendance", "analytics"] as const,
  session: (id: string) => ["teacher-attendance", "session", id] as const,
  campuses: ["teacher-attendance", "lookup", "campuses"] as const,
  courses: ["teacher-attendance", "lookup", "courses"] as const,
  subjects: ["teacher-attendance", "lookup", "subjects"] as const,
  teachers: ["teacher-attendance", "lookup", "teachers"] as const,
};

export function useActiveSessions(filters: TeacherAttendanceFilters) {
  return useQuery({
    queryKey: QK.active(filters),
    queryFn: () => teacherAttendanceService.listActiveSessions(filters),
    refetchInterval: ACTIVE_SESSIONS_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useTeacherAttendanceList(filters: TeacherAttendanceFilters) {
  return useQuery({
    queryKey: QK.list(filters),
    queryFn: () => teacherAttendanceService.listAttendance(filters),
    staleTime: 30_000,
  });
}

export function useTeacherAttendanceAnalytics() {
  return useQuery({
    queryKey: QK.analytics,
    queryFn: () => teacherAttendanceService.listForAnalytics(),
    staleTime: 60_000,
  });
}

export function useSessionDetails(id: string | null) {
  return useQuery({
    queryKey: QK.session(id ?? "__none__"),
    queryFn: () => teacherAttendanceService.getSession(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teacherAttendanceService.closeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-attendance"], exact: false }),
  });
}

export function useOverrideSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AdminAttendanceOverride }) =>
      teacherAttendanceService.overrideSession(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-attendance"], exact: false }),
  });
}

// ── Lookups (cached, rarely changing) ─────────────────────────────
export function useTaCampuses() {
  return useQuery({
    queryKey: QK.campuses,
    queryFn: () => teacherAttendanceService.listCampuses(),
    staleTime: 5 * 60_000,
  });
}

export function useTaCourses() {
  return useQuery({
    queryKey: QK.courses,
    queryFn: () => teacherAttendanceService.listCourses(),
    staleTime: 5 * 60_000,
  });
}

export function useTaSubjects() {
  return useQuery({
    queryKey: QK.subjects,
    queryFn: () => teacherAttendanceService.listSubjects(),
    staleTime: 5 * 60_000,
  });
}

export function useTaTeachers() {
  return useQuery({
    queryKey: QK.teachers,
    queryFn: () => teacherAttendanceService.listTeachers(),
    staleTime: 5 * 60_000,
  });
}
