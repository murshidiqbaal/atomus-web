"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, FileText, CheckCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { uploadToDrive, DriveUploadEndpoint } from "@/lib/utils/drive_upload";

interface DriveFileUploadProps {
  endpoint: DriveUploadEndpoint;
  value?: string | null; // Currently uploaded file URL
  onChange: (url: string | null, fileId?: string | null) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

export default function DriveFileUpload({
  endpoint,
  value,
  onChange,
  accept = "image/*",
  maxSizeMB = 5,
  label = "Upload File",
}: DriveFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0); // Mocked progress animation
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine file extension/type from URL
  const isPdf = value?.toLowerCase().includes(".pdf") || value?.toLowerCase().includes("id="); // PDF handles certificates

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processAndUploadFile(e.target.files[0]);
    }
  };

  const processAndUploadFile = async (file: File) => {
    setError(null);
    setSuccess(false);

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Max size is ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    // Mock progressive progress updates since standard fetch/xhr requires complex setup
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const result = await uploadToDrive(file, endpoint);
      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      onChange(result.imageUrl, result.fileId);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err?.message ?? "Failed to upload file to Google Drive.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null, null);
    setSuccess(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>

      {value ? (
        // File Preview Container
        <div className="relative border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4 group transition-all duration-300 hover:border-slate-300">
          <div className="flex items-center gap-3 overflow-hidden">
            {isPdf ? (
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <FileText size={24} />
              </div>
            ) : (
              <img
                src={value}
                alt="Upload Preview"
                className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0 bg-white"
                onError={(e) => {
                  // Fallback to file icon if image cannot be rendered directly
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = document.getElementById("img-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            )}
            <div id="img-fallback" className="hidden w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 items-center justify-center text-indigo-500 shrink-0">
              <FileText size={24} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate">File ready in Google Drive</p>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline truncate block"
              >
                View Public Link
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all duration-200"
            title="Remove File"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        // Dropzone Area
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 min-h-[140px] ${
            dragActive
              ? "border-indigo-500 bg-indigo-50/20"
              : uploading
              ? "border-slate-200 bg-slate-50/30 cursor-not-allowed"
              : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            // Uploading State
            <div className="flex flex-col items-center gap-3 w-full max-w-[240px]">
              <div className="relative flex items-center justify-center">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
              </div>
              <div className="w-full text-center">
                <p className="text-xs font-bold text-slate-700">Uploading to Google Drive...</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Default Upload State
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all duration-200">
                <UploadCloud size={20} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700">
                  <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports JPG, PNG, WEBP, PDF up to {maxSizeMB}MB
                </p>
              </div>
            </>
          )}

          {/* Feedback States */}
          {error && (
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-rose-700 animate-fadeIn shrink-0">
              <AlertCircle size={14} className="shrink-0" />
              <p className="text-[10px] font-semibold flex-1 truncate">{error}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                }}
                className="text-rose-400 hover:text-rose-600 shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
