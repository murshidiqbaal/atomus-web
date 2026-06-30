"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  MapPin,
  Loader2,
  CheckCircle2,
  Trash2,
  Building2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import { campusRepository } from "@/lib/repositories/campus_repository";
import { Campus } from "@/lib/types";
import DriveFileUpload from "@/components/shared/DriveFileUpload";
import { cleanupDriveFile } from "@/lib/utils/drive_upload";
import { SkeletonCard } from "@/components/shared/Skeleton";

/** Resolves the best display URL for a campus QR code. */
function resolveQrImageSrc(campus: Campus): string | null {
  const driveId = campus.paymentQrDriveId;
  // Valid Drive IDs are 10-60 alphanumeric chars with hyphens/underscores
  const isValidDriveId = driveId && /^[A-Za-z0-9_\-]{10,60}$/.test(driveId);
  if (isValidDriveId) {
    return `/api/media?id=${driveId}`;
  }
  // Fall back to the raw URL (could be a local /uploads/... path)
  return campus.paymentQrUrl ?? null;
}

/** Returns true when a campus has a QR code configured (Drive or local). */
function hasQrConfigured(campus: Campus): boolean {
  return !!resolveQrImageSrc(campus);
}

export default function PaymentQrPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedQr, setSelectedQr] = useState<string | null>(null); // Fullscreen view state

  const loadCampuses = async () => {
    try {
      setLoading(true);
      const data = await campusRepository.getCampuses();
      setCampuses(data);
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to load campuses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampuses();
  }, []);

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleQrChange = async (campus: Campus, url: string | null, fileId?: string | null) => {
    try {
      const oldDriveId = campus.paymentQrDriveId;

      // Update in Supabase
      const updated = await campusRepository.updateCampus(campus.id, {
        paymentQrUrl: url,
        paymentQrDriveId: fileId || null,
      });

      // Update local state
      setCampuses((prev) => prev.map((c) => (c.id === campus.id ? updated : c)));
      showFeedback("success", url ? `QR Code uploaded for ${campus.name}!` : `QR Code removed for ${campus.name}.`);

      // Clean up old file from Drive if we removed/replaced it
      if (oldDriveId && oldDriveId !== fileId) {
        cleanupDriveFile(oldDriveId);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update campus QR code.");
    }
  };

  const filteredCampuses = campuses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight flex items-center gap-3">
            <QrCode className="text-[#D4AF37]" size={32} />
            Payment QR Codes
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage UPI/Direct payment QR codes shown to parents in the mobile app.
          </p>
        </div>
        <button
          onClick={loadCampuses}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-all shadow-sm active:scale-95 shrink-0"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </header>

      {/* Stats & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search campuses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-4 focus:ring-[#0B3C5D]/5 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4 text-xs font-bold text-slate-500">
          <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            TOTAL CAMPUSES: {campuses.length}
          </span>
          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl">
            QR CONFIGURED: {campuses.filter((c) => hasQrConfigured(c)).length}
          </span>
        </div>
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-white transition-all duration-300 animate-slideUp ${
            feedback.type === "success" ? "bg-emerald-500" : "bg-rose-500"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{feedback.msg}</span>
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredCampuses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-semibold">No campuses found matching search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampuses.map((campus) => (
            <div
              key={campus.id}
              className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                campus.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
              }`}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-slate-50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-slate-800 text-base leading-tight tracking-tight truncate">
                    {campus.name}
                  </h3>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                      campus.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {campus.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {campus.location && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{campus.location}</span>
                  </div>
                )}
              </div>

              {/* QR Preview & Upload Section */}
              <div className="p-6 flex-1 flex flex-col justify-between bg-slate-50/40 gap-4">
                {hasQrConfigured(campus) ? (
                  <div className="space-y-4">
                    <div className="relative group aspect-square max-w-[200px] mx-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-inner overflow-hidden flex items-center justify-center">
                      <img
                        src={resolveQrImageSrc(campus)!}
                        alt={`${campus.name} QR`}
                        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setSelectedQr(resolveQrImageSrc(campus))}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={() => setSelectedQr(resolveQrImageSrc(campus))}
                          className="bg-white/95 text-slate-800 p-2 rounded-xl text-xs font-bold hover:bg-white flex items-center gap-1 transition-transform scale-90 group-hover:scale-100 duration-200 shadow-sm"
                        >
                          View Full
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {campus.paymentQrDriveId && /^[A-Za-z0-9_\-]{10,60}$/.test(campus.paymentQrDriveId) ? "Stored in Google Drive" : "Stored locally"}
                        </p>
                        <a
                          href={resolveQrImageSrc(campus)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 mt-0.5 truncate"
                        >
                          {campus.paymentQrDriveId && /^[A-Za-z0-9_\-]{10,60}$/.test(campus.paymentQrDriveId) ? "Google Drive Link" : "View File"}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <button
                        onClick={() => handleQrChange(campus, null, null)}
                        className="p-2 border border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 rounded-xl transition-all shadow-sm shrink-0"
                        title="Delete QR Code"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <DriveFileUpload
                      endpoint="/api/upload/payment-qr"
                      onChange={(url, fileId) => handleQrChange(campus, url, fileId)}
                      label="Payment QR Image"
                      accept="image/png, image/jpeg, image/webp"
                    />
                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      Please upload a high-resolution QR code image. Scans in the parents app will display this image to enable UPI/direct bank payments.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Overlay */}
      {selectedQr && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedQr(null)}
        >
          <div className="relative max-w-lg w-full bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/10 animate-scaleUp" onClick={e => e.stopPropagation()}>
            <h4 className="font-black text-slate-800 text-lg leading-none tracking-tight">
              Payment QR Preview
            </h4>
            <div className="w-full aspect-square border border-slate-100 rounded-2xl p-4 bg-white flex items-center justify-center shadow-inner">
              <img src={selectedQr} alt="Payment QR Full" className="w-full h-full object-contain" />
            </div>
            <button
              onClick={() => setSelectedQr(null)}
              className="w-full py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-all"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
