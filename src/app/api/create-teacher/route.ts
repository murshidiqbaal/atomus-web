import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, full_name, phone_number, campus_id, ...otherTeacherFields } = body;
  
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Missing required fields: email, password, or full_name" }, { status: 400 });
  }

  const admin = supabaseAdmin.auth.admin;
  const metadata = { full_name, phone_number: phone_number ?? null, role: "teacher" };

  // 1. Create the Auth User
  const { data: authData, error: authError } = await admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (authError) {
    // Handle duplicate email case to give a better error message if necessary
    const listed: any = await admin.listUsers();
    const users: any[] = listed?.data?.users ?? [];
    const match = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (match?.id) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Failed to create auth user." }, { status: 500 });
  }

  // 2. Insert into teachers table
  const teacherPayload = {
    auth_id: userId,
    email,
    full_name,
    phone_number: phone_number || null,
    campus_id: campus_id || null,
    password_hash: password, // Store plain password for admin reference
    ...otherTeacherFields
  };

  const { data: teacherData, error: insertError } = await supabaseAdmin
    .from("teachers")
    .insert([teacherPayload])
    .select()
    .single();

  // 3. Transaction-safe rollback
  if (insertError) {
    // Delete the orphaned auth user
    await admin.deleteUser(userId);
    return NextResponse.json({ error: insertError.message || "Failed to save teacher profile." }, { status: 400 });
  }

  // 4. Send email credentials immediately
  try {
    await supabaseAdmin.functions.invoke("send-parent-credentials", {
      body: {
        type: "teacher",
        email,
        phone: phone_number || "",
        loginId: email,
        password,
        name: full_name
      }
    });
  } catch (emailErr) {
    console.error("Failed to send teacher credentials email:", emailErr);
  }

  return NextResponse.json({ teacher: teacherData, user_id: userId });
}
