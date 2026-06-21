import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { staffAccessService } from "../services/staff_access_service";
import { PermissionsMatrix, PermissionAction, createEmptyMatrix, PERMISSION_PRESETS } from "../types";

type PermissionContextType = {
  permissions: PermissionsMatrix | null;
  loading: boolean;
  role: string | null;
  staffId: string | null;
  staffName: string | null;
  refetch: () => Promise<void>;
};

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsMatrix | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    if (!user || !role) {
      setPermissions(null);
      setStaffId(null);
      setStaffName(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (role === "admin") {
        // Admin gets full permissions immediately
        setPermissions(PERMISSION_PRESETS["Full Access"]);
        setStaffId("super-admin-id");
        setStaffName(user.user_metadata?.full_name || "Super Admin");
      } else if (role === "staff") {
        // Find staff account matching the auth user
        const accounts = await staffAccessService.listStaffAccounts();
        const account = accounts.find((a) => a.auth_id === user.id || a.email === user.email || a.username === user.user_metadata?.username);
        
        if (account) {
          setStaffId(account.id);
          setStaffName(account.full_name);
          const matrix = await staffAccessService.getStaffPermissions(account.id);
          setPermissions(matrix);
        } else {
          // Default fallback to Reception matrix for safety if staff record not found
          setPermissions(PERMISSION_PRESETS["Reception"]);
        }
      } else {
        // Teachers, Parents etc. get empty matrix (handled by their own dashboards)
        setPermissions(createEmptyMatrix());
      }
    } catch (e) {
      console.error("Failed to load permissions:", e);
      setPermissions(createEmptyMatrix());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [user?.id, role]);

  const value = useMemo(
    () => ({
      permissions,
      loading,
      role: role || null,
      staffId,
      staffName,
      refetch: loadPermissions
    }),
    [permissions, loading, role, staffId, staffName]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

export function useCan(module: string, action: PermissionAction): boolean {
  const { permissions, role } = usePermissions();
  if (role === "admin") return true;
  if (!permissions) return false;
  const modulePerms = permissions[module];
  if (!modulePerms) return false;
  return !!modulePerms[action];
}
