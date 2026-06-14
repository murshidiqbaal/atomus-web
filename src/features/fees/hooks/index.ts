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
  structures: (campus_id: string, course_id: string) =>
    ["fees", "structures", campus_id || "*", course_id || "*"] as const,
  studentFees: (filters: FeeFilters) =>
    ["fees", "studentFees", filterKey(filters)] as const,
  studentFee: (student_id: string) =>
    ["fees", "studentFee", student_id] as const,
  studentPayments: (student_id: string) =>
    ["fees", "studentPayments", student_id] as const,
  payments: (filters: FeeFilters) =>
    ["fees", "payments", filterKey(filters)] as const,
  stats: ["fees", "stats"] as const,
  monthly: (months: number) => ["fees", "monthly", months] as const,
  campusRevenue: ["fees", "campusRevenue"] as const,
};

function filterKey(f: FeeFilters): string {
  return [
    f.campus_id, f.course_id, f.fee_structure_id, f.status,
    f.search, f.date_from, f.date_to, f.method, f.academic_status,
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

// ── Structures ─────────────────────────────────────────────────
export function useFeeStructures(filters: {
  campus_id?: string;
  course_id?: string;
}) {
  return useQuery({
    queryKey: QK.structures(filters.campus_id ?? "", filters.course_id ?? ""),
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

export function useUpdateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: FeeStructureInsert }) =>
      feesService.updateFeeStructure(args.id, args.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "structures"] });
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

export function useAssignStructureToScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fee_structure_id: string) =>
      feesService.assignStructureToScope(fee_structure_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: QK.stats });
      qc.invalidateQueries({ queryKey: QK.campusRevenue });
    },
  });
}

export function useAssignStructureToStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { student_id: string; fee_structure_id: string; start_date?: string }) =>
      feesService.assignStructureToStudent(args),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: QK.studentFee(args.student_id) });
      qc.invalidateQueries({ queryKey: QK.stats });
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

export function useStudentFeesForStudent(student_id: string) {
  return useQuery({
    queryKey: QK.studentFee(student_id),
    queryFn: () => feesService.listStudentFeesForStudent(student_id),
    enabled: !!student_id,
    staleTime: 5_000,
  });
}

export function useStudentPayments(student_id: string, student_fee_id?: string) {
  return useQuery({
    queryKey: [...QK.studentPayments(student_id), student_fee_id ?? "*"],
    queryFn: () => feesService.listStudentPayments(student_id, student_fee_id),
    enabled: !!student_id,
    staleTime: 10_000,
  });
}

export function useApplyDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_fee_id: string; new_total: number; new_discount: number }) =>
      feesService.applyDiscount(input.student_fee_id, input.new_total, input.new_discount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: ["fees", "studentFee"] });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_fee_id: string; status: string }) =>
      feesService.updatePaymentStatus(input.student_fee_id, input.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: ["fees", "studentFee"] });
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
      qc.invalidateQueries({ queryKey: ["fees", "studentPayments"] });
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

export function useAddManualFeeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { student_id: string; name: string; amount: number; due_date: string; student_fee_id?: string }) =>
      feesService.addManualFeeItem(args),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: QK.studentFee(args.student_id) });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}

export function useUpdateStudentTermStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      student_id: string;
      student_fee_id: string;
      term_name: string;
      patch: { amount_due?: number; amount_paid?: number; due_date?: string };
    }) => feesService.updateStudentTermStatus(args.student_fee_id, args.term_name, args.patch),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ["fees", "studentFees"] });
      qc.invalidateQueries({ queryKey: QK.studentFee(args.student_id) });
      qc.invalidateQueries({ queryKey: ["fees", "studentPayments", args.student_id] });
      qc.invalidateQueries({ queryKey: QK.stats });
    },
  });
}
