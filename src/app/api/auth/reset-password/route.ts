import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/utils/phone_utils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  phone_number?: string;
  user_id?: string;
  new_password: string;
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

  const { phone_number, user_id, new_password } = body;
  if (!new_password || new_password.length < 6) {
    return NextResponse.json(
      { error: "new_password is required (min 6 chars)" },
      { status: 400 },
    );
  }
  if (!phone_number && !user_id) {
    return NextResponse.json(
      { error: "Either phone_number or user_id is required" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let targetId = user_id ?? null;

  if (!targetId && phone_number) {
    if (!isValidPhone(phone_number)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    const email = phoneToEmail(normalizePhone(phone_number));
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    const match = (list?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!match?.id) {
      return NextResponse.json({ error: "No account found for that phone number" }, { status: 404 });
    }
    targetId = match.id;
  }

  const { error } = await admin.auth.admin.updateUserById(targetId!, {
    password: new_password,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ user_id: targetId, success: true });
}
