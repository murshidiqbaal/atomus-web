import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase-admin";
import { messaging } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  title: string;
  message: string;
  type: string;
  target: "everyone" | "campus" | "course" | "teachers" | "parents" | "students";
  campus_id?: string;
  course_id?: string;
  student_ids?: string[]; // Optional specific students
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
    title,
    message,
    type,
    target,
    campus_id,
    course_id,
    student_ids,
    reference_table,
    reference_id,
    image_url,
    priority = "normal",
    created_by,
  } = body;

  if (!title || !message || !type || !target) {
    return NextResponse.json(
      { error: "title, message, type, and target are required" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  let receiverIds: string[] = [];

  // 1. Resolve targeted user IDs based on target selection
  try {
    if (target === "everyone") {
      const { data: parents } = await admin.from("parents").select("id");
      const { data: teachers } = await admin.from("teachers").select("id");
      receiverIds = [
        ...(parents?.map((p) => p.id) || []),
        ...(teachers?.map((t) => t.id) || []),
      ];
    } else if (target === "campus") {
      if (!campus_id) {
        return NextResponse.json({ error: "campus_id is required for target campus" }, { status: 400 });
      }
      const { data: students } = await admin.from("students").select("parent_id").eq("campus_id", campus_id);
      const { data: teachers } = await admin.from("teachers").select("id").eq("campus_id", campus_id);
      receiverIds = [
        ...(students?.map((s) => s.parent_id).filter(Boolean) as string[] || []),
        ...(teachers?.map((t) => t.id) || []),
      ];
    } else if (target === "course") {
      if (!course_id) {
        return NextResponse.json({ error: "course_id is required for target course" }, { status: 400 });
      }
      const { data: students } = await admin.from("students").select("parent_id").eq("course_id", course_id);
      const { data: teacherSubjs } = await admin.from("teacher_subjects").select("teacher_id").eq("course_id", course_id);
      receiverIds = [
        ...(students?.map((s) => s.parent_id).filter(Boolean) as string[] || []),
        ...(teacherSubjs?.map((ts) => ts.teacher_id) || []),
      ];
    } else if (target === "teachers") {
      let query = admin.from("teachers").select("id");
      if (campus_id) query = query.eq("campus_id", campus_id);
      const { data: teachers } = await query;
      receiverIds = teachers?.map((t) => t.id) || [];
    } else if (target === "parents") {
      let query = admin.from("students").select("parent_id");
      if (campus_id) query = query.eq("campus_id", campus_id);
      if (course_id) query = query.eq("course_id", course_id);
      const { data: students } = await query;
      receiverIds = students?.map((s) => s.parent_id).filter(Boolean) as string[] || [];
    } else if (target === "students") {
      if (!student_ids || student_ids.length === 0) {
        return NextResponse.json({ error: "student_ids are required for target students" }, { status: 400 });
      }
      const { data: students } = await admin.from("students").select("parent_id").in("id", student_ids);
      receiverIds = students?.map((s) => s.parent_id).filter(Boolean) as string[] || [];
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Resolving recipients failed: " + err.message }, { status: 500 });
  }

  // Filter unique IDs to prevent duplicate inserts/sends
  const uniqueReceiverIds = Array.from(new Set(receiverIds));

  if (uniqueReceiverIds.length === 0) {
    return NextResponse.json({
      success: true,
      status: "no_recipients",
      message: "Target group resolved to 0 recipients.",
      notifications_sent: 0,
    });
  }

  // 2. Filter out users who have disabled this notification type
  const prefColumn = mapTypeToPreferenceColumn(type);
  const { data: disabledPrefs } = await admin
    .from("notification_preferences")
    .select("user_id")
    .in("user_id", uniqueReceiverIds)
    .eq(prefColumn, false);

  const disabledSet = new Set(disabledPrefs?.map((p) => p.user_id) || []);
  const activeReceiverIds = uniqueReceiverIds.filter((uid) => !disabledSet.has(uid));

  if (activeReceiverIds.length === 0) {
    return NextResponse.json({
      success: true,
      status: "all_muted",
      message: "All recipients have disabled this notification category in their settings.",
      notifications_sent: 0,
    });
  }

  // 3. Fetch active device tokens for all allowed recipients
  const { data: tokens, error: tokensError } = await admin
    .from("device_tokens")
    .select("id, user_id, user_type, device_token, platform")
    .in("user_id", activeReceiverIds)
    .eq("is_active", true);

  if (tokensError) {
    return NextResponse.json({ error: tokensError.message }, { status: 500 });
  }

  // 4. Create and bulk insert notification records
  const notificationsPayload = activeReceiverIds.map((uid) => {
    const matchedToken = tokens?.find((t) => t.user_id === uid);
    const receiverType = matchedToken ? matchedToken.user_type : "parent";
    return {
      receiver_id: uid,
      receiver_type: receiverType,
      title,
      message,
      type,
      reference_table: reference_table || null,
      reference_id: reference_id || null,
      image_url: image_url || null,
      priority,
      created_by: created_by || null,
      is_read: false,
    };
  });

  const { data: insertedNotifications, error: insertError } = await admin
    .from("notifications")
    .insert(notificationsPayload)
    .select("id, receiver_id");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (!tokens || tokens.length === 0 || !messaging) {
    return NextResponse.json({
      success: true,
      status: tokens?.length === 0 ? "no_devices" : "firebase_missing",
      message: tokens?.length === 0
        ? "Notifications saved in database, but no active device tokens registered."
        : "Notifications saved, but Firebase Admin SDK is not initialized.",
      notifications_sent: insertedNotifications.length,
    });
  }

  // Map each receiver_id to its inserted notification ID
  const notificationIdMap = new Map<string, string>();
  insertedNotifications.forEach((n) => {
    notificationIdMap.set(n.receiver_id, n.id);
  });

  const isHighPriority = priority === "high" || type.toLowerCase().includes("emergency");
  const channelId = type.toLowerCase().includes("attendance") ? "atomus_attendance" : "atomus_general";

  // 5. Chunk the multicast push messages (Firebase limit is 500 tokens per multicast call)
  const chunkSize = 500;
  const deliveryLogs: any[] = [];
  const badTokenIds: string[] = [];

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const targetTokens = chunk.map((t) => t.device_token);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: targetTokens,
        notification: {
          title,
          body: message,
        },
        data: {
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
      });

      // Match responses back to tokens
      response.responses.forEach((res: any, index: number) => {
        const tokenInfo = chunk[index];
        const notificationId = notificationIdMap.get(tokenInfo.user_id);

        deliveryLogs.push({
          notification_id: notificationId,
          device_token: tokenInfo.device_token,
          platform: tokenInfo.platform,
          status: res.success ? "sent" : "failed",
          failure_reason: res.success ? null : res.error?.message || "Unknown error",
        });

        if (!res.success && res.error) {
          const code = res.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
          ) {
            badTokenIds.push(tokenInfo.id);
          }
        }
      });
    } catch (chunkErr: any) {
      // If the entire multicast call fails, log failures for this chunk
      chunk.forEach((tokenInfo) => {
        const notificationId = notificationIdMap.get(tokenInfo.user_id);
        deliveryLogs.push({
          notification_id: notificationId,
          device_token: tokenInfo.device_token,
          platform: tokenInfo.platform,
          status: "failed",
          failure_reason: chunkErr.message || String(chunkErr),
        });
      });
    }
  }

  // 6. Write logs to public.notification_logs in bulk
  if (deliveryLogs.length > 0) {
    await admin.from("notification_logs").insert(deliveryLogs);
  }

  // 7. Deactivate invalid tokens in bulk
  if (badTokenIds.length > 0) {
    await admin
      .from("device_tokens")
      .update({ is_active: false })
      .in("id", badTokenIds);
  }

  return NextResponse.json({
    success: true,
    status: "pushed",
    notifications_saved: insertedNotifications.length,
    devices_targeted: tokens.length,
    bad_tokens_pruned: badTokenIds.length,
  });
}
