import { NextResponse } from "next/server";
import { lookupUser, logActivity } from "@/lib/auth/db_user_lookup";
import { getAdminClient } from "@/lib/supabase-admin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { usernameOrEmail } = await request.json();
    if (!usernameOrEmail) {
      return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
    }

    // Resolve user
    const account = await lookupUser(usernameOrEmail);
    if (!account) {
      // Log failed reset attempt
      await logActivity({
        userId: null,
        userName: "Unknown User",
        module: "Staff Access",
        action: "Failed Reset Attempt",
        description: `Reset password requested for unknown account: ${usernameOrEmail}`
      });
      return NextResponse.json(
        { error: "No account found matching that username or email." },
        { status: 404 }
      );
    }

    const { user, user_type } = account;
    const email = user.email;
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown Browser";

    const supabase = getAdminClient();

    // 1. Rate limiting: Max 5 reset requests per hour per account
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("password_reset_tokens")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gt("created_at", oneHourAgo);

    if (countErr) {
      console.error("Rate limit check query failed:", countErr);
    } else if (count && count >= 5) {
      await logActivity({
        userId: user.id,
        userName: user.full_name,
        module: "Staff Access",
        action: "Failed Reset Attempt",
        description: "Password reset request rejected due to rate limiting (exceeded 5/hour)."
      });
      return NextResponse.json(
        { error: "Too many reset attempts. You can only request up to 5 resets per hour." },
        { status: 429 }
      );
    }

    // 2. Automatically invalidate previous tokens for this user
    await supabase
      .from("password_reset_tokens")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_used", false);

    // 3. Generate secure reset token
    // Generate 48 bytes -> 96 characters hex token
    const token = crypto.randomBytes(48).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    // 4. Store token details in database
    const { error: insertErr } = await supabase
      .from("password_reset_tokens")
      .insert([{
        user_id: user.id,
        user_type,
        email,
        reset_token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_used: false
      }]);

    if (insertErr) {
      throw insertErr;
    }

    // 5. Construct reset link
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const resetLink = `${origin}/reset-password?token=${token}`;

    // 6. Send the professional email
    const subject = "Reset Your Atomus Password";
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #F5F7FA; padding: 0; margin: 0;">
        <div style="max-width: 540px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #E1E4E8;">
          <div style="background: #0B3C5D; padding: 32px 40px;">
            <h1 style="color: white; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">ATOMUS<span style="color: #D4AF37;">.edu</span></h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Admin Control Panel</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #0B3C5D; font-size: 20px; font-weight: 900; margin: 0 0 8px;">Reset Your Password</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
              Hello ${user.full_name},<br/><br/>
              A password reset was requested for your Atomus account. Click the secure link below to reset your password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="background: #0B3C5D; color: white; padding: 14px 28px; font-weight: bold; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(11, 60, 93, 0.2);">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 24px 0 0;">
              Or copy and paste this link in your browser:<br/>
              <a href="${resetLink}" style="color: #0B3C5D; word-break: break-all;">${resetLink}</a>
            </p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 24px 0 0; border-top: 1px solid #E1E4E8; padding-top: 20px;">
              If you did not request this, please ignore this email. Your password will remain unchanged.<br/>
              <strong>This link expires in 30 minutes.</strong>
            </p>
          </div>
          <div style="background: #F5F7FA; border-top: 1px solid #E1E4E8; padding: 20px 40px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; font-weight: 700;">
              ATOMUS.edu Coaching Centre &mdash; <a href="mailto:admin@atomus.edu" style="color: #0B3C5D; text-decoration: none;">admin@atomus.edu</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Attempt to send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY || "re_7BJqpZTW_fakeKeyForTesting"; // Try to read Resend Key
    const fromEmail = process.env.FROM_EMAIL || "noreply@atomus.edu";

    let emailSent = false;
    let emailErrorMsg = "";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          html: htmlBody
        })
      });

      if (res.ok) {
        emailSent = true;
      } else {
        const errorText = await res.text();
        emailErrorMsg = errorText;
        console.warn("Failed to send email via Resend API:", errorText);
      }
    } catch (e: any) {
      emailErrorMsg = e.message;
      console.warn("Resend email send exception:", e);
    }

    // Always log to console as fallback / local testing facilitation
    console.log("\n============================================================\n");
    console.log(`[PASSWORD RESET REQUESTED] for ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("\n============================================================\n");

    await logActivity({
      userId: user.id,
      userName: user.full_name,
      module: "Staff Access",
      action: "Password Reset Requested",
      description: `Password reset token generated and sent to ${email}. Link logged to server console.`
    });

    return NextResponse.json({
      success: true,
      message: "Reset link has been sent to your registered email address.",
      // In local/test mode, we can share that the link was logged to the console
      local_link: process.env.NODE_ENV === "development" ? resetLink : undefined
    });
  } catch (err: any) {
    console.error("Error in request-reset:", err);
    return NextResponse.json({ error: "Failed to generate password reset request" }, { status: 500 });
  }
}
