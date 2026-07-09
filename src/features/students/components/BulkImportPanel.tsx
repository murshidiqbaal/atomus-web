import React, { useState, useMemo, useEffect } from "react";
import {
  Upload, CheckCircle2, AlertCircle, RefreshCw, Download, Trash2, ArrowLeft, Play, FileText, Check, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizePhone, isValidPhone } from "@/lib/utils/phone_utils";

// CSV Template Header Line
const TEMPLATE_HEADERS = [
  "Campus", "Course", "Batch", "Student Name", "Admission No", "Roll No",
  "Gender", "DOB", "Student Phone", "Student Email", "Parent Name",
  "Parent Phone", "Parent Email", "Address", "Joining Date"
];

interface CampusMap { id: string; name: string }
interface CourseMap { id: string; name: string }
interface BatchMap { id: string; name: string; course_id: string; campus_id: string }

interface ValidationIssue {
  rowNum: number;
  studentName: string;
  admissionNo: string;
  reason: string;
}

interface ImportRow {
  student_name: string;
  admission_no: string;
  roll_no: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  student_phone: string;
  student_email: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  address: string;
  joining_date: string;
  // mapped IDs
  campus_id: string;
  course_id: string;
  batch_id: string;
}

interface ImportResult {
  success: boolean;
  admission_no: string;
  student_name: string;
  parent_name?: string;
  parent_phone?: string;
  username?: string;
  password?: string;
  error?: string;
  parent_created?: boolean;
  student_created?: boolean;
}

// Robust fuzzy matching helper for campus, course, and batch lookups
function findBestMetadataMatch<T extends { id: string; name: string }>(
  input: string,
  options: T[],
  type: "campus" | "course" | "batch"
): T | null {
  if (!input) return null;
  
  const cleanInput = input.trim().toLowerCase();
  
  // 1. First attempt: exact match (case insensitive, trimmed)
  const exactMatch = options.find(opt => opt.name.trim().toLowerCase() === cleanInput);
  if (exactMatch) return exactMatch;

  // 2. Second attempt: normalized exact match (alphanumeric only)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanInputNorm = norm(cleanInput);
  const normalizedMatch = options.find(opt => norm(opt.name) === cleanInputNorm);
  if (normalizedMatch) return normalizedMatch;

  // 3. Third attempt: ignore "campus"/"course"/"batch" suffixes
  const stripSuffix = (s: string) => s.replace(/(campus|course|batch)/g, "");
  const strippedInputNorm = norm(stripSuffix(cleanInput));
  
  // Try to match options with stripped suffix
  const strippedMatch = options.find(opt => norm(stripSuffix(opt.name)) === strippedInputNorm);
  if (strippedMatch) return strippedMatch;

  // 4. Fourth attempt: Check if one contains the other (substring matching)
  if (strippedInputNorm.length >= 3) {
    const substringMatch = options.find(opt => {
      const optNorm = norm(stripSuffix(opt.name));
      return optNorm.includes(strippedInputNorm) || strippedInputNorm.includes(optNorm);
    });
    if (substringMatch) return substringMatch;
  }

  // 5. Fifth attempt: Fuzzy match via Levenshtein distance (for typos like "arror" -> "aroor")
  let bestOption: T | null = null;
  let minDistance = Infinity;

  const getDistance = (a: string, b: string): number => {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
        }
      }
    }
    return dp[a.length][b.length];
  };

  for (const opt of options) {
    const optNorm = norm(stripSuffix(opt.name));
    const dist = getDistance(strippedInputNorm, optNorm);
    
    // Allow small distance relative to the option length (e.g. distance of 1 or 2 for length 5+)
    const maxAllowedDist = Math.max(1, Math.floor(optNorm.length * 0.3)); 
    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      bestOption = opt;
    }
  }

  return bestOption;
}

