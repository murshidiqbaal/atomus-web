"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, BookOpen, Building2, CheckCircle2, Clock, Hash, Loader2,
  LogIn, LogOut, MapPin, X, XCircle,
} from "lucide-react";
import { useCloseSession, useOverrideSession, useSessionDetails } from "../hooks";
import type { TeacherAttendanceDTO } from "../types";
import {
  Avatar, GhostButton, GpsBadge, PrimaryButton, StatusBadge,
} from "./ui";
import {
  formatDate, formatDurationMinutes, formatTime,
} from "../utils/format";

function gpsForRow(r: TeacherAttendanceDTO): "Verified" | "Outside" | "Unknown" {
  if (r.latitude != null && r.longitude != null) {
    if (r.attendance_status === "Missed") return "Outside";
    return "Verified";
  }
  return "Unknown";
}

interface Props {
  sessionId: string | null;
  onClose: () => void;
  onToast: (type: "success" | "error", msg: string) => void;
}

export function SessionDetailsModal({ sessionId, onClose, onToast }: Props) {
  const open = !!sessionId;
  const { data: row, isLoading, isError } = useSessionDetails(sessionId);
  const closeMut = useCloseSession();
  const overrideMut = useOverrideSession();
  const [confirming, setConfirming] = useState<null | "close" | "miss">(null);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/40 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-[#0B3C5D] text-white p-2 rounded-xl">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 leading-tight">Teacher Session Details</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Drill-down view for one attendance record</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : isError || !row ? (
            <p className="text-sm text-rose-600 text-center py-6">Failed to load session.</p>
          ) : (
            <div className="space-y-5">
              {/* Teacher header */}
              <div className="flex items-start gap-3">
                <Avatar
                  name={row.teacher?.full_name ?? "?"}
                  url={row.teacher?.profile_photo_url}
                  size={56}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900 truncate">
                    {row.teacher?.full_name ?? "Unknown teacher"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{row.teacher?.email ?? ""}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.attendance_status} />
                    <GpsBadge status={gpsForRow(row)} />
                  </div>
                </div>
              </div>

              {/* Class info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InfoRow icon={<BookOpen size={14} />} label="Subject" value={row.subject?.name ?? "—"} />
                <InfoRow icon={<Hash size={14} />} label="Course" value={row.course?.name ?? "—"} />
                <InfoRow icon={<Building2 size={14} />} label="Campus" value={row.campus?.name ?? "—"} />
                <InfoRow icon={<Clock size={14} />} label="Attendance Date" value={formatDate(row.attendance_date)} />
              </div>

              {/* Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <InfoRow icon={<LogIn size={14} />} label="Punch In Time" value={formatTime(row.start_time)} tone="emerald" />
                <InfoRow icon={<LogOut size={14} />} label="Punch Out Time" value={row.end_time ? formatTime(row.end_time) : "—"} tone="rose" />
                <InfoRow icon={<Clock size={14} />} label="Duration" value={formatDurationMinutes(row.total_duration_minutes)} tone="blue" />
              </div>

              {/* GPS */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                  <MapPin size={11} />
                  GPS Coordinates
                </p>
                {row.latitude == null || row.longitude == null ? (
                  <p className="text-sm text-slate-500">Not captured for this session.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Latitude</p>
                      <p className="font-mono font-bold text-slate-800">{row.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Longitude</p>
                      <p className="font-mono font-bold text-slate-800">{row.longitude.toFixed(6)}</p>
                    </div>
                    <a
                      className="col-span-2 text-[11px] font-bold text-[#0B3C5D] hover:underline"
                      href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                )}
              </div>

              {/* Admin overrides */}
              <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  Admin Overrides
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Use sparingly — actions update the underlying record permanently.
                </p>

                {confirming === null && (
                  <div className="flex flex-wrap gap-2">
                    {row.attendance_status === "Active" && (
                      <PrimaryButton onClick={() => setConfirming("close")}>
                        <CheckCircle2 size={14} />
                        Close session
                      </PrimaryButton>
                    )}
                    {row.attendance_status !== "Missed" && (
                      <GhostButton onClick={() => setConfirming("miss")} className="text-rose-700 hover:bg-rose-50 border-rose-200">
                        <XCircle size={14} />
                        Mark missed
                      </GhostButton>
                    )}
                    {row.attendance_status === "Missed" && (
                      <GhostButton
                        onClick={() => {
                          overrideMut.mutate(
                            { id: row.id, patch: { attendance_status: "Completed" } },
                            {
                              onSuccess: () => onToast("success", "Session marked completed."),
                              onError: (err) => onToast("error", err instanceof Error ? err.message : "Failed to update."),
                            },
                          );
                        }}
                        disabled={overrideMut.isPending}
                      >
                        <CheckCircle2 size={14} />
                        Mark completed
                      </GhostButton>
                    )}
                  </div>
                )}

                {confirming === "close" && (
                  <ConfirmRow
                    message="End this active session right now? End time will be set to the current time."
                    confirmLabel="Close session"
                    onConfirm={() => {
                      closeMut.mutate(row.id, {
                        onSuccess: () => { setConfirming(null); onToast("success", "Session closed."); },
                        onError: (err) => { setConfirming(null); onToast("error", err instanceof Error ? err.message : "Failed."); },
                      });
                    }}
                    onCancel={() => setConfirming(null)}
                    pending={closeMut.isPending}
                  />
                )}

                {confirming === "miss" && (
                  <ConfirmRow
                    tone="rose"
                    message="Mark this session as missed? The teacher will see this on their app."
                    confirmLabel="Mark missed"
                    onConfirm={() => {
                      overrideMut.mutate(
                        { id: row.id, patch: { attendance_status: "Missed" } },
                        {
                          onSuccess: () => { setConfirming(null); onToast("success", "Session marked missed."); },
                          onError: (err) => { setConfirming(null); onToast("error", err instanceof Error ? err.message : "Failed."); },
                        },
                      );
                    }}
                    onCancel={() => setConfirming(null)}
                    pending={overrideMut.isPending}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "rose" | "blue";
}) {
  const palette =
    tone === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-800"
    : tone === "rose" ? "bg-rose-50 border-rose-100 text-rose-800"
    : tone === "blue" ? "bg-[#0B3C5D]/5 border-[#0B3C5D]/10 text-[#0B3C5D]"
    : "bg-slate-50 border-slate-100 text-slate-700";
  return (
    <div className={`rounded-xl p-3 border ${palette}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center gap-1">
        {icon}{label}
      </p>
      <p className="text-sm font-bold mt-1 truncate">{value}</p>
    </div>
  );
}

function ConfirmRow({
  message, confirmLabel, onConfirm, onCancel, pending, tone,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  tone?: "rose";
}) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="text-sm font-semibold text-slate-700 flex-1">{message}</p>
      <div className="flex items-center gap-2 justify-end">
        <GhostButton onClick={onCancel} disabled={pending}>Cancel</GhostButton>
        <button
          onClick={onConfirm}
          disabled={pending}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] ${
            tone === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0B3C5D] hover:bg-[#0B3C5D]/90"
          }`}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
