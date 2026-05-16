import { DEFAULT_ITEMS, ExpenseItem } from "../types";

const STORAGE_KEY = "atomus:expenses:v1";
const PERIOD_KEY = "atomus:expenses:period:v1";

export function loadItems(): ExpenseItem[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw) as ExpenseItem[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_ITEMS;
    return parsed.map((p) => ({
      ...p,
      amount: Number(p.amount) || 0,
    }));
  } catch {
    return DEFAULT_ITEMS;
  }
}

export function saveItems(items: ExpenseItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadPeriod(): string {
  if (typeof window === "undefined") return currentMonth();
  return window.localStorage.getItem(PERIOD_KEY) || currentMonth();
}

export function savePeriod(period: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERIOD_KEY, period);
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
