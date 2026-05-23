import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { phoneToEmail, normalizePhone, isValidPhone } from "@/lib/utils/phone_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  phone_number: string;
  password: string;
  full_name: string;
  subject_specialization?: string;
  assigned_courses?: string[];
  assigned_batches?: string[];
  account_status?: "Active" | "Pending" | "Disabled";
}

export async function POST(request: Request) {
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY in .env.local" },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    phone_number,
    password,
    full_name,
    subject_specialization,
    assigned_courses,
    assigned_batches,
    account_status,
  } = body;

  if (!phone_number || !password || !full_name) {
    return NextResponse.json(
      { error: "phone_number, password and full_name are required" },
      { status: 400 },
    );
  }
  if (!isValidPhone(phone_number)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const phone = normalizePhone(phone_number);
  const email = phoneToEmail(phone);
  const admin = getAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone_number: phone, role: "teacher" },
  });

  let user_id = created?.user?.id ?? null;
  let existed = false;

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const match = (list?.users ?? []).find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (match?.id) {
        user_id = match.id;
        existed = true;
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
  }

  if (!user_id) {
    return NextResponse.json({ error: "Failed to obtain auth user id" }, { status: 500 });
  }

  // Upsert teacher row. teachers.id is its own UUID; auth_id links to auth.users.
  // If a teacher row for this auth_id already exists, update in place.
  const { data: existingTeacher } = await admin
    .from("teachers")
    .select("id")
    .eq("auth_id", user_id)
    .maybeSingle();

  const payload = {
    auth_id: user_id,
    full_name,
    email,
    phone_number: phone,
    subject_specialization: subject_specialization ?? null,
    assigned_courses: assigned_courses ?? [],
    assigned_batches: assigned_batches ?? [],
    account_status: account_status ?? "Active",
  };

  if (existingTeacher?.id) {
    const { error } = await admin.from("teachers").update(payload).eq("id", existingTeacher.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin.from("teachers").insert([payload]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user_id, existed, phone, role: "teacher" });
}
