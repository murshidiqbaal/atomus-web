// Supabase Edge Function — send-parent-credentials
// Deploy with: supabase functions deploy send-parent-credentials
// Uses Resend (https://resend.com) for transactional email delivery.
// Set RESEND_API_KEY in Supabase Dashboard → Project Settings → Edge Functions

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@atomus.edu";

interface Payload {
  type?: "parent" | "teacher";
  email: string;       // Gmail address
  phone?: string;       // Full phone number
  loginId: string;     // Digits-only phone (Parent) or email (Teacher)
  password: string;    // Auto-generated password
  name?: string;       // Full name
  studentName?: string; // Student's full name (Parent only)
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload: Payload = await req.json();
  const { type = "parent", email, phone = "", loginId, password, name = "", studentName = "" } = payload;

  const isTeacher = type === "teacher";
  const portalName = isTeacher ? "Teacher Portal" : "Parent Portal";
  const subjectLine = isTeacher ? "Your ATOMUS Teacher Account Login Credentials" : "Your ATOMUS Parent App Login Credentials";
  const headingText = isTeacher ? "Your Teacher Account Login Credentials" : "Your Login Credentials";
  
  const introText = isTeacher
    ? `A teacher account has been created for you at <strong>ATOMUS.edu</strong> Coaching Centre. Use the credentials below to log in to the <strong>ATOMUS Teacher Dashboard</strong>.`
    : `A parent account has been created for <strong>${studentName}</strong> at ATOMUS.edu Coaching Centre. Use the credentials below to log in to the <strong>ATOMUS Parent App</strong>.`;

  const usernameLabel = isTeacher ? "Username (Email)" : "Username (Phone Number)";
  const usernameSub = isTeacher ? `Registered email: ${email}` : `Registered phone: ${phone}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #F5F7FA; padding: 0; margin: 0;">
      <div style="max-width: 540px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #E1E4E8;">
        <!-- Header -->
        <div style="background: #0B3C5D; padding: 32px 40px;">
          <h1 style="color: white; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">ATOMUS<span style="color: #D4AF37;">.edu</span></h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Coaching Centre — ${portalName}</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px;">
          <h2 style="color: #0B3C5D; font-size: 20px; font-weight: 900; margin: 0 0 8px;">${headingText}</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">
            ${introText}
          </p>

          <!-- Credential Box -->
          <div style="background: #F5F7FA; border: 1px solid #E1E4E8; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px;">
              <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">${usernameLabel}</p>
              <p style="font-size: 18px; font-weight: 900; color: #0B3C5D; margin: 0; font-family: monospace;">${loginId}</p>
              <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0;">${usernameSub}</p>
            </div>
            <div style="border-top: 1px solid #E1E4E8; padding-top: 16px;">
              <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Password</p>
              <p style="font-size: 22px; font-weight: 900; color: #D4AF37; margin: 0; font-family: monospace; letter-spacing: 2px;">${password}</p>
            </div>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #92400e; margin: 0; font-weight: 600;">
              ⚠️ Please keep these credentials safe. You may change your password after your first login.
            </p>
          </div>

          <p style="font-size: 13px; color: #64748b; margin: 0;">
            If you did not expect this email or believe it was sent in error, please contact the admin office immediately.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #F5F7FA; border-top: 1px solid #E1E4E8; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0; font-weight: 700;">
            ATOMUS.edu Coaching Centre &mdash; <a href="mailto:admin@atomus.edu" style="color: #0B3C5D; text-decoration: none;">admin@atomus.edu</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: subjectLine,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend error:", errBody);
    return new Response(JSON.stringify({ error: errBody }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
