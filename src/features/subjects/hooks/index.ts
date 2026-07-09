import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectService } from "../services/subject_service";
import { SubjectFormValues } from "../schemas";
import { Subject } from "../types";
import { supabase } from "@/lib/supabase";

const QK = "subjects";

export function useSubjects() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => subjectService.getAll(),
    staleTime: 30_000,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, class_level")
        .order("name");
      return (data ?? []) as { id: string; name: string; class_level?: string | null }[];
    },
    staleTime: 60_000,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: SubjectFormValues) => subjectService.create(values),
    onSuccess: (created) => {
      qc.setQueryData<Subject[]>([QK], (old = []) => [created, ...old]);
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectFormValues }) =>
      subjectService.update(id, values),
    onSuccess: (updated) => {
      qc.setQueryData<Subject[]>([QK], (old = []) =>
        old.map((s) => (s.id === updated.id ? updated : s))
      );
    },
  });
}

export function useToggleSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      subjectService.toggleActive(id, is_active),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<Subject[]>([QK]);
      qc.setQueryData<Subject[]>([QK], (old = []) =>
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

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectService.remove(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<Subject[]>([QK], (old = []) =>
        old.filter((s) => s.id !== id)
      );
    },
  });
}
