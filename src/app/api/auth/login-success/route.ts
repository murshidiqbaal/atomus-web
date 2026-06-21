import { NextResponse } from "next/server";
import { lookupUser, logActivity } from "@/lib/auth/db_user_lookup";
import { getAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { usernameOrEmail } = await request.json();
    if (!usernameOrEmail) {
      return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
    }

    const account = await lookupUser(usernameOrEmail);
    if (!account) {
      return NextResponse.json({ success: true, must_change_password: false });
    }

    const { user, user_type } = account;
    const table = user_type === "admin" ? "admins" : "staff_accounts";
    const supabase = getAdminClient();

    // Reset attempts and update last_login
    await supabase
      .from(table)
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq("id", user.id);

    await logActivity({
      userId: user.id,
      userName: user.full_name,
      module: "Staff Access",
      action: "Successful Login",
      description: "User logged in successfully. Failed login attempts counter reset."
    });

    return NextResponse.json({
      success: true,
      must_change_password: user.must_change_password || false
    });
  } catch (err: any) {
    console.error("Error in login-success:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
