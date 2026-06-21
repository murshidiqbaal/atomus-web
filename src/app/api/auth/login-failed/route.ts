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
      // Log failed login attempt for unknown user
      await logActivity({
        userId: null,
        userName: "Unknown User",
        module: "Staff Access",
        action: "Failed Login Attempt",
        description: `Failed login attempt for unknown account: ${usernameOrEmail}`
      });
      return NextResponse.json({ success: true });
    }

    const { user, user_type } = account;
    const table = user_type === "admin" ? "admins" : "staff_accounts";
    const supabase = getAdminClient();

    const currentAttempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil: string | null = null;
    let message = "";

    if (currentAttempts >= 5) {
      const lockDate = new Date(Date.now() + 15 * 60000); // 15 minutes from now
      lockedUntil = lockDate.toISOString();
      message = "Account locked for 15 minutes due to 5 failed login attempts.";
    }

    await supabase
      .from(table)
      .update({
        failed_login_attempts: currentAttempts,
        locked_until: lockedUntil
      })
      .eq("id", user.id);

    await logActivity({
      userId: user.id,
      userName: user.full_name,
      module: "Staff Access",
      action: "Failed Login Attempt",
      description: `Failed login attempt. Total consecutive failures: ${currentAttempts}. ${lockedUntil ? "Account Locked." : ""}`
    });

    return NextResponse.json({ success: true, attempts: currentAttempts, message });
  } catch (err: any) {
    console.error("Error in login-failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
