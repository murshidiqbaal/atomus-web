import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  StaffAccount,
  StaffPermission,
  ActivityLog,
  PermissionsMatrix,
  createEmptyMatrix,
  ALL_MODULES,
  PERMISSION_PRESETS
} from "../types";

const FALLBACK_KEY_ACCOUNTS = "atomus_staff_accounts_fallback";
const FALLBACK_KEY_PERMISSIONS = "atomus_staff_permissions_fallback";
const FALLBACK_KEY_LOGS = "atomus_staff_logs_fallback";

// Simple client-side hash for localStorage reference
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "hash-" + Math.abs(hash).toString(16);
}

// Check if localStorage is available
const isBrowser = typeof window !== "undefined";

function loadFallback<T>(key: string, defaultVal: T): T {
  if (!isBrowser) return defaultVal;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error("Failed to load fallback storage:", e);
    return defaultVal;
  }
}

function saveFallback<T>(key: string, val: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Failed to save fallback storage:", e);
  }
}

// Global flag to track if we should bypass Supabase and use fallback
let useFallbackStorage = false;

// Helper to determine if we should fallback based on Supabase error
function checkErrorAndGetFallback(err: any): boolean {
  if (err && (err.code === "PGRST205" || err.message?.includes("relation") || err.message?.includes("Could not find the table"))) {
    if (!useFallbackStorage) {
      console.warn("⚠️ Staff tables not found in Supabase. Switching to localStorage RBAC fallback.");
      useFallbackStorage = true;
    }
    return true;
  }
  return useFallbackStorage;
}

