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
      // Return success but with flag so we don't leak account existence to prevent enumeration
      return NextResponse.json({ success: true, email: usernameOrEmail });
    }

    const { user, user_type } = account;

    // Check if disabled
    if (user.status === "Disabled") {
      return NextResponse.json({ error: "This account has been disabled. Please contact the administrator." }, { status: 403 });
    }

    // Check lock status
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until).getTime();
      const now = Date.now();
      if (lockTime > now) {
        const minutesLeft = Math.ceil((lockTime - now) / 60000);
        return NextResponse.json({
          error: `Account is temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`
        }, { status: 423 });
      } else {
        // Lock expired, reset failed attempts
        const supabase = getAdminClient();
        const table = user_type === "admin" ? "admins" : "staff_accounts";
        await supabase
          .from(table)
          .update({ failed_login_attempts: 0, locked_until: null })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({ success: true, email: user.email });
  } catch (err: any) {
    console.error("Error in pre-login:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