export default function BulkImportPanel({ onBack }: { onBack: () => void }) {
  // Navigation Steps: 1: Upload, 2: Preview, 3: Validate, 4: Import, 5: Summary
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  
  // Parsed records
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);

  // Cache/Lookup tables loaded from DB
  const [campuses, setCampuses] = useState<CampusMap[]>([]);
  const [courses, setCourses] = useState<CourseMap[]>([]);
  const [batches, setBatches] = useState<BatchMap[]>([]);
  
  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);
  const [validRows, setValidRows] = useState<ImportRow[]>([]);
  const [invalidRowsRaw, setInvalidRowsRaw] = useState<string[][]>([]);

  // Loading caches status
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Import state
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "completed">("idle");
  const [importProgress, setImportProgress] = useState({
    total: 0,
    current: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    parentsCreated: 0
  });

  // Successful import details for credentials report
  const [successReport, setSuccessReport] = useState<ImportResult[]>([]);
  // Database insertion failures
  const [failedReport, setFailedReport] = useState<ImportResult[]>([]);

  // Load campus, course, and batch metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        setLoadingMetadata(true);
        const [
          { data: campusesData },
          { data: coursesData },
          { data: batchesData }
        ] = await Promise.all([
          supabase.from("campuses").select("id, name").eq("is_active", true),
          supabase.from("courses").select("id, name").eq("is_active", true),
          supabase.from("batches").select("id, name, course_id, campus_id").eq("is_active", true)
        ]);

        setCampuses((campusesData || []) as CampusMap[]);
        setCourses((coursesData || []) as CourseMap[]);
        setBatches((batchesData || []) as BatchMap[]);
      } catch (err) {
        console.error("Failed to load metadata lookup cache:", err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  // RFC-4180 Compliant CSV parser
  function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // skip next escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        row.push(cell.trim());
        result.push(row);
        row = [];
        cell = "";
        if (char === "\r" && nextChar === "\n") {
          i++; // skip \n
        }
      } else {
        cell += char;
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      result.push(row);
    }
    // Filter empty lines
    return result.filter(r => r.length > 0 && r.some(c => c !== ""));
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);

      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setCsvHeaders(parsed[0]);
        setCsvRows(parsed.slice(1));
        setStep(2);
      }
    };
    reader.readAsText(file);
  };

  // Helper to resolve CSV value by alias matching
  const getRowVal = (row: string[], key: string, headerMap: Record<string, number>): string => {
    const aliases: Record<string, string[]> = {
      campus: ["campus", "campusname"],
      course: ["course", "coursename"],
      batch: ["batch", "batchname"],
      student_name: ["studentname", "name", "fullname"],
      admission_no: ["admissionno", "admissionnumber", "adminno"],
      roll_no: ["rollno", "rollnumber"],
      gender: ["gender"],
      dob: ["dob", "dateofbirth"],
      student_phone: ["studentphone", "studentphonenumber"],
      student_email: ["studentemail", "email"],
      parent_name: ["parentname", "parentfullname", "fathername", "mothername"],
      parent_phone: ["parentphone", "parentphonenumber"],
      parent_email: ["parentemail", "parentemailaddress"],
      address: ["address"],
      joining_date: ["joiningdate", "dateofjoining", "joining"]
    };

    const keys = aliases[key] || [key];
    for (const k of keys) {
      const idx = headerMap[k];
      if (idx !== undefined && row[idx] !== undefined) {
        return row[idx].trim();
      }
    }
    return "";
  };

  // Validate the previewed CSV rows locally
  const validateData = async () => {
    setIsValidating(true);
    setValidationErrors([]);
    
    try {
      // 1. Build lookup header map
      const headerMap: Record<string, number> = {};
      csvHeaders.forEach((h, i) => {
        const norm = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        headerMap[norm] = i;
      });

      // 2. Fetch all student & parent constraints from Supabase
      const [
        { data: dbStudents },
        { data: dbParents }
      ] = await Promise.all([
        supabase.from("students").select("admission_number, phone_number"),
        supabase.from("parents").select("phone_number")
      ]);

      const existingAdmissions = new Set(
        (dbStudents || []).map(s => s.admission_number ? String(s.admission_number).trim().toLowerCase() : "").filter(Boolean)
      );

      // Unique sets to check CSV internal duplicate constraints
      const csvAdmissions = new Set<string>();

      const errors: ValidationIssue[] = [];
      const valid: ImportRow[] = [];
      const invalidRows: string[][] = [];

      csvRows.forEach((row, index) => {
        const rowNum = index + 2; // header is row 1
        const sName = getRowVal(row, "student_name", headerMap);
        const admissionNo = getRowVal(row, "admission_no", headerMap);
        const rollNo = getRowVal(row, "roll_no", headerMap);
        const campusName = getRowVal(row, "campus", headerMap);
        const courseName = getRowVal(row, "course", headerMap);
        const batchName = getRowVal(row, "batch", headerMap);
        const parentName = getRowVal(row, "parent_name", headerMap);
        const parentPhone = getRowVal(row, "parent_phone", headerMap);
        const parentEmail = getRowVal(row, "parent_email", headerMap);
        const genderVal = getRowVal(row, "gender", headerMap);
        const dob = getRowVal(row, "dob", headerMap);
        const sPhone = getRowVal(row, "student_phone", headerMap);
        const sEmail = getRowVal(row, "student_email", headerMap);
        const address = getRowVal(row, "address", headerMap);
        const joiningDate = getRowVal(row, "joining_date", headerMap);

        let rowHasError = false;

        const addError = (reason: string) => {
          errors.push({ rowNum, studentName: sName || "Unnamed", admissionNo: admissionNo || "N/A", reason });
          rowHasError = true;
        };

        // A. Required fields check
        if (!campusName) addError("Campus name is required");
        if (!courseName) addError("Course name is required");
        if (!batchName) addError("Batch name is required");
        if (!sName) addError("Student name is required");
        if (!admissionNo) addError("Admission number is required");
        if (!parentName) addError("Parent name is required");
        if (!parentPhone) addError("Parent phone is required");

        // B. Database & local exists mapping checks using robust fuzzy lookup
        const matchedCampus = findBestMetadataMatch(campusName, campuses, "campus");
        const campusId = matchedCampus ? matchedCampus.id : "";

        const matchedCourse = findBestMetadataMatch(courseName, courses, "course");
        const courseId = matchedCourse ? matchedCourse.id : "";

        let batchId = "";

        if (campusName && !campusId) {
          addError(`Campus '${campusName}' does not exist or is inactive`);
        }
        if (courseName && !courseId) {
          addError(`Course '${courseName}' does not exist or is inactive`);
        }

        if (campusId && courseId && batchName) {
          const allowedBatches = batches.filter(
            b => b.campus_id === campusId && b.course_id === courseId
          );
          const matchedBatch = findBestMetadataMatch(batchName, allowedBatches, "batch");
          batchId = matchedBatch ? matchedBatch.id : "";
          if (!batchId) {
            addError(`Batch '${batchName}' does not exist for the specified Campus and Course`);
          }
        }

        // C. Duplicate checks (CSV + Database)
        if (admissionNo) {
          const normAdmission = admissionNo.trim().toLowerCase();
          if (csvAdmissions.has(normAdmission)) {
            addError(`Duplicate Admission Number '${admissionNo}' within the CSV`);
          } else {
            csvAdmissions.add(normAdmission);
          }
          if (existingAdmissions.has(normAdmission)) {
            addError(`Admission Number '${admissionNo}' already exists in the database`);
          }
        }


        // D. Format checks
        if (parentPhone && !isValidPhone(parentPhone)) {
          addError(`Invalid Parent Phone number: '${parentPhone}' (requires 8-15 digits)`);
        }
        if (sPhone && !isValidPhone(sPhone)) {
          addError(`Invalid Student Phone number: '${sPhone}' (requires 8-15 digits)`);
        }
        if (sEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
          addError(`Invalid Student Email format: '${sEmail}'`);
        }
        if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
          addError(`Invalid Parent Email format: '${parentEmail}'`);
        }

        // E. Gender validation
        let gender: "Male" | "Female" | "Other" = "Male";
        if (genderVal) {
          const normGender = genderVal.trim().toLowerCase();
          if (normGender === "male" || normGender === "m") gender = "Male";
          else if (normGender === "female" || normGender === "f") gender = "Female";
          else if (normGender === "other" || normGender === "o") gender = "Other";
          else {
            addError(`Invalid Gender: '${genderVal}' (expected Male, Female, or Other)`);
          }
        }

        if (!rowHasError && campusId && courseId && batchId) {
          valid.push({
            student_name: sName,
            admission_no: admissionNo,
            roll_no: rollNo,
            gender,
            dob,
            student_phone: sPhone,
            student_email: sEmail,
            parent_name: parentName,
            parent_phone: parentPhone,
            parent_email: parentEmail,
            address,
            joining_date: joiningDate,
            campus_id: campusId,
            course_id: courseId,
            batch_id: batchId
          });
        } else {
          invalidRows.push(row);
        }
      });

      setValidationErrors(errors);
      setValidRows(valid);
      setInvalidRowsRaw(invalidRows);
      setStep(3);
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  // Import the validated rows in chunks of 50
  const startImport = async () => {
    if (validRows.length === 0) return;

    setImportStatus("importing");
    setImportProgress({
      total: validRows.length,
      current: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      parentsCreated: 0
    });

    const chunkSize = 50;
    const records = [...validRows];
    const successes: ImportResult[] = [];
    const failures: ImportResult[] = [];
    let localParentsCreated = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      try {
        const res = await fetch("/api/students/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Chunk upload failed");
        }

        const chunkResults: ImportResult[] = data.results || [];
        chunkResults.forEach((r) => {
          if (r.success) {
            successes.push(r);
            if (r.parent_created) {
              localParentsCreated++;
            }
          } else {
            failures.push(r);
          }
        });

        const completedCount = Math.min(i + chunkSize, records.length);
        setImportProgress((prev) => ({
          ...prev,
          current: completedCount,
          success: successes.length,
          failed: failures.length,
          parentsCreated: localParentsCreated
        }));

      } catch (err: any) {
        console.error("Chunk import error:", err);
        // Mark the entire chunk as failed
        chunk.forEach((row) => {
          failures.push({
            success: false,
            admission_no: row.admission_no,
            student_name: row.student_name,
            error: err.message || "Network error occurred during chunk transfer"
          });
        });

        const completedCount = Math.min(i + chunkSize, records.length);
        setImportProgress((prev) => ({
          ...prev,
          current: completedCount,
          failed: failures.length
        }));
      }
    }

    setSuccessReport(successes);
    setFailedReport(failures);
    setImportStatus("completed");
    setStep(5);
  };

  // Helper to initiate client-side file downloads (CSV template / reports)
  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    // Generate dummy row for reference
    const dummyRow = [
      "Karachi Campus", "Pre-Engineering HSS", "Batch A", "Ahmad Khan", "ADM-2026-001", "Roll-04",
      "Male", "2008-05-12", "+923001234567", "ahmad.student@email.com", "Farhan Khan",
      "+923007654321", "farhan.parent@email.com", "House 123, Block 4, Karachi", "2026-06-01"
    ];
    downloadCSV(TEMPLATE_HEADERS, [dummyRow], "student_import_template.csv");
  };

  const downloadFailedRows = () => {
    if (invalidRowsRaw.length === 0) return;
    downloadCSV(csvHeaders, invalidRowsRaw, "invalid_import_rows.csv");
  };

  const downloadDatabaseFailedReport = () => {
    const headers = ["Student Name", "Admission No", "Error Message"];
    const rows = failedReport.map(f => [f.student_name, f.admission_no, f.error || "N/A"]);
    downloadCSV(headers, rows, "database_insertion_failures.csv");
  };

  const downloadCredentialsReport = () => {
    const headers = ["Student Name", "Admission No", "Parent Name", "Parent Phone", "Username", "Password"];
    const rows = successReport.map(s => [
      s.student_name || "",
      s.admission_no || "",
      s.parent_name || "",
      s.parent_phone || "",
      s.username || "",
      s.password || ""
    ]);
    downloadCSV(headers, rows, "parent_credentials_report.csv");
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Sub-Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Bulk Student Import
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Upload spreadsheets to provision parents and enroll students in chunks
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 border border-slate-200 hover:border-[#0B3C5D]/30 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm"
        >
          <Download size={14} />
          Download CSV Template
        </button>
      </div>

      {/* Steps Indicator Progress Bar */}
      <div className="grid grid-cols-5 gap-2 bg-slate-50 border border-slate-200/50 p-2 rounded-2xl">
        {[
          { label: "Upload File", stepNum: 1 },
          { label: "Preview Raw", stepNum: 2 },
          { label: "Validation", stepNum: 3 },
          { label: "Importing Data", stepNum: 4 },
          { label: "Summary", stepNum: 5 }
        ].map((s) => (
          <div
            key={s.stepNum}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
              step === s.stepNum
                ? "bg-[#0B3C5D] text-white shadow-md shadow-[#0B3C5D]/20 scale-102"
                : step > s.stepNum
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "text-slate-400"
            }`}
          >
            {step > s.stepNum ? <Check size={14} /> : <span>{s.stepNum}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload File Layout */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-6">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 rounded-[2rem] bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 flex items-center justify-center mx-auto text-[#0B3C5D] shadow-sm">
              <Upload size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">Choose CSV Spreadsheet</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-semibold">
                Upload your completed Excel or CSV template file. Make sure all branch, course, and batch names match existing records.
              </p>
            </div>

            {loadingMetadata ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 py-4">
                <RefreshCw size={14} className="animate-spin" />
                Caching metadata lookup tables...
              </div>
            ) : (
              <label className="block cursor-pointer bg-[#0B3C5D] text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-98">
                Select CSV Spreadsheet File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preview Layout */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800">CSV Records Preview</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                Visualizing {Math.min(csvRows.length, 5)} of {csvRows.length} total rows from '{fileName}'
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setRawText("");
                  setFileName("");
                  setCsvRows([]);
                }}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all"
              >
                Choose Different File
              </button>
              
              <button
                onClick={validateData}
                disabled={isValidating}
                className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-[#0B3C5D]/90 transition-all shadow-md disabled:opacity-50"
              >
                {isValidating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Validate CSV Columns & Duplicate Constraints
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Row</th>
                  {csvHeaders.slice(0, 10).map((h, i) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  {csvHeaders.length > 10 && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">...</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {csvRows.slice(0, 5).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-xs font-black text-slate-400">{rIdx + 2}</td>
                    {row.slice(0, 10).map((cell, cIdx) => (
                      <td key={cIdx} className="px-6 py-4 text-xs font-semibold text-slate-700 max-w-xs truncate">
                        {cell}
                      </td>
                    ))}
                    {row.length > 10 && <td className="px-6 py-4 text-xs text-slate-400">+{row.length - 10} columns</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Local Validation Report */}
      {step === 3 && (
        <div className="space-y-6">
          {validationErrors.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-emerald-800 text-base">Validation Passed Successfully!</h4>
                <p className="text-sm text-emerald-600/80 leading-relaxed font-semibold">
                  All {validRows.length} records verified successfully. No missing dependencies, duplicate admission codes, or format errors detected. You can proceed directly to import.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-black text-amber-800 text-base">Validation Found Formatting Errors</h4>
                <p className="text-sm text-amber-600/90 leading-relaxed font-semibold">
                  We identified {validationErrors.length} issues in the spreadsheet. Valid records ({validRows.length} rows) can still be imported, while the failed rows ({invalidRowsRaw.length} rows) should be downloaded and corrected.
                </p>
                <button
                  onClick={downloadFailedRows}
                  className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-700 transition-all shadow-sm mt-2"
                >
                  <Download size={12} />
                  Download Failed Rows CSV to Correct
                </button>
              </div>
            </div>
          )}

          {/* Validation Issues Table */}
          {validationErrors.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800">Errors List</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Row</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Admission No</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 text-xs font-black text-slate-500">{err.rowNum}</td>
                        <td className="px-6 py-3.5 text-xs font-bold text-slate-700">{err.studentName}</td>
                        <td className="px-6 py-3.5 text-xs font-bold text-[#0B3C5D]">{err.admissionNo}</td>
                        <td className="px-6 py-3.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                          <AlertCircle size={14} className="shrink-0" />
                          {err.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all"
            >
              Back to Preview
            </button>
            <button
              onClick={startImport}
              disabled={validRows.length === 0}
              className="flex items-center gap-2 bg-[#0B3C5D] text-white px-7 py-3 rounded-xl text-xs font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 disabled:opacity-50"
            >
              <Play size={14} />
              Import Valid Rows ({validRows.length})
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Chunked Import Status */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm text-center space-y-6">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 flex items-center justify-center mx-auto text-[#0B3C5D]">
              <RefreshCw size={24} className="animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">Importing Records...</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Chunked insertion & parent auth generation in progress
              </p>
            </div>

            {/* Premium Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Progress</span>
                <span>{importProgress.current} / {importProgress.total} Rows ({Math.round((importProgress.current / importProgress.total) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50 p-0.5">
                <div
                  className="bg-[#0B3C5D] h-full rounded-full transition-all duration-300 shadow-inner"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Success</p>
                <p className="text-xl font-black text-emerald-600">{importProgress.success}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Failed</p>
                <p className="text-xl font-black text-rose-600">{importProgress.failed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Parents Created</p>
                <p className="text-xl font-black text-[#D4AF37]">{importProgress.parentsCreated}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Final Report / Summary */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0B3C5D]/5 text-[#0B3C5D] flex items-center justify-center shrink-0 border border-[#0B3C5D]/10">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">Final Import Summary</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Database transaction chunking operation has completed
                </p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              {[
                { label: "Total Rows Uploaded", value: csvRows.length, color: "text-slate-800 bg-slate-50 border-slate-200" },
                { label: "Students Created", value: successReport.length, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
                { label: "Parents Created", value: importProgress.parentsCreated, color: "text-[#D4AF37] bg-amber-50/50 border-amber-100" },
                { label: "Failed Rows", value: failedReport.length + validationErrors.length, color: "text-rose-700 bg-rose-50 border-rose-100" }
              ].map((m, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${m.color} space-y-1 shadow-sm`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{m.label}</p>
                  <p className="text-3xl font-black tracking-tight">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Reports Download Panel */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-sm font-black text-slate-700">Downloads & Reports</h4>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadCredentialsReport}
                  disabled={successReport.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0B3C5D] text-white px-5 py-3.5 rounded-2xl text-xs font-black hover:bg-[#0B3C5D]/90 transition-all shadow-md disabled:opacity-50"
                >
                  <Download size={14} />
                  Download Parents Login Credentials (CSV)
                </button>

                {(failedReport.length > 0 || validationErrors.length > 0) && (
                  <button
                    onClick={() => {
                      if (failedReport.length > 0) {
                        downloadDatabaseFailedReport();
                      } else {
                        downloadFailedRows();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-5 py-3.5 rounded-2xl text-xs font-black transition-all"
                  >
                    <Download size={14} />
                    Download Error/Failure Log (CSV)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons to return */}
          <div className="flex justify-end">
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-xl text-xs font-black hover:bg-slate-700 transition-all shadow-md active:scale-95"
            >
              <CheckCircle2 size={14} />
              Return to Student Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
