import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, full_name, phone_number } = body;
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = getAdminClient();
  const metadata = { full_name, phone_number, role: "parent" };

  if (hasServiceRole) {
    const admin = (client.auth as any).admin;
    const { data, error } = await admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      const listed: any = await admin.listUsers();
      const users: any[] = listed?.data?.users ?? [];
      const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match?.id) return NextResponse.json({ user_id: match.id, existed: true });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user_id: data?.user?.id, existed: false });
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ user_id: (data as any)?.user?.id ?? null, existed: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user_id: data?.user?.id, existed: false });
}
