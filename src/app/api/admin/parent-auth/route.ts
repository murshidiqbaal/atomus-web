import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
}

export async function POST(request: Request) {
  try {
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

    // ── Fallback path (no SUPABASE_SERVICE_ROLE_KEY) ───────────────
    // Supabase's anon signUp deliberately obfuscates results to prevent email
    // enumeration: if the email already exists in auth.users it returns success
    // but with data.user = null. We handle three cases:
    //   (a) genuine new user  → data.user.id present, return it
    //   (b) explicit error    → surface message
    //   (c) silent existing   → no error but no user.id → try password sign-in
    //                          to recover the id, otherwise return clear error.
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        const recovered = await tryRecoverUserId(client, email, password);
        if (recovered) return NextResponse.json({ user_id: recovered, existed: true });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data?.user?.id) {
      return NextResponse.json({ user_id: data.user.id, existed: false });
    }

    // Silent-existing case — try recovery via password sign-in.
    const recovered = await tryRecoverUserId(client, email, password);
    if (recovered) return NextResponse.json({ user_id: recovered, existed: true });

    return NextResponse.json({
      error:
        "An account with this email already exists in Supabase Auth but its password is unknown. " +
        "Set SUPABASE_SERVICE_ROLE_KEY in .env.local so the admin API can create users directly, " +
        "or delete the orphaned auth.users row from the Supabase dashboard.",
    }, { status: 409 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

async function tryRecoverUserId(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<string | null> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return null;
  return data?.user?.id ?? null;
}
