import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { teacherService, CreateTeacherResult } from "../services/teacher_service";
import { Teacher } from "../types";
import { TeacherFormValues } from "../schemas";

const QK = "teachers";

export function useTeachers() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => teacherService.getAll(),
    staleTime: 30_000,
  });
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: [QK, id],
    queryFn: () => teacherService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useTeacherCourses() {
  return useQuery({
    queryKey: ["teacher-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useTeacherSubjects() {
  return useQuery({
    queryKey: ["teacher-subjects-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, course_id, courses(name)")
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as unknown as { id: string; name: string; course_id: string; courses: { name: string } | null }[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useTeacherBatches() {
  return useQuery({
    queryKey: ["teacher-batches-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, name, course_id")
        .order("name");
      return (data ?? []) as { id: string; name: string; course_id: string }[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation<CreateTeacherResult, Error, { values: TeacherFormValues; photoFile?: File }>({
    mutationFn: ({ values, photoFile }) => teacherService.create(values, photoFile),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values, photoFile }: { id: string; values: TeacherFormValues; photoFile?: File }) =>
      teacherService.update(id, values, photoFile),
    onSuccess: (updated) => {
      qc.setQueryData<Teacher[]>([QK], (old = []) =>
        old.map((t) => (t.id === updated.id ? updated : t))
      );
      qc.setQueryData([QK, updated.id], updated);
    },
  });
}

export function useToggleTeacherStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Teacher["account_status"] }) =>
      teacherService.toggleStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<Teacher[]>([QK]);
      qc.setQueryData<Teacher[]>([QK], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, account_status: status } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData([QK], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teacherService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useResetTeacherPassword() {
  return useMutation({ mutationFn: (email: string) => teacherService.resetPassword(email) });
}

export function useTeacherRecentAttendance(id: string, enabled = true) {
  return useQuery({
    queryKey: [QK, id, "attendance"],
    queryFn: () => teacherService.getRecentAttendance(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useTeacherRecentMarks(id: string, enabled = true) {
  return useQuery({
    queryKey: [QK, id, "marks"],
    queryFn: () => teacherService.getRecentMarks(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}
