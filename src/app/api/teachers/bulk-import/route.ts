import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// POST endpoint: Parses uploaded file, validates records, resolves UUIDs, and returns preview
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read sheet using XLSX (SheetJS natively handles XLSX, XLS, and CSV files!)
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    // Normalize keys of each row object to handle inconsistent cases or spaces in headers
    const rows = rawRows.map((rawRow, idx) => {
      const normalizedRow: any = {};
      Object.keys(rawRow).forEach((key) => {
        const normKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        normalizedRow[normKey] = String(rawRow[key]).trim();
      });
      return {
        rowNumber: idx + 2, // Row 1 is header, data starts at Row 2
        originalData: rawRow,
        normalizedData: normalizedRow,
      };
    });

    // 1. Fetch lookup tables once into memory to optimize performance
    const [campusesRes, coursesRes, batchesRes, subjectsRes, teachersRes] = await Promise.all([
      supabaseAdmin.from("campuses").select("id, name"),
      supabaseAdmin.from("courses").select("id, name"),
      supabaseAdmin.from("batches").select("id, name"),
      supabaseAdmin.from("subjects").select("id, name"),
      supabaseAdmin.from("teachers").select("email, phone_number"),
    ]);

    if (campusesRes.error) throw new Error(`Failed to load campuses: ${campusesRes.error.message}`);
    if (coursesRes.error) throw new Error(`Failed to load courses: ${coursesRes.error.message}`);
    if (batchesRes.error) throw new Error(`Failed to load batches: ${batchesRes.error.message}`);
    if (subjectsRes.error) throw new Error(`Failed to load subjects: ${subjectsRes.error.message}`);
    if (teachersRes.error) throw new Error(`Failed to load teachers: ${teachersRes.error.message}`);

    // Map names to UUIDs for case-insensitive lookup
    const campusMap = new Map<string, string>();
    (campusesRes.data || []).forEach((c) => campusMap.set(c.name.trim().toLowerCase(), c.id));

    const courseMap = new Map<string, string>();
    (coursesRes.data || []).forEach((c) => courseMap.set(c.name.trim().toLowerCase(), c.id));

    const batchMap = new Map<string, string>();
    (batchesRes.data || []).forEach((b) => batchMap.set(b.name.trim().toLowerCase(), b.id));

    const subjectMap = new Map<string, string>();
    (subjectsRes.data || []).forEach((s) => subjectMap.set(s.name.trim().toLowerCase(), s.id));

    // Load existing emails and phone numbers for duplicate check
    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();
    (teachersRes.data || []).forEach((t) => {
      if (t.email) existingEmails.add(t.email.trim().toLowerCase());
      if (t.phone_number) existingPhones.add(t.phone_number.trim().toLowerCase());
    });

    const previewRows: any[] = [];
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    for (const { rowNumber, originalData, normalizedData } of rows) {
      const errors: string[] = [];
      const fullName = normalizedData.full_name || normalizedData.name || "";
      const email = normalizedData.email || "";
      const phoneNumber = normalizedData.phone_number || normalizedData.phone || "";
      const expYearsStr = normalizedData.experience_years || normalizedData.experience || "";
      const gender = normalizedData.gender || "";
      const campusName = normalizedData.campus || "";
      const coursesStr = normalizedData.courses || "";
      const batchesStr = normalizedData.batches || "";
      const subjectsStr = normalizedData.subjects || "";
      const accStatus = normalizedData.account_status || "Active";
      const password = normalizedData.password || "";

      // 1. Required Fields Validation
      if (!fullName) errors.push("Full Name is required");
      if (!email) {
        errors.push("Email is required");
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push("Invalid email format");
        }
      }

      // 2. Duplicate Checks (Internal within the file)
      const normEmail = email.toLowerCase().trim();
      let isDuplicate = false;
      if (email) {
        if (seenEmails.has(normEmail)) {
          errors.push(`Duplicate email in uploaded file: ${email}`);
          isDuplicate = true;
        } else {
          seenEmails.add(normEmail);
        }
      }

      const normPhone = phoneNumber.toLowerCase().trim();
      if (phoneNumber) {
        if (seenPhones.has(normPhone)) {
          errors.push(`Duplicate phone number in uploaded file: ${phoneNumber}`);
          isDuplicate = true;
        } else {
          seenPhones.add(normPhone);
        }
      }

      // 3. Duplicate Checks (Against the existing database)
      if (email && existingEmails.has(normEmail)) {
        errors.push(`Email already exists in database: ${email}`);
        isDuplicate = true;
      }
      if (phoneNumber && existingPhones.has(normPhone)) {
        errors.push(`Phone number already exists in database: ${phoneNumber}`);
        isDuplicate = true;
      }

      // 4. Experience Years Numeric Validation
      let experienceYears: number | null = null;
      if (expYearsStr) {
        const parsedExp = Number(expYearsStr);
        if (isNaN(parsedExp)) {
          errors.push("Experience must be a numeric value");
        } else {
          experienceYears = parsedExp;
        }
      }

      // 5. Gender Enum Validation
      let resolvedGender: string | null = null;
      if (gender) {
        const normGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
        if (["Male", "Female", "Other"].includes(normGender)) {
          resolvedGender = normGender;
        } else {
          errors.push(`Invalid gender: ${gender} (must be Male, Female, or Other)`);
        }
      }

      // 6. Campus Resolution
      let campusId: string | null = null;
      if (campusName) {
        const resolved = campusMap.get(campusName.toLowerCase().trim());
        if (resolved) {
          campusId = resolved;
        } else {
          errors.push(`Campus not found: ${campusName}`);
        }
      }

      // Helper to parse comma separated names into array of UUIDs
      const parseCommaSeparated = (str: string, lookupMap: Map<string, string>, typeName: string) => {
        if (!str) return [];
        const items = str.split(",").map((item) => item.trim()).filter(Boolean);
        const uuids: string[] = [];
        for (const item of items) {
          const resolved = lookupMap.get(item.toLowerCase());
          if (resolved) {
            uuids.push(resolved);
          } else {
            errors.push(`${typeName} not found: ${item}`);
          }
        }
        return uuids;
      };

      // 7. Resolve courses, batches, and subjects
      const assignedCourses = parseCommaSeparated(coursesStr, courseMap, "Course");
      const assignedBatches = parseCommaSeparated(batchesStr, batchMap, "Batch");
      const assignedSubjects = parseCommaSeparated(subjectsStr, subjectMap, "Subject");

      // 8. Account Status Validation
      let resolvedStatus = "Active";
      if (accStatus) {
        const normStatus = accStatus.charAt(0).toUpperCase() + accStatus.slice(1).toLowerCase();
        if (["Active", "Pending", "Disabled"].includes(normStatus)) {
          resolvedStatus = normStatus;
        } else {
          errors.push(`Invalid status: ${accStatus} (must be Active, Pending, or Disabled)`);
        }
      }

      const isValid = errors.length === 0;

      previewRows.push({
        rowNumber,
        originalData,
        normalizedData: {
          full_name: fullName,
          email,
          phone_number: phoneNumber || null,
          subject_specialization: normalizedData.subject_specialization || null,
          qualification: normalizedData.qualification || null,
          experience_years: experienceYears,
          gender: resolvedGender,
          address: normalizedData.address || null,
          campus_id: campusId,
          assigned_courses: assignedCourses,
          assigned_batches: assignedBatches,
          assigned_subjects: assignedSubjects,
          account_status: resolvedStatus,
          password: password,
        },
        errors,
        isDuplicate,
        isValid,
      });
    }

    return NextResponse.json({
      success: true,
      previewRows,
    });
  } catch (error: any) {
    console.error("Bulk Import parse/validate error:", error);
    return NextResponse.json({ error: error.message || "Failed to process file" }, { status: 500 });
  }
}

