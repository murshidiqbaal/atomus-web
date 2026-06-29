import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { normalizePhone, phoneToEmail } from "@/lib/utils/phone_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StudentImportRow {
  student_name: string;
  admission_no: string;
  roll_no: string;
  gender: "Male" | "Female" | "Other";
  dob?: string;
  student_phone?: string;
  student_email?: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  address?: string;
  joining_date?: string;
  campus_id: string;
  course_id: string;
  batch_id: string;
}

function generateBulkParentPassword(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const first4 = digits.substring(0, 4);
  const last4 = digits.substring(digits.length - 4);
  return `${first4}${last4}`;
}

export async function POST(request: NextRequest) {
  // 1. Security check - Only admins can access
  const auth = await getServerAuth();
  if (!auth.authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY in environment" },
      { status: 500 }
    );
  }

  let body: { rows: StudentImportRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows } = body;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
  }

  const admin = getAdminClient();
  const results = [];

  for (const row of rows) {
    let parentId: string | null = null;
    let parentExisted = false;
    let generatedPassword = "";
    let parentEmail = row.parent_email?.trim() || "";

    const normalizedParentPhone = normalizePhone(row.parent_phone);
    if (!parentEmail) {
      parentEmail = phoneToEmail(normalizedParentPhone);
    }

    try {
      // 1. Check parent by phone number
      const { data: existingParent } = await admin
        .from("parents")
        .select("id, password_hash")
        .eq("phone_number", normalizedParentPhone)
        .maybeSingle();

      if (existingParent) {
        parentId = existingParent.id;
        parentExisted = true;
        generatedPassword = existingParent.password_hash || "";
      } else {
        // 2. Parent doesn't exist, create auth account
        generatedPassword = generateBulkParentPassword(normalizedParentPhone);

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email: parentEmail,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            full_name: row.parent_name,
            phone_number: normalizedParentPhone,
            role: "parent",
          },
        });

        if (authError) {
          const msg = authError.message.toLowerCase();
          // If auth user already exists, retrieve ID
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            const { data: list } = await admin.auth.admin.listUsers();
            const match = (list?.users ?? []).find(
              (u) => u.email?.toLowerCase() === parentEmail.toLowerCase()
            );
            if (match?.id) {
              parentId = match.id;
              parentExisted = true;
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          parentId = authData?.user?.id || null;
        }

        if (!parentId) {
          throw new Error("Failed to obtain parent Auth ID");
        }

        // 3. Insert parent profile
        const { error: parentInsertError } = await admin
          .from("parents")
          .insert({
            id: parentId,
            full_name: row.parent_name,
            email: parentEmail,
            phone_number: normalizedParentPhone,
            username: normalizedParentPhone,
            password_hash: generatedPassword,
            account_status: "Active",
          });

        if (parentInsertError) {
          // Rollback newly created Auth user
          await admin.auth.admin.deleteUser(parentId);
          throw parentInsertError;
        }
      }

      // 4. Insert student record
      const normalizedStudentPhone = row.student_phone ? normalizePhone(row.student_phone) : null;
      const { data: studentData, error: studentInsertError } = await admin
        .from("students")
        .insert({
          full_name: row.student_name,
          admission_number: row.admission_no,
          roll_number: row.roll_no,
          gender: row.gender,
          dob: row.dob || null,
          joining_date: row.joining_date || new Date().toISOString().split("T")[0],
          phone_number: normalizedStudentPhone,
          email: row.student_email || null,
          address: row.address || null,
          parent_id: parentId,
          campus_id: row.campus_id,
          course_id: row.course_id,
          batch_id: row.batch_id,
          academic_status: "Active",
          progress_status: "Average",
        })
        .select("id")
        .single();

      if (studentInsertError) {
        // Rollback newly created parent profile + Auth user if parent was new
        if (!parentExisted && parentId) {
          await admin.from("parents").delete().eq("id", parentId);
          await admin.auth.admin.deleteUser(parentId);
        }
        throw studentInsertError;
      }

      results.push({
        success: true,
        admission_no: row.admission_no,
        student_name: row.student_name,
        parent_name: row.parent_name,
        parent_phone: normalizedParentPhone,
        username: normalizedParentPhone,
        password: generatedPassword,
        parent_created: !parentExisted,
        student_created: true,
      });
    } catch (err: any) {
      results.push({
        success: false,
        admission_no: row.admission_no,
        student_name: row.student_name,
        error: err.message || "Unknown error occurred during row transaction",
      });
    }
  }

  return NextResponse.json({ results });
}
