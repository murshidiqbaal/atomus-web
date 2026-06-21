import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { messaging } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  receiver_id: string;
  receiver_type: "parent" | "teacher" | "admin";
  title: string;
  message: string;
  type: string;
  reference_table?: string;
  reference_id?: string;
  image_url?: string;
  priority?: "normal" | "high";
  created_by?: string;
}

function mapTypeToPreferenceColumn(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("attendance")) return "attendance";
  if (t.includes("marks") || t.includes("exam")) return "marks";
  if (t.includes("fee")) return "fees";
  if (t.includes("announcement")) return "announcements";
  if (t.includes("report")) return "reports";
  return "general";
}

export async function POST(request: Request) {
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    receiver_id,
    receiver_type,
    title,
    message,
    type,
    reference_table,
    reference_id,
    image_url,
    priority = "normal",
    created_by,
  } = body;

  if (!receiver_id || !receiver_type || !title || !message || !type) {
    return NextResponse.json(
      { error: "receiver_id, receiver_type, title, message, and type are required" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  // 1. Check user preferences
  const prefColumn = mapTypeToPreferenceColumn(type);
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", receiver_id)
    .maybeSingle();

  let sendPush = true;
  if (prefs && prefs[prefColumn] === false) {
    sendPush = false;
  }

  // 2. Insert notification into history database
  const { data: notification, error: insertError } = await admin
    .from("notifications")
    .insert([
      {
        receiver_id,
        receiver_type,
        title,
        message,
        type,
        reference_table: reference_table || null,
        reference_id: reference_id || null,
        image_url: image_url || null,
        priority,
        created_by: created_by || null,
        is_read: false,
      },
    ])
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (!sendPush) {
    return NextResponse.json({
      success: true,
      status: "muted",
      message: "Notification stored in history, but push skipped per user preferences.",
      notification,
    });
  }

  // 3. Fetch active device tokens
  const { data: tokens, error: tokensError } = await admin
    .from("device_tokens")
    .select("*")
    .eq("user_id", receiver_id)
    .eq("is_active", true);

  if (tokensError) {
    return NextResponse.json({ error: tokensError.message }, { status: 500 });
  }

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({
      success: true,
      status: "no_devices",
      message: "Notification stored, but no active device tokens registered.",
      notification,
    });
  }

  if (!messaging) {
    return NextResponse.json({
      success: true,
      status: "firebase_missing",
      message: "Notification stored, but Firebase Admin SDK is not configured for push.",
      notification,
    });
  }

  const results: any[] = [];

  // 4. Send Firebase Push to all active devices
  for (const token of tokens) {
    const isHighPriority = priority === "high" || type.toLowerCase().includes("emergency");
    const channelId = type.toLowerCase().includes("attendance") ? "atomus_attendance" : "atomus_general";

    const fcmMessage = {
      token: token.device_token,
      notification: {
        title,
        body: message,
      },
      data: {
        notification_id: notification.id,
        type,
        reference_table: reference_table || "",
        reference_id: reference_id || "",
        image_url: image_url || "",
      },
      android: {
        priority: (isHighPriority ? "high" : "normal") as any,
        notification: {
          sound: "default",
          channelId,
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-priority": isHighPriority ? "10" : "5",
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    // 5. Send FCM with retry logic (up to 3 times)
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let errMessage = "";

    while (attempts < maxAttempts && !success) {
      try {
        await messaging.send(fcmMessage);
        success = true;
      } catch (err: any) {
        attempts++;
        errMessage = err?.message || String(err);
        if (attempts < maxAttempts) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // 6. Log sending result
    await admin.from("notification_logs").insert([
      {
        notification_id: notification.id,
        device_token: token.device_token,
        platform: token.platform,
        status: success ? "sent" : "failed",
        failure_reason: success ? null : errMessage,
      },
    ]);

    // 7. Deactivate invalid/unregistered tokens
    if (!success) {
      const isUnregistered =
        errMessage.includes("registration-token-not-registered") ||
        errMessage.includes("not-registered") ||
        errMessage.includes("invalid-registration-token") ||
        errMessage.includes("invalid-argument");

      if (isUnregistered) {
        await admin
          .from("device_tokens")
          .update({ is_active: false })
          .eq("id", token.id);
      }
    }

    results.push({
      device_id: token.id,
      platform: token.platform,
      success,
      error: success ? null : errMessage,
    });
  }

  return NextResponse.json({
    success: true,
    status: "pushed",
    notification,
    results,
  });
}
