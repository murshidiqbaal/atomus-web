"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onRefreshList: () => void;
}

interface PreviewRow {
  rowNumber: number;
  originalData: any;
  normalizedData: {
    full_name: string;
    email: string;
    phone_number: string | null;
    subject_specialization: string | null;
    qualification: string | null;
    experience_years: number | null;
    gender: string | null;
    address: string | null;
    campus_id: string | null;
    assigned_courses: string[];
    assigned_batches: string[];
    assigned_subjects: string[];
    account_status: string;
    password?: string;
  };
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
}

export default function BulkImportModal({ onClose, onRefreshList }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid" | "duplicate">("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result metrics
  const [results, setResults] = useState<{
    importedCount: number;
    skippedCount: number;
    duplicateCount: number;
    importedRecords: any[];
    failedRecords: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg("Please upload only Excel (.xlsx, .xls) or CSV files.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  // Upload file for preview & validation
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/teachers/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process file");
      }

      setPreviewRows(data.previewRows);
      setStep("preview");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong while uploading");
    } finally {
      setUploading(false);
    }
  };

  // Finalize import to database
  const handleImport = async () => {
    setImporting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/teachers/bulk-import", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows: previewRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to finalize import");
      }

      // Calculate duplicates (invalid rows that contains duplicate in errors)
      const duplicateCount = previewRows.filter((r) => r.isDuplicate).length;

      setResults({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount - duplicateCount,
        duplicateCount,
        importedRecords: data.importedRecords,
        failedRecords: data.failedRecords,
      });

      setStep("result");
      onRefreshList();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save teacher records");
    } finally {
      setImporting(false);
    }
  };

  // CSV Generator Helper
  const downloadCSV = (filename: string, headers: string[], rows: any[]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : "";
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "full_name",
      "email",
      "phone_number",
      "subject_specialization",
      "qualification",
      "experience_years",
      "gender",
      "address",
      "campus",
      "courses",
      "batches",
      "subjects",
      "account_status",
      "password",
    ];
    const sampleRow = {
      full_name: "Rahul Sharma",
      email: "rahul.sharma@atomus.edu",
      phone_number: "+919876543210",
      subject_specialization: "Physics",
      qualification: "M.Sc Physics, B.Ed",
      experience_years: "6",
      gender: "Male",
      address: "12 Ring Road, West Campus",
      campus: "Main Campus",
      courses: "11 Science,12 Science",
      batches: "Batch Alpha,Batch Beta",
      subjects: "Physics",
      account_status: "Active",
      password: "",
    };
    downloadCSV("teacher_import_template.csv", headers, [sampleRow]);
  };

  const handleDownloadImported = () => {
    if (!results) return;
    const headers = [
      "full_name",
      "email",
      "phone_number",
      "subject_specialization",
      "qualification",
      "experience_years",
      "gender",
      "address",
      "campus",
      "courses",
      "batches",
      "subjects",
      "account_status",
      "password",
      "status",
    ];
    downloadCSV("imported_records.csv", headers, results.importedRecords);
  };

  const handleDownloadFailed = () => {
    if (!results) return;
    const headers = [
      "full_name",
      "email",
      "phone_number",
      "subject_specialization",
      "qualification",
      "experience_years",
      "gender",
      "address",
      "campus",
      "courses",
      "batches",
      "subjects",
      "account_status",
      "password",
      "import_error",
    ];
    downloadCSV("failed_records.csv", headers, results.failedRecords);
  };

  // Filter preview rows
  const filteredRows = previewRows.filter((r) => {
    if (filterTab === "valid") return r.isValid;
    if (filterTab === "invalid") return !r.isValid && !r.isDuplicate;
    if (filterTab === "duplicate") return r.isDuplicate;
    return true;
  });

  const validCount = previewRows.filter((r) => r.isValid).length;
  const duplicateCount = previewRows.filter((r) => r.isDuplicate).length;
  const invalidCount = previewRows.length - validCount - duplicateCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#0B3C5D]/10 p-2 rounded-xl text-[#0B3C5D]">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0B3C5D]">Bulk Import Teachers</h2>
              <p className="text-[11px] text-slate-400 font-medium">Upload Excel or CSV to import teacher accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="p-8 flex flex-col gap-6 items-center text-center">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-2xl border-2 border-dashed border-slate-200 hover:border-[#0B3C5D] rounded-3xl p-10 cursor-pointer bg-slate-50/50 hover:bg-[#0B3C5D]/5 transition-all flex flex-col items-center justify-center group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="w-14 h-14 bg-white shadow-md border border-slate-100 rounded-2xl flex items-center justify-center text-[#0B3C5D] mb-4 group-hover:scale-110 transition-transform">
                {file ? <FileSpreadsheet size={28} /> : <Upload size={28} />}
              </div>
              <h3 className="text-sm font-bold text-slate-700">
                {file ? file.name : "Drag & drop Excel or CSV file here"}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .xlsx, .xls, .csv up to 10MB"}
              </p>
              {!file && (
                <button
                  type="button"
                  className="mt-5 text-xs font-bold text-[#0B3C5D] bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Browse Files
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="w-full max-w-2xl p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-start gap-2.5 text-left">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="w-full max-w-2xl flex items-center justify-between border-t border-slate-100 pt-6">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Download size={14} />
                Download CSV Template
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!file || uploading}
                  onClick={handleUpload}
                  className="flex items-center gap-2 text-xs font-bold bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? "Analyzing File..." : "Validate Records"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Verify */}
        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Rows</span>
                <span className="text-xl font-black text-slate-700">{previewRows.length}</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Ready (Valid)</span>
                <span className="text-xl font-black text-emerald-700">{validCount}</span>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wide">Validation Errors</span>
                <span className="text-xl font-black text-rose-700">{invalidCount}</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wide">Duplicates</span>
                <span className="text-xl font-black text-amber-700">{duplicateCount}</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              {[
                { id: "all", label: "All Rows", count: previewRows.length, color: "text-slate-500 bg-slate-50" },
                { id: "valid", label: "Valid", count: validCount, color: "text-emerald-600 bg-emerald-50" },
                { id: "invalid", label: "Errors", count: invalidCount, color: "text-rose-600 bg-rose-50" },
                { id: "duplicate", label: "Duplicates", count: duplicateCount, color: "text-amber-600 bg-amber-50" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    filterTab === tab.id
                      ? "bg-[#0B3C5D] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    filterTab === tab.id ? "bg-white/20 text-white" : tab.color
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Preview Grid */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 pl-4">Row</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Campus</th>
                    <th className="p-3">Courses / Batches</th>
                    <th className="p-3">Validation Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No rows found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4 font-bold text-slate-400">{row.rowNumber}</td>
                        <td className="p-3">
                          {row.isValid ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg w-max">
                              <CheckCircle2 size={10} />
                              VALID
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg w-max">
                              <AlertTriangle size={10} />
                              DUPLICATE
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg w-max">
                              <XCircle size={10} />
                              ERROR
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-[#0B3C5D]">{row.normalizedData.full_name || "—"}</td>
                        <td className="p-3 font-medium text-slate-600">{row.normalizedData.email || "—"}</td>
                        <td className="p-3 text-slate-500 font-medium">{row.normalizedData.phone_number || "—"}</td>
                        <td className="p-3 text-slate-600 font-bold">
                          {row.originalData.campus || <span className="text-slate-400 font-normal">—</span>}
                        </td>
                        <td className="p-3 text-slate-500">
                          <div className="max-w-[150px] truncate" title={row.originalData.courses}>
                            {row.originalData.courses || "—"}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={row.originalData.batches}>
                            {row.originalData.batches || "—"}
                          </div>
                        </td>
                        <td className="p-3">
                          {row.errors.length > 0 ? (
                            <div className="text-rose-600 space-y-0.5 font-medium max-w-[250px]">
                              {row.errors.map((err, i) => (
                                <p key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                                  {err}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-500 font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-start gap-2.5">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={() => setStep("upload")}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Back to Upload
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={validCount === 0 || importing}
                  onClick={handleImport}
                  className="flex items-center gap-2 text-xs font-bold bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  {importing && <Loader2 size={14} className="animate-spin" />}
                  {importing ? "Importing Records..." : `Confirm Import (${validCount} valid)`}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Step 3: Result screen */}
        {step === "result" && results && (
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle2 size={32} />
            </div>
            
            <div>
              <h3 className="text-lg font-black text-slate-800">Teacher Bulk Import Complete</h3>
              <p className="text-sm text-slate-500 mt-1">Successfully inserted records into the database</p>
            </div>

            <div className="flex justify-center gap-12 border border-slate-100 bg-slate-50/50 p-6 rounded-2xl w-full max-w-lg">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Imported</span>
                <span className="text-2xl font-black text-emerald-600">{results.importedCount}</span>
              </div>
              <div className="border-r border-slate-200" />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Skipped (Errors)</span>
                <span className="text-2xl font-black text-rose-500">{results.skippedCount}</span>
              </div>
              <div className="border-r border-slate-200" />
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duplicates</span>
                <span className="text-2xl font-black text-amber-500">{results.duplicateCount}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg justify-center mt-2 border-t border-slate-100 pt-6">
              <button
                onClick={handleDownloadImported}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                <Download size={14} />
                Download Imported Log (.csv)
              </button>
              {results.skippedCount > 0 && (
                <button
                  onClick={handleDownloadFailed}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Download size={14} />
                  Download Failed Records (.csv)
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 text-xs font-bold bg-[#0B3C5D] text-white px-6 py-2.5 rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md"
            >
              Close Bulk Import
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
