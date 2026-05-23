import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parentService, CreateParentResult } from "../services/parent_service";
import { Parent } from "../types";
import { ParentFormValues } from "../schemas";

const QK = "parents";
const UNLINKED_QK = "students-unlinked";

export function useParents() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => parentService.getAll(),
    staleTime: 30_000,
  });
}

export function useParent(id: string) {
  return useQuery({
    queryKey: [QK, id],
    queryFn: () => parentService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUnlinkedStudents() {
  return useQuery({
    queryKey: [UNLINKED_QK],
    queryFn: () => parentService.getUnlinkedStudents(),
    staleTime: 15_000,
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation<CreateParentResult, Error, { values: ParentFormValues; photoFile?: File }>({
    mutationFn: ({ values, photoFile }) => parentService.create(values, photoFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: [UNLINKED_QK] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values, photoFile }: { id: string; values: Partial<ParentFormValues>; photoFile?: File }) =>
      parentService.update(id, values, photoFile),
    onSuccess: (updated) => {
      qc.setQueryData<Parent[]>([QK], (old = []) =>
        old.map((p) => (p.id === updated.id ? updated : p))
      );
      qc.invalidateQueries({ queryKey: [UNLINKED_QK] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useToggleParentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parent["account_status"] }) =>
      parentService.toggleStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: [QK] });
      const prev = qc.getQueryData<Parent[]>([QK]);
      qc.setQueryData<Parent[]>([QK], (old = []) =>
        old.map((p) => (p.id === id ? { ...p, account_status: status } : p))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData([QK], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useDeleteParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parentService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: [UNLINKED_QK] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useLinkStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ parent_id, student_ids }: { parent_id: string; student_ids: string[] }) =>
      parentService.linkStudents(parent_id, student_ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: [UNLINKED_QK] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUnlinkStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (student_id: string) => parentService.unlinkStudent(student_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: [UNLINKED_QK] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useResetParentPassword() {
  return useMutation({
    mutationFn: (email: string) => parentService.resetPassword(email),
  });
}
