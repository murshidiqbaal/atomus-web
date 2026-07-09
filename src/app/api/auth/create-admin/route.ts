import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/utils/phone_utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  phone_number: string;
  password: string;
  full_name: string;
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

  const { phone_number, password, full_name } = body;
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

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone_number: phone, role: "admin" },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const match = (list?.users ?? []).find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (match?.id) {
        // Ensure the role metadata is set even if the user pre-existed.
        await admin.auth.admin.updateUserById(match.id, {
          user_metadata: { ...match.user_metadata, full_name, phone_number: phone, role: "admin" },
        });
        return NextResponse.json({ user_id: match.id, existed: true, role: "admin" });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user_id: created?.user?.id, existed: false, role: "admin" });
}
