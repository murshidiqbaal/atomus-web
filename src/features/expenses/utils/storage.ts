import { CATEGORY_PALETTE, DEFAULT_ITEMS, ExpenseItem, IconKey } from "../types";

const PERIOD_KEY = "atomus:expenses:period:v1";
const CAMPUS_KEY = "atomus:expenses:campus:v1";
const LEGACY_KEY = "atomus:expenses:v1";

/** Sentinel campusId for "all campuses" — a computed aggregate, not a stored bucket. */
export const ALL_CAMPUSES = "_all";

function monthKey(period: string, campusId: string): string {
  return `atomus:expenses:month:${period}:${campusId}`;
}

function legacyMonthKey(period: string): string {
  return `atomus:expenses:month:${period}`;
}

const MONTH_PREFIX = "atomus:expenses:month:";

function defaultItems(): ExpenseItem[] {
  return DEFAULT_ITEMS.map((i) => ({ ...i, amount: 0, notes: "" }));
}

function parseItems(raw: string | null): ExpenseItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExpenseItem[];
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map((p) => ({ ...p, amount: Number(p.amount) || 0 }));
  } catch {
    return null;
  }
}

/**
 * Read every per-campus bucket stored for the given period (plus the legacy
 * un-scoped buckets) and aggregate items by label.
 *
 * Items with identical labels are summed; notes are concatenated when distinct.
 * The earliest icon/color seen for a given label wins so the visual identity
 * is stable across renders.
 */
function aggregateAcrossCampuses(period: string): ExpenseItem[] {
  if (typeof window === "undefined") return defaultItems();

  const buckets: ExpenseItem[][] = [];
  const prefix = `${MONTH_PREFIX}${period}:`;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const campus = key.slice(prefix.length);
    if (campus === ALL_CAMPUSES) continue; // the aggregate is computed, never read
    const parsed = parseItems(window.localStorage.getItem(key));
    if (parsed) buckets.push(parsed);
  }

  // Legacy un-scoped data (pre-campus): treat as a contributing bucket.
  const legacyMonth = parseItems(window.localStorage.getItem(legacyMonthKey(period)));
  if (legacyMonth) buckets.push(legacyMonth);
  if (period === currentMonth()) {
    const legacy = parseItems(window.localStorage.getItem(LEGACY_KEY));
    if (legacy) buckets.push(legacy);
  }

  if (buckets.length === 0) return defaultItems();

  type Agg = { label: string; iconKey: IconKey; color: string; amount: number; notes: string[] };
  const byLabel = new Map<string, Agg>();
  let order = 0;
  const orderByLabel = new Map<string, number>();

  for (const items of buckets) {
    for (const it of items) {
      const label = (it.label ?? "").trim() || "Untitled";
      const existing = byLabel.get(label);
      if (existing) {
        existing.amount += Number(it.amount) || 0;
        if (it.notes && !existing.notes.includes(it.notes)) existing.notes.push(it.notes);
      } else {
        byLabel.set(label, {
          label,
          iconKey: it.iconKey,
          color: it.color,
          amount: Number(it.amount) || 0,
          notes: it.notes ? [it.notes] : [],
        });
        orderByLabel.set(label, order++);
      }
    }
  }

  // Default items first (in their canonical order), then any custom labels by
  // first-seen order across buckets.
  const defaultLabels = DEFAULT_ITEMS.map((d) => d.label);
  const sorted = Array.from(byLabel.values()).sort((a, b) => {
    const ai = defaultLabels.indexOf(a.label);
    const bi = defaultLabels.indexOf(b.label);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return (orderByLabel.get(a.label) ?? 0) - (orderByLabel.get(b.label) ?? 0);
  });

  return sorted.map((a, i) => ({
    id: `agg-${i}-${a.label}`,
    label: a.label,
    iconKey: a.iconKey,
    color: a.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    amount: a.amount,
    notes: a.notes.join(" · "),
    custom: !defaultLabels.includes(a.label),
  }));
}

export function loadItems(period: string, campusId: string = ALL_CAMPUSES): ExpenseItem[] {
  if (typeof window === "undefined") return defaultItems();

  if (campusId === ALL_CAMPUSES) return aggregateAcrossCampuses(period);

  const parsed = parseItems(window.localStorage.getItem(monthKey(period, campusId)));
  return parsed ?? defaultItems();
}

export function saveItems(period: string, campusId: string, items: ExpenseItem[]) {
  if (typeof window === "undefined") return;
  // The "all campuses" view is a computed aggregate — never write back to it.
  if (campusId === ALL_CAMPUSES) return;
  window.localStorage.setItem(monthKey(period, campusId), JSON.stringify(items));
}

export interface YearlyDataPoint {
  month: string;      // "Jan", "Feb", ...
  monthKey: string;   // "YYYY-MM"
  total: number;
  breakdown: Record<string, number>;
}

const MONTHS: { label: string; key: string }[] = [
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

function readMonth(period: string, campusId: string): ExpenseItem[] {
  if (typeof window === "undefined") return [];
  if (campusId === ALL_CAMPUSES) {
    const agg = aggregateAcrossCampuses(period);
    // aggregateAcrossCampuses returns defaultItems() when nothing exists; treat
    // a zero-total result as "no data" so empty months don't pollute analytics.
    const hasAny = agg.some((i) => (i.amount || 0) > 0);
    return hasAny ? agg : [];
  }
  return parseItems(window.localStorage.getItem(monthKey(period, campusId))) ?? [];
}

export function getYearlyData(year: number, campusId: string = ALL_CAMPUSES): YearlyDataPoint[] {
  return MONTHS.map((m) => {
    const mk = `${year}-${m.key}`;
    const items = readMonth(mk, campusId);
    const total = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const breakdown: Record<string, number> = {};
    items.forEach((item) => {
      const amt = Number(item.amount) || 0;
      if (amt > 0) breakdown[item.label] = (breakdown[item.label] || 0) + amt;
    });
    return { month: m.label, monthKey: mk, total, breakdown };
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

export function loadCampus(): string {
  if (typeof window === "undefined") return ALL_CAMPUSES;
  return window.localStorage.getItem(CAMPUS_KEY) || ALL_CAMPUSES;
}

export function saveCampus(campusId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAMPUS_KEY, campusId);
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
