import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "../services/expense_service";
import {
  ExpenseCategoryInput, ExpenseFilters, ExpenseInput,
} from "../types";

export const QK = {
  categories: (activeOnly: boolean) => ["expenses", "categories", activeOnly] as const,
  campuses: ["expenses", "campuses"] as const,
  list: (filters: ExpenseFilters) => ["expenses", "list", filters] as const,
  analytics: ["expenses", "analytics"] as const,
};

// ── Categories ──────────────────────────────────────────────────
export function useExpenseCategories(activeOnly = false) {
  return useQuery({
    queryKey: QK.categories(activeOnly),
    queryFn: () => expenseService.listCategories({ activeOnly }),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseCategoryInput) => expenseService.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", "categories"], exact: false }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseCategoryInput> }) =>
      expenseService.updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", "categories"], exact: false }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"], exact: false });
    },
  });
}

// ── Expenses ────────────────────────────────────────────────────
export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: QK.list(filters),
    queryFn: () => expenseService.listExpenses(filters),
    staleTime: 30_000,
  });
}

export function useAnalyticsData() {
  return useQuery({
    queryKey: QK.analytics,
    queryFn: () => expenseService.listForAnalytics(),
    staleTime: 60_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => expenseService.createExpense(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"], exact: false }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseInput> }) =>
      expenseService.updateExpense(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"], exact: false }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"], exact: false }),
  });
}

// ── Campuses (shared lookup) ────────────────────────────────────
export function useExpCampuses() {
  return useQuery({
    queryKey: QK.campuses,
    queryFn: () => expenseService.listCampuses(),
    staleTime: 5 * 60_000,
  });
}
