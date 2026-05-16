import { Grade } from "../types";

export function getGrade(pct: number): Grade {
  if (pct >= 90) return "Excellent";
  if (pct >= 75) return "Good";
  if (pct >= 50) return "Average";
  return "Needs Improvement";
}

export const GRADE_CFG: Record<Grade, { badge: string; bar: string; chart: string }> = {
  Excellent:           { badge: "bg-emerald-50 text-emerald-700 border border-emerald-100", bar: "bg-emerald-500", chart: "#10b981" },
  Good:                { badge: "bg-blue-50 text-[#0B3C5D] border border-blue-100",         bar: "bg-[#0B3C5D]",   chart: "#0B3C5D" },
  Average:             { badge: "bg-amber-50 text-amber-600 border border-amber-100",        bar: "bg-amber-400",   chart: "#f59e0b" },
  "Needs Improvement": { badge: "bg-rose-50 text-rose-600 border border-rose-100",           bar: "bg-rose-500",    chart: "#f43f5e" },
};

export function calcPct(obtained: number, total: number): number {
  return total > 0 ? (obtained / total) * 100 : 0;
}
