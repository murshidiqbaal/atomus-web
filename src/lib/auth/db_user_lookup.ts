import { getAdminClient } from "@/lib/supabase-admin";

export interface DBUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  last_login?: string | null;
  created_at: string;
  auth_id?: string | null;
  must_change_password?: boolean;
  failed_login_attempts?: number;
  locked_until?: string | null;
}

export async function lookupUser(usernameOrEmail: string): Promise<{ user: DBUser; user_type: "admin" | "staff" } | null> {
  const supabase = getAdminClient();
  const lowerInput = usernameOrEmail.trim().toLowerCase();
  const isEmail = /@/.test(lowerInput);

  // 1. Search admins table
  let adminQuery = supabase.from("admins").select("*");
  if (isEmail) {
    adminQuery = adminQuery.eq("email", lowerInput);
  } else {
    adminQuery = adminQuery.eq("username", lowerInput);
  }
  const { data: adminData } = await adminQuery.maybeSingle();
  if (adminData) {
    return { user: adminData as DBUser, user_type: "admin" };
  }

  // 2. Search staff_accounts table
  let staffQuery = supabase.from("staff_accounts").select("*");
  if (isEmail) {
    staffQuery = staffQuery.eq("email", lowerInput);
  } else {
    staffQuery = staffQuery.eq("username", lowerInput);
  }
  const { data: staffData } = await staffQuery.maybeSingle();
  if (staffData) {
    return { user: staffData as DBUser, user_type: "staff" };
  }

  return null;
}

export async function logActivity({
  userId,
  userName,
  module,
  action,
  description,
  ipAddress = "127.0.0.1"
}: {
  userId: string | null;
  userName: string;
  module: string;
  action: string;
  description: string;
  ipAddress?: string;
}) {
  const supabase = getAdminClient();
  try {
    await supabase.from("staff_activity_logs").insert([{
      staff_id: userId,
      staff_name: userName,
      module,
      action,
      description,
      ip_address: ipAddress
    }]);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
