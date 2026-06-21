import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { logActivity } from "@/lib/auth/db_user_lookup";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // 1. Hash the token to lookup stored token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const supabase = getAdminClient();

    const { data: tokenRecord, error: tokenErr } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("reset_token_hash", tokenHash)
      .maybeSingle();

    if (tokenErr || !tokenRecord) {
      return NextResponse.json({ error: "Invalid password reset token." }, { status: 400 });
    }

    if (tokenRecord.is_used) {
      return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 });
    }

    const expiryTime = new Date(tokenRecord.expires_at).getTime();
    if (expiryTime < Date.now()) {
      return NextResponse.json({ error: "This reset link has expired." }, { status: 400 });
    }

    // 2. Lookup the user details in their respective table
    const table = tokenRecord.user_type === "admin" ? "admins" : "staff_accounts";
    const { data: userRecord, error: userErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", tokenRecord.user_id)
      .maybeSingle();

    if (userErr || !userRecord) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // 3. Hash the new password using bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Update password_hash, reset must_change_password, and clear failed attempts
    const { error: updateErr } = await supabase
      .from(table)
      .update({
        password_hash: passwordHash,
        must_change_password: false,
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq("id", userRecord.id);

    if (updateErr) {
      throw updateErr;
    }

    // 5. Sync the new password to Supabase Auth
    let authUserId = userRecord.auth_id;
    if (!authUserId) {
      // Find by email in Supabase Auth if auth_id was missing
      const { data: list } = await supabase.auth.admin.listUsers();
      const match = (list?.users ?? []).find(u => u.email?.toLowerCase() === tokenRecord.email.toLowerCase());
      if (match) {
        authUserId = match.id;
        // Update auth_id in the db table for future reference
        await supabase.from(table).update({ auth_id: authUserId }).eq("id", userRecord.id);
      }
    }

    if (authUserId) {
      const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password: password
      });
      if (authUpdateErr) {
        console.warn("Failed to sync password to Supabase Auth:", authUpdateErr.message);
      }
    } else {
      console.warn("No Supabase Auth user found to sync password for email:", tokenRecord.email);
    }

    // 6. Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq("id", tokenRecord.id);

    // 7. Log activity
    await logActivity({
      userId: userRecord.id,
      userName: userRecord.full_name,
      module: "Staff Access",
      action: "Password Reset Completed",
      description: "Password reset completed successfully using secure link."
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    console.error("Error in reset-password-token:", err);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
