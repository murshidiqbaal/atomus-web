import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/utils/phone_utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  phone_number: string;
  password: string;
  full_name: string;
  student_ids?: string[];
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

  const { phone_number, password, full_name, student_ids, account_status } = body;
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
    user_metadata: { full_name, phone_number: phone, role: "parent" },
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

  // Insert into parents profile table. parents.id = auth.users.id (per schema).
  // We do NOT persist the password — Supabase Auth owns credentials.
  const { error: upsertError } = await admin
    .from("parents")
    .upsert(
      {
        id: user_id,
        full_name,
        email,
        phone_number: phone,
        username: phone,
        password_hash: null,
        account_status: account_status ?? "Active",
      },
      { onConflict: "id" },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  if (student_ids && student_ids.length > 0) {
    const { error: linkErr } = await admin
      .from("students")
      .update({ parent_id: user_id })
      .in("id", student_ids);
    if (linkErr) {
      return NextResponse.json(
        { user_id, existed, warning: `Account created but student link failed: ${linkErr.message}` },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({ user_id, existed, phone: phone, role: "parent" });
}
