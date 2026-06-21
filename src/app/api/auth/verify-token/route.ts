import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ valid: false, error: "Reset token is required." }, { status: 400 });
    }

    // Hash the token to match stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const supabase = getAdminClient();

    const { data: tokenRecord, error } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("reset_token_hash", tokenHash)
      .maybeSingle();

    if (error || !tokenRecord) {
      return NextResponse.json({ valid: false, error: "Invalid password reset token." }, { status: 400 });
    }

    if (tokenRecord.is_used) {
      return NextResponse.json({
        valid: false,
        error: "This reset link has already been used. Please request a new link."
      }, { status: 400 });
    }

    const expiryTime = new Date(tokenRecord.expires_at).getTime();
    if (expiryTime < Date.now()) {
      return NextResponse.json({
        valid: false,
        error: "This reset link has expired (links are only valid for 30 minutes). Please request a new link."
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      email: tokenRecord.email
    });
  } catch (err: any) {
    console.error("Error in verify-token:", err);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