// PUT endpoint: Finalizes insertion of valid records into Supabase and returns import logs
export async function PUT(request: Request) {
  try {
    const { rows }: { rows: any[] } = await request.json();
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    const importedRecords: any[] = [];
    const failedRecords: any[] = [];
    const payloadToInsert: any[] = [];

    for (const row of rows) {
      if (!row.isValid) {
        failedRecords.push({
          ...row.originalData,
          import_error: row.errors.join("; "),
        });
        continue;
      }

      const data = row.normalizedData;
      let cleartextPassword = data.password || "";
      if (!cleartextPassword) {
        cleartextPassword = generateTempPassword();
      }

      payloadToInsert.push({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        subject_specialization: data.subject_specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        gender: data.gender,
        address: data.address,
        campus_id: data.campus_id,
        assigned_courses: data.assigned_courses,
        assigned_batches: data.assigned_batches,
        assigned_subjects: data.assigned_subjects,
        account_status: data.account_status,
        password_hash: cleartextPassword, // Store plain password for admin reference (actual auth is in auth.users)
      });

      importedRecords.push({
        ...row.originalData,
        password: cleartextPassword, // Output the plain password for imported log (crucial for admin reference!)
        status: "Imported",
      });
    }

    let insertedCount = 0;
    if (payloadToInsert.length > 0) {
      const { data: insertResult, error: insertErr } = await supabaseAdmin
        .from("teachers")
        .insert(payloadToInsert)
        .select("id, email");

      if (insertErr) {
        console.error("Batch insertion failed:", insertErr);
        return NextResponse.json({ error: insertErr.message || "Database insertion failed" }, { status: 500 });
      }
      insertedCount = insertResult?.length || payloadToInsert.length;
    }

    return NextResponse.json({
      success: true,
      importedCount: insertedCount,
      skippedCount: failedRecords.length,
      importedRecords,
      failedRecords,
    });
  } catch (error: any) {
    console.error("Bulk Import execution error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute import" }, { status: 500 });
  }
}
