import { DEFAULT_ITEMS, ExpenseItem } from "../types";

const STORAGE_KEY = "atomus:expenses:v1";
const PERIOD_KEY = "atomus:expenses:period:v1";

export function loadItems(period: string): ExpenseItem[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS.map((i) => ({ ...i, amount: 0, notes: "" }));
  try {
    const raw = window.localStorage.getItem(`atomus:expenses:month:${period}`);
    if (!raw) {
      // Also try to check the legacy STORAGE_KEY so users don't lose data if they had any
      const legacyRaw = window.localStorage.getItem("atomus:expenses:v1");
      if (legacyRaw && period === currentMonth()) {
        const parsed = JSON.parse(legacyRaw) as ExpenseItem[];
        return parsed.map((p) => ({ ...p, amount: Number(p.amount) || 0 }));
      }
      return DEFAULT_ITEMS.map((i) => ({ ...i, amount: 0, notes: "" }));
    }
    const parsed = JSON.parse(raw) as ExpenseItem[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_ITEMS.map((i) => ({ ...i, amount: 0, notes: "" }));
    return parsed.map((p) => ({
      ...p,
      amount: Number(p.amount) || 0,
    }));
  } catch {
    return DEFAULT_ITEMS.map((i) => ({ ...i, amount: 0, notes: "" }));
  }
}

export function saveItems(period: string, items: ExpenseItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`atomus:expenses:month:${period}`, JSON.stringify(items));
}

export interface YearlyDataPoint {
  month: string;      // "Jan", "Feb", ...
  monthKey: string;   // "YYYY-MM"
  total: number;
  breakdown: Record<string, number>;
}

export function getYearlyData(year: number): YearlyDataPoint[] {
  const months = [
    { label: "Jan", key: "01" },
    { label: "Feb", key: "02" },
    { label: "Mar", key: "03" },
    { label: "Apr", key: "04" },
    { label: "May", key: "05" },
    { label: "Jun", key: "06" },
    { label: "Jul", key: "07" },
    { label: "Aug", key: "08" },
    { label: "Sep", key: "09" },
    { label: "Oct", key: "10" },
    { label: "Nov", key: "11" },
    { label: "Dec", key: "12" },
  ];

  return months.map((m) => {
    const monthKey = `${year}-${m.key}`;
    // Directly fetch from localstorage or use loadItems
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(`atomus:expenses:month:${monthKey}`) : null;
    let items: ExpenseItem[] = [];
    if (raw) {
      try {
        items = JSON.parse(raw) as ExpenseItem[];
      } catch {
        items = [];
      }
    } else {
      // check legacy
      const legacyRaw = typeof window !== "undefined" ? window.localStorage.getItem("atomus:expenses:v1") : null;
      if (legacyRaw && monthKey === currentMonth()) {
        try {
          items = JSON.parse(legacyRaw) as ExpenseItem[];
        } catch {
          items = [];
        }
      }
    }

    const total = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const breakdown: Record<string, number> = {};
    items.forEach((item) => {
      const amt = Number(item.amount) || 0;
      if (amt > 0) {
        breakdown[item.label] = (breakdown[item.label] || 0) + amt;
      }
    });

    return {
      month: m.label,
      monthKey,
      total,
      breakdown,
    };
  });
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
