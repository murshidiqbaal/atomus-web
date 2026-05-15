import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "../services/student_service";
import { StudentFormValues } from "../schemas";
import { Student } from "../types";
import { supabase } from "@/lib/supabase";

const QK = "students";

export function useStudents() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => studentService.getAll(),
    staleTime: 30_000,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: [QK, id],
    queryFn: () => studentService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    staleTime: 60_000,
  });
}

export function useAllBatches() {
  return useQuery({
    queryKey: ["all-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, name, course_id")
        .order("name");
      return (data ?? []) as { id: string; name: string; course_id: string }[];
    },
    staleTime: 60_000,
  });
}

export function useBatchesByCourse(course_id: string) {
  return useQuery({
    queryKey: ["batches", course_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, name")
        .eq("course_id", course_id)
        .order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!course_id,
    staleTime: 60_000,
  });
}

export function useStudentAttendance(student_id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["student-attendance", student_id],
    queryFn: () => studentService.getAttendance(student_id),
    enabled: !!student_id && enabled,
    staleTime: 30_000,
  });
}

export function useStudentMarks(student_id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["student-marks", student_id],
    queryFn: () => studentService.getMarks(student_id),
    enabled: !!student_id && enabled,
    staleTime: 30_000,
  });
}

export function useSubjectsByCourse(course_id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["subjects-course", course_id],
    queryFn: () => studentService.getSubjectsByCourse(course_id),
    enabled: !!course_id && enabled,
    staleTime: 300_000,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ values, photoFile }: { values: StudentFormValues; photoFile?: File }) =>
      studentService.create(values, photoFile),
    onSuccess: (created) => {
      qc.setQueryData<Student[]>([QK], (old = []) => [created, ...old]);
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values, photoFile }: { id: string; values: StudentFormValues; photoFile?: File }) =>
      studentService.update(id, values, photoFile),
    onSuccess: (updated) => {
      qc.setQueryData<Student[]>([QK], (old = []) =>
        old.map((s) => (s.id === updated.id ? updated : s))
      );
      qc.setQueryData([QK, updated.id], updated);
    },
  });
}

export function useToggleStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      studentService.toggleActive(id, is_active),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<Student[]>([QK]);
      qc.setQueryData<Student[]>([QK], (old = []) =>
        old.map((s) => (s.id === id ? { ...s, is_active } : s))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData([QK], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}