export const staffAccessService = {
  // Check if we are currently using local storage fallback
  isUsingFallback() {
    return useFallbackStorage;
  },

  // Seed initial accounts in fallback if empty
  seedFallbackIfEmpty() {
    if (!isBrowser) return;
    const accounts = loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
    if (accounts.length === 0) {
      const defaultAdmin: StaffAccount = {
        id: "super-admin-id",
        username: "superadmin",
        password_hash: hashPassword("Admin123!"),
        full_name: "Super Admin",
        email: "admin@atomusedu.com",
        phone: "9876543210",
        designation: "Principal",
        campus_id: null,
        status: "Active",
        last_login: null,
        created_at: new Date().toISOString()
      };
      
      const receptionStaff: StaffAccount = {
        id: "reception-staff-id",
        username: "reception",
        password_hash: hashPassword("Staff123!"),
        full_name: "Amina Khan",
        email: "reception@atomusedu.com",
        phone: "8765432109",
        designation: "Front Desk Executive",
        campus_id: null,
        status: "Active",
        last_login: null,
        created_at: new Date().toISOString()
      };

      saveFallback(FALLBACK_KEY_ACCOUNTS, [defaultAdmin, receptionStaff]);

      // Seed permissions
      const perms: StaffPermission[] = [];
      
      // Admin gets full permissions
      const fullMatrix = PERMISSION_PRESETS["Full Access"];
      for (const [module, act] of Object.entries(fullMatrix)) {
        perms.push({
          id: `p-admin-${module}`,
          staff_id: defaultAdmin.id,
          module,
          can_view: act.view,
          can_create: act.create,
          can_update: act.update,
          can_delete: act.delete,
          can_export: act.export,
          can_mark: act.mark,
          can_manage: act.manage,
          created_at: new Date().toISOString()
        });
      }

      // Reception gets Reception preset permissions
      const receptionMatrix = PERMISSION_PRESETS["Reception"];
      for (const [module, act] of Object.entries(receptionMatrix)) {
        perms.push({
          id: `p-rec-${module}`,
          staff_id: receptionStaff.id,
          module,
          can_view: act.view,
          can_create: act.create,
          can_update: act.update,
          can_delete: act.delete,
          can_export: act.export,
          can_mark: act.mark,
          can_manage: act.manage,
          created_at: new Date().toISOString()
        });
      }

      saveFallback(FALLBACK_KEY_PERMISSIONS, perms);

      // Seed initial activity log
      const logs: ActivityLog[] = [
        {
          id: "log-1",
          staff_id: defaultAdmin.id,
          staff_name: defaultAdmin.full_name,
          module: "Staff Access",
          action: "System Initialisation",
          description: "Default superadmin and reception accounts initialized.",
          ip_address: "127.0.0.1",
          created_at: new Date().toISOString()
        }
      ];
      saveFallback(FALLBACK_KEY_LOGS, logs);
    }
  },

  async listCampuses(): Promise<{ data: { id: string; name: string }[] | null; error: any }> {
    try {
      const { data, error } = await supabase.from("campuses").select("id, name").order("name");
      if (error && checkErrorAndGetFallback(error)) {
        return {
          data: [
            { id: "campus-main", name: "Main Campus" },
            { id: "campus-north", name: "North Campus" }
          ],
          error: null
        };
      }
      return { data, error };
    } catch (err) {
      if (checkErrorAndGetFallback(err)) {
        return {
          data: [
            { id: "campus-main", name: "Main Campus" },
            { id: "campus-north", name: "North Campus" }
          ],
          error: null
        };
      }
      throw err;
    }
  },

  // ── Staff Accounts CRUD ─────────────────────────────────────────
  async listStaffAccounts(): Promise<StaffAccount[]> {
    if (!useFallbackStorage) {
      try {
        const { data, error } = await supabaseAdmin
          .from("staff_accounts")
          .select("*, campus:campuses(id, name)")
          .order("created_at", { ascending: false });

        if (error) {
          if (checkErrorAndGetFallback(error)) return this.listStaffAccounts();
          throw error;
        }
        return (data ?? []) as StaffAccount[];
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          this.seedFallbackIfEmpty();
          return loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
        }
        throw err;
      }
    } else {
      this.seedFallbackIfEmpty();
      const accounts = loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
      // Join campus
      const { data: campuses } = await supabase.from("campuses").select("id, name");
      const campusMap = new Map((campuses ?? []).map(c => [c.id, c]));
      return accounts.map(acc => ({
        ...acc,
        campus: acc.campus_id ? campusMap.get(acc.campus_id) ?? null : null
      }));
    }
  },

  async createStaffAccount(input: Omit<StaffAccount, "id" | "created_at" | "last_login"> & { password?: string }): Promise<StaffAccount> {
    const pHash = input.password ? hashPassword(input.password) : input.password_hash;
    
    if (!useFallbackStorage) {
      try {
        // Create user in Supabase Auth first
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password || "TempPass123!",
          email_confirm: true,
          user_metadata: { role: "staff", full_name: input.full_name }
        });

        if (authError) throw authError;

        // Insert into staff_accounts
        const { data, error } = await supabaseAdmin
          .from("staff_accounts")
          .insert([{
            username: input.username.trim().toLowerCase(),
            password_hash: pHash,
            full_name: input.full_name.trim(),
            email: input.email.trim(),
            phone: input.phone,
            designation: input.designation,
            campus_id: input.campus_id,
            status: input.status,
            auth_id: authUser.user.id
          }])
          .select("*")
          .single();

        if (error) {
          // Rollback auth user creation if db insert fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          throw error;
        }

        const newAcc = data as StaffAccount;

        // Initialize default empty permissions
        const emptyMatrix = createEmptyMatrix();
        await this.saveStaffPermissions(newAcc.id, emptyMatrix);

        await this.logActivity(null, "Super Admin", "Staff Access", "Create Staff", `Created staff account for ${newAcc.full_name} (${newAcc.username})`);

        return newAcc;
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.createStaffAccountFallback(input, pHash);
        }
        throw err;
      }
    } else {
      return this.createStaffAccountFallback(input, pHash);
    }
  },

  createStaffAccountFallback(input: any, pHash: string): StaffAccount {
    this.seedFallbackIfEmpty();
    const accounts = loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
    
    if (accounts.some(a => a.username === input.username.trim().toLowerCase())) {
      throw new Error(`Username '${input.username}' is already taken.`);
    }

    const newAcc: StaffAccount = {
      id: "staff-" + Math.random().toString(36).substring(2, 9),
      username: input.username.trim().toLowerCase(),
      password_hash: pHash,
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone || null,
      designation: input.designation || null,
      campus_id: input.campus_id || null,
      status: input.status,
      last_login: null,
      created_at: new Date().toISOString()
    };

    accounts.push(newAcc);
    saveFallback(FALLBACK_KEY_ACCOUNTS, accounts);

    // Initialize default empty permissions
    const emptyMatrix = createEmptyMatrix();
    this.saveStaffPermissionsFallback(newAcc.id, emptyMatrix);

    this.logActivityFallback(null, "Super Admin", "Staff Access", "Create Staff", `Created staff account for ${newAcc.full_name} (${newAcc.username})`);

    return newAcc;
  },

  async updateStaffAccount(id: string, patch: Partial<StaffAccount> & { password?: string }): Promise<StaffAccount> {
    if (!useFallbackStorage) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (patch.full_name !== undefined) dbUpdates.full_name = patch.full_name.trim();
        if (patch.email !== undefined)     dbUpdates.email = patch.email.trim();
        if (patch.phone !== undefined)     dbUpdates.phone = patch.phone;
        if (patch.designation !== undefined) dbUpdates.designation = patch.designation;
        if (patch.campus_id !== undefined)   dbUpdates.campus_id = patch.campus_id;
        if (patch.status !== undefined)       dbUpdates.status = patch.status;
        if (patch.password_hash !== undefined) dbUpdates.password_hash = patch.password_hash;
        if (patch.must_change_password !== undefined) dbUpdates.must_change_password = patch.must_change_password;
        if (patch.failed_login_attempts !== undefined) dbUpdates.failed_login_attempts = patch.failed_login_attempts;
        if (patch.locked_until !== undefined)         dbUpdates.locked_until = patch.locked_until;
        
        // Fetch current staff member to get auth_id and email
        const { data: current } = await supabaseAdmin
          .from("staff_accounts")
          .select("auth_id, email, full_name, username")
          .eq("id", id)
          .single();

        if (current && current.auth_id) {
          const authUpdates: any = {};
          if (patch.email !== undefined && patch.email !== current.email) authUpdates.email = patch.email;
          if (patch.password !== undefined) authUpdates.password = patch.password;
          if (patch.full_name !== undefined && patch.full_name !== current.full_name) {
            authUpdates.user_metadata = { role: "staff", full_name: patch.full_name };
          }
          
          if (Object.keys(authUpdates).length > 0) {
            await supabaseAdmin.auth.admin.updateUserById(current.auth_id, authUpdates);
          }
        }

        const { data, error } = await supabaseAdmin
          .from("staff_accounts")
          .update(dbUpdates)
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        const updated = data as StaffAccount;

        await this.logActivity(null, "Super Admin", "Staff Access", "Update Staff", `Updated staff account for ${updated.full_name} (${updated.username})`);
        
        return updated;
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.updateStaffAccountFallback(id, patch);
        }
        throw err;
      }
    } else {
      return this.updateStaffAccountFallback(id, patch);
    }
  },

  updateStaffAccountFallback(id: string, patch: any): StaffAccount {
    this.seedFallbackIfEmpty();
    const accounts = loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Staff account not found");

    const acc = accounts[idx];
    const updated = {
      ...acc,
      ...patch,
      password_hash: patch.password ? hashPassword(patch.password) : (patch.password_hash ?? acc.password_hash)
    };

    accounts[idx] = updated;
    saveFallback(FALLBACK_KEY_ACCOUNTS, accounts);

    this.logActivityFallback(null, "Super Admin", "Staff Access", "Update Staff", `Updated staff account for ${updated.full_name} (${updated.username})`);

    return updated;
  },

  async deleteStaffAccount(id: string): Promise<void> {
    if (id === "super-admin-id") {
      throw new Error("Cannot delete the Super Admin account.");
    }
    
    if (!useFallbackStorage) {
      try {
        const { data: current } = await supabaseAdmin
          .from("staff_accounts")
          .select("auth_id, full_name, username")
          .eq("id", id)
          .single();

        if (current) {
          if (current.username === "superadmin") {
            throw new Error("Cannot delete the Super Admin account.");
          }
          if (current.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(current.auth_id);
          }
        }

        const { error } = await supabaseAdmin.from("staff_accounts").delete().eq("id", id);
        if (error) throw error;

        await this.logActivity(null, "Super Admin", "Staff Access", "Delete Staff", `Deleted staff account ${current?.full_name ?? id}`);
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.deleteStaffAccountFallback(id);
        }
        throw err;
      }
    } else {
      return this.deleteStaffAccountFallback(id);
    }
  },

  deleteStaffAccountFallback(id: string): void {
    this.seedFallbackIfEmpty();
    const accounts = loadFallback<StaffAccount[]>(FALLBACK_KEY_ACCOUNTS, []);
    const current = accounts.find(a => a.id === id);
    if (!current) throw new Error("Staff account not found");
    if (current.username === "superadmin" || current.id === "super-admin-id") {
      throw new Error("Cannot delete the Super Admin account.");
    }

    const filtered = accounts.filter(a => a.id !== id);
    saveFallback(FALLBACK_KEY_ACCOUNTS, filtered);

    // Clean up permissions
    const perms = loadFallback<StaffPermission[]>(FALLBACK_KEY_PERMISSIONS, []);
    const filteredPerms = perms.filter(p => p.staff_id !== id);
    saveFallback(FALLBACK_KEY_PERMISSIONS, filteredPerms);

    this.logActivityFallback(null, "Super Admin", "Staff Access", "Delete Staff", `Deleted staff account ${current.full_name} (${current.username})`);
  },

  // ── Roles & Permissions Matrix ──────────────────────────────────
  async getStaffPermissions(staffId: string): Promise<PermissionsMatrix> {
    if (!useFallbackStorage) {
      try {
        const { data, error } = await supabaseAdmin
          .from("staff_permissions")
          .select("*")
          .eq("staff_id", staffId);

        if (error) {
          if (checkErrorAndGetFallback(error)) return this.getStaffPermissions(staffId);
          throw error;
        }

        const matrix = createEmptyMatrix();
        for (const row of (data ?? [])) {
          if (matrix[row.module]) {
            matrix[row.module] = {
              view: row.can_view,
              create: row.can_create,
              update: row.can_update,
              delete: row.can_delete,
              export: row.can_export,
              mark: row.can_mark,
              manage: row.can_manage
            };
          }
        }
        return matrix;
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.getStaffPermissionsFallback(staffId);
        }
        throw err;
      }
    } else {
      return this.getStaffPermissionsFallback(staffId);
    }
  },

  getStaffPermissionsFallback(staffId: string): PermissionsMatrix {
    this.seedFallbackIfEmpty();
    const perms = loadFallback<StaffPermission[]>(FALLBACK_KEY_PERMISSIONS, []);
    const staffPerms = perms.filter(p => p.staff_id === staffId);

    const matrix = createEmptyMatrix();
    for (const row of staffPerms) {
      if (matrix[row.module]) {
        matrix[row.module] = {
          view: row.can_view,
          create: row.can_create,
          update: row.can_update,
          delete: row.can_delete,
          export: row.can_export,
          mark: row.can_mark,
          manage: row.can_manage
        };
      }
    }
    return matrix;
  },

  async saveStaffPermissions(staffId: string, matrix: PermissionsMatrix): Promise<void> {
    if (!useFallbackStorage) {
      try {
        const rows = Object.entries(matrix).map(([module, act]) => ({
          staff_id: staffId,
          module,
          can_view: act.view,
          can_create: act.create,
          can_update: act.update,
          can_delete: act.delete,
          can_export: act.export,
          can_mark: act.mark,
          can_manage: act.manage
        }));

        const { error } = await supabaseAdmin
          .from("staff_permissions")
          .upsert(rows, { onConflict: "staff_id,module" });

        if (error) throw error;

        await this.logActivity(null, "Super Admin", "Staff Access", "Configure Permissions", `Updated permission matrix for staff ${staffId}`);
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.saveStaffPermissionsFallback(staffId, matrix);
        }
        throw err;
      }
    } else {
      return this.saveStaffPermissionsFallback(staffId, matrix);
    }
  },

  saveStaffPermissionsFallback(staffId: string, matrix: PermissionsMatrix): void {
    this.seedFallbackIfEmpty();
    let perms = loadFallback<StaffPermission[]>(FALLBACK_KEY_PERMISSIONS, []);
    // Remove existing
    perms = perms.filter(p => p.staff_id !== staffId);

    // Insert new
    for (const [module, act] of Object.entries(matrix)) {
      perms.push({
        id: `p-${staffId}-${module}`,
        staff_id: staffId,
        module,
        can_view: act.view,
        can_create: act.create,
        can_update: act.update,
        can_delete: act.delete,
        can_export: act.export,
        can_mark: act.mark,
        can_manage: act.manage,
        created_at: new Date().toISOString()
      });
    }

    saveFallback(FALLBACK_KEY_PERMISSIONS, perms);

    this.logActivityFallback(null, "Super Admin", "Staff Access", "Configure Permissions", `Updated permission matrix for staff ${staffId}`);
  },

  // ── Activity Logs ───────────────────────────────────────────────
  async listActivityLogs(): Promise<ActivityLog[]> {
    if (!useFallbackStorage) {
      try {
        const { data, error } = await supabaseAdmin
          .from("staff_activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (error) {
          if (checkErrorAndGetFallback(error)) return this.listActivityLogs();
          throw error;
        }
        return (data ?? []) as ActivityLog[];
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return loadFallback<ActivityLog[]>(FALLBACK_KEY_LOGS, []);
        }
        throw err;
      }
    } else {
      return loadFallback<ActivityLog[]>(FALLBACK_KEY_LOGS, []);
    }
  },

  async logActivity(staffId: string | null, staffName: string, module: string, action: string, description: string): Promise<void> {
    if (!useFallbackStorage) {
      try {
        const { error } = await supabaseAdmin
          .from("staff_activity_logs")
          .insert([{
            staff_id: staffId,
            staff_name: staffName,
            module,
            action,
            description,
            ip_address: "127.0.0.1"
          }]);
        if (error) throw error;
      } catch (err) {
        if (checkErrorAndGetFallback(err)) {
          return this.logActivityFallback(staffId, staffName, module, action, description);
        }
      }
    } else {
      return this.logActivityFallback(staffId, staffName, module, action, description);
    }
  },

  logActivityFallback(staffId: string | null, staffName: string, module: string, action: string, description: string): void {
    const logs = loadFallback<ActivityLog[]>(FALLBACK_KEY_LOGS, []);
    logs.unshift({
      id: "log-" + Math.random().toString(36).substring(2, 9),
      staff_id: staffId,
      staff_name: staffName,
      module,
      action,
      description,
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString()
    });
    saveFallback(FALLBACK_KEY_LOGS, logs.slice(0, 1000));
  }
};
