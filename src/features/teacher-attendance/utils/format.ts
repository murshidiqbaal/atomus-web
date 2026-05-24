import type { GpsStatus, TeacherStatusBadge } from "../types";

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format ms → "01h 24m 12s" (or "24m 12s" / "12s"). */
export function formatDurationHMS(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) ms = 0;
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${pad2(h)}h ${pad2(m)}m ${pad2(s)}s`;
  if (m > 0) return `${pad2(m)}m ${pad2(s)}s`;
  return `${pad2(s)}s`;
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  const m = Number(minutes ?? 0);
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h > 0) return `${h}h ${pad2(r)}m`;
  return `${m}m`;
}

export function toLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    // If it's a date-only string (e.g. YYYY-MM-DD), replace - with / to force local parsing
    if (iso.length === 10 && !iso.includes("T") && !iso.includes(":")) {
      return new Date(iso.replace(/-/g, "/"));
    }
    // Strip timezone offset (Z, +HH:MM, -HH:MM) to force local time parsing
    const clean = iso.replace(/Z|([+-]\d\d:\d\d)$/, "");
    return new Date(clean);
  } catch {
    return null;
  }
}

export function formatTime(iso: string | null | undefined): string {
  const d = toLocalDate(iso);
  if (!d) return "—";
  try {
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export function formatDate(iso: string | null | undefined): string {
  const d = toLocalDate(iso);
  if (!d) return "—";
  try {
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** "9:42 AM · 23 May" — compact for table cells. */
export function formatDateTimeCompact(iso: string | null | undefined): string {
  const d = toLocalDate(iso);
  if (!d) return "—";
  try {
    return `${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} · ${
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }`;
  } catch {
    return "—";
  }
}

/** Late punch-in threshold for punctuality stats (local time, 24h). */
export const LATE_PUNCH_IN_HOUR = 9;
export const LATE_PUNCH_IN_MINUTE = 30;

export function isLatePunchIn(iso: string | null | undefined): boolean {
  const d = toLocalDate(iso);
  if (!d) return false;
  const h = d.getHours();
  const m = d.getMinutes();
  if (h > LATE_PUNCH_IN_HOUR) return true;
  if (h === LATE_PUNCH_IN_HOUR && m > LATE_PUNCH_IN_MINUTE) return true;
  return false;
}

/** Sessions shorter than this are flagged in the alerts panel. */
export const SHORT_SESSION_MINUTES = 10;

export function statusTone(s: TeacherStatusBadge): {
  bg: string; text: string; dot: string;
} {
  switch (s) {
    case "Active":
      return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
    case "Completed":
      return { bg: "bg-[#0B3C5D]/10", text: "text-[#0B3C5D]", dot: "bg-[#0B3C5D]" };
    case "Missed":
      return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" };
    case "Offline":
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" };
  }
}

export function gpsTone(s: GpsStatus): {
  bg: string; text: string; label: string;
} {
  switch (s) {
    case "Verified":
      return { bg: "bg-emerald-50", text: "text-emerald-700", label: "GPS Verified" };
    case "Outside":
      return { bg: "bg-amber-50", text: "text-amber-700", label: "Outside Radius" };
    case "Unknown":
    default:
      return { bg: "bg-slate-100", text: "text-slate-500", label: "No GPS" };
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
