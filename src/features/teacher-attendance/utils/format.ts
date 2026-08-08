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
    return new Date(iso);
  } catch {
    return null;
  }
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    if (iso.length === 10 && !iso.includes("T") && !iso.includes(":")) {
      const d = new Date(iso + "T00:00:00Z");
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-IN", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
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
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const timeStr = d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
    });
    return `${timeStr} · ${dateStr}`;
  } catch {
    return "—";
  }
}

/** Late punch-in threshold for punctuality stats (local time, 24h). */
export const LATE_PUNCH_IN_HOUR = 9;
export const LATE_PUNCH_IN_MINUTE = 30;

export function getKolkataTimeParts(d: Date): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "hour") hour = parseInt(part.value, 10);
    if (part.type === "minute") minute = parseInt(part.value, 10);
  }
  return { hour, minute };
}

export function isLatePunchIn(iso: string | null | undefined): boolean {
  if (!iso) return false;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    const { hour, minute } = getKolkataTimeParts(d);
    if (hour > LATE_PUNCH_IN_HOUR) return true;
    if (hour === LATE_PUNCH_IN_HOUR && minute > LATE_PUNCH_IN_MINUTE) return true;
    return false;
  } catch {
    return false;
  }
}

/** Sessions shorter than this are flagged in the alerts panel. */
export const SHORT_SESSION_MINUTES = 10;

/** Max allowed continuous session time for teacher attendance (4 hours). */
export const MAX_SESSION_HOURS = 4;
export const MAX_SESSION_MINUTES = 240;
export const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;

export function isAutoClosed4Hours(
  startIso?: string | null,
  endIso?: string | null,
  durationMinutes?: number | null,
): boolean {
  if (durationMinutes === MAX_SESSION_MINUTES) return true;
  if (!startIso || !endIso) return false;
  try {
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const diffMins = Math.round((endMs - startMs) / (60 * 1000));
    return diffMins >= MAX_SESSION_MINUTES - 1 && diffMins <= MAX_SESSION_MINUTES + 1;
  } catch {
    return false;
  }
}


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
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
}
