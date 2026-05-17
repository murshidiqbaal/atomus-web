import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feesService } from "../services/fees_service";
import {
  FeeFilters,
  FeeStructureInsert,
  PaymentTransactionInsert,
} from "../types";

export const QK = {
  campuses: ["fees", "campuses"] as const,
  courses: (campus_id: string) => ["fees", "courses", campus_id || "*"] as const,
  batches: (course_id: string, campus_id: string) =>
    ["fees", "batches", course_id || "*", campus_id || "*"] as const,
  structures: (campus_id: string, course_id: string, batch_id: string) =>
    ["fees", "structures", campus_id || "*", course_id || "*", batch_id || "*"] as const,
  studentFees: (filters: FeeFilters) =>
    ["fees", "studentFees", filterKey(filters)] as const,
  studentFee: (student_id: string) =>
    ["fees", "studentFee", student_id] as const,
  payments: (filters: FeeFilters) =>
    ["fees", "payments", filterKey(filters)] as const,
  stats: ["fees", "stats"] as const,
  monthly: (months: number) => ["fees", "monthly", months] as const,
  campusRevenue: ["fees", "campusRevenue"] as const,
};

function filterKey(f: FeeFilters): string {
  return [
    f.campus_id, f.course_id, f.batch_id, f.status,
    f.search, f.date_from, f.date_to, f.method,
  ].join("|");
}

// ── Lookups ────────────────────────────────────────────────────
export function useFeeCampuses() {
  return useQuery({
    queryKey: QK.campuses,
    queryFn: () => feesService.listCampuses(),
    staleTime: 5 * 60_000,
  });
}

export function useFeeCourses(campus_id: string) {
  return useQuery({
    queryKey: QK.courses(campus_id),
    queryFn: () => feesService.listCoursesByCampus(campus_id),
    staleTime: 60_000,
  });
}

export function useFeeBatches(course_id: string, campus_id: string) {
  return useQuery({
    queryKey: QK.batches(course_id, campus_id),
    queryFn: () => feesService.listBatches(course_id, campus_id),
    staleTime: 60_000,
  });
}

// ── Structures ─────────────────────────────────────────────────
export function useFeeStructures(filters: {
  campus_id?: string;
  course_id?: string;
  batch_id?: string;
}) {
  return useQuery({
    queryKey: QK.structures(filters.campus_id ?? "", filters.course_id ?? "", filters.batch_id ?? ""),
    queryFn: () => feesService.listFeeStructures(filters),
    staleTime: 30_000,
  });
}

export function useCreateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeeStructureInsert) => feesService.createFeeStructure(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "structures"] });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesService.deleteFeeStructure(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "structures"] });
    },
  });
}

// ── Student fees ───────────────────────────────────────────────
export function useStudentFees(filters: FeeFilters) {
  return useQuery({
    queryKey: QK.studentFees(filters),
    queryFn: () => feesService.listStudentFees(filters),
    staleTime: 15_000,
  });
}

export function useStudentFee(student_id: string) {
  return useQuery({
    queryKey: QK.studentFee(student_id),
    queryFn: () => feesService.getStudentFee(student_id),
    enabled: !!student_id,
    staleTime: 5_000,
  });
}

export function useApplyDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id: string; new_total: number; new_discount: number }) =>
      feesService.applyDiscount(input.student_id, input.new_total, input.new_discount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: ["fees", "studentFee"] });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useBulkAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fee_structure_id: string) => feesService.bulkAssignToBatch(fee_structure_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

// ── Payments ───────────────────────────────────────────────────
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentTransactionInsert) => feesService.recordPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: ["fees", "studentFee"] });
      qc.invalidateQueries({ queryKey: ["fees", "payments"] });
      qc.invalidateQueries({ queryKey: QK.stats });
      qc.invalidateQueries({ queryKey: ["fees", "monthly"] });
      qc.invalidateQueries({ queryKey: QK.campusRevenue });
    },
  });
}

export function usePayments(filters: FeeFilters) {
  return useQuery({
    queryKey: QK.payments(filters),
    queryFn: () => feesService.listPayments(filters),
    staleTime: 15_000,
  });
}

// ── Dashboard ──────────────────────────────────────────────────
export function useFeeStats() {
  return useQuery({
    queryKey: QK.stats,
    queryFn: () => feesService.getDashboardStats(),
    staleTime: 30_000,
  });
}

export function useMonthlyTrend(months = 6) {
  return useQuery({
    queryKey: QK.monthly(months),
    queryFn: () => feesService.getMonthlyTrend(months),
    staleTime: 60_000,
  });
}

export function useCampusRevenue() {
  return useQuery({
    queryKey: QK.campusRevenue,
    queryFn: () => feesService.getCampusRevenue(),
    staleTime: 60_000,
  });
}
