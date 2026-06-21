export type StaffStatus = "Active" | "Disabled";

export interface StaffAccount {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  campus_id: string | null;
  status: StaffStatus;
  last_login: string | null;
  created_at: string;
  auth_id?: string | null;
  campus?: { id: string; name: string } | null;
  must_change_password?: boolean;
  failed_login_attempts?: number;
  locked_until?: string | null;
}

export interface StaffPermission {
  id: string;
  staff_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_mark: boolean;
  can_manage: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  staff_id: string | null;
  staff_name: string;
  module: string;
  action: string;
  description: string;
  ip_address: string | null;
  created_at: string;
}

// Map representing permissions per page/module
// Rows = Modules (e.g. 'Students', 'Fees')
// Columns = Actions (e.g. 'view', 'create', 'update', 'delete', 'export', 'mark', 'manage')
export type PermissionAction = "view" | "create" | "update" | "delete" | "export" | "mark" | "manage";

export type ModulePermissions = Record<PermissionAction, boolean>;

export type PermissionsMatrix = Record<string, ModulePermissions>;

export const ALL_MODULES = [
  "Dashboard",
  "Students",
  "Parents",
  "Teachers",
  "Courses",
  "Campuses",
  "Subjects",
  "Attendance",
  "Marks",
  "Fees",
  "Announcements",
  "Expenses",
  "Reports",
  "Settings",
  "Staff Access"
] as const;

export type StaffModule = typeof ALL_MODULES[number];

export const ALL_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "mark",
  "manage"
];

// Returns an empty permission set for a module
export function createEmptyModulePermissions(): ModulePermissions {
  return {
    view: false,
    create: false,
    update: false,
    delete: false,
    export: false,
    mark: false,
    manage: false
  };
}

// Returns an empty matrix for all modules
export function createEmptyMatrix(): PermissionsMatrix {
  const matrix: PermissionsMatrix = {};
  for (const m of ALL_MODULES) {
    matrix[m] = createEmptyModulePermissions();
  }
  return matrix;
}

// Presets templates mapping
export const PERMISSION_PRESETS: Record<
  "Full Access" | "Read Only" | "Accounting" | "Teacher Office" | "Reception" | "Office Staff",
  PermissionsMatrix
> = {
  "Full Access": (() => {
    const m = createEmptyMatrix();
    for (const mod of ALL_MODULES) {
      m[mod] = { view: true, create: true, update: true, delete: true, export: true, mark: true, manage: true };
    }
    return m;
  })(),

  "Read Only": (() => {
    const m = createEmptyMatrix();
    for (const mod of ALL_MODULES) {
      m[mod] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    }
    return m;
  })(),

  "Accounting": (() => {
    const m = createEmptyMatrix();
    // Accounting can view dashboard, manage fees, expenses, and view reports
    m["Dashboard"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Fees"] = { view: true, create: true, update: true, delete: true, export: true, mark: false, manage: true };
    m["Expenses"] = { view: true, create: true, update: true, delete: true, export: true, mark: false, manage: true };
    m["Reports"] = { view: true, create: false, update: false, delete: false, export: true, mark: false, manage: false };
    // Read access to related info
    m["Students"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Courses"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Campuses"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    return m;
  })(),

  "Teacher Office": (() => {
    const m = createEmptyMatrix();
    // Manage courses, subjects, marks, and mark attendance
    m["Dashboard"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Courses"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    m["Subjects"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    m["Attendance"] = { view: true, create: true, update: true, delete: false, export: false, mark: true, manage: false };
    m["Marks"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: true };
    m["Students"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Announcements"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    return m;
  })(),

  "Reception": (() => {
    const m = createEmptyMatrix();
    // Student & parent intake, view dashboard, view courses, view/mark attendance
    m["Dashboard"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Students"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    m["Parents"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    m["Attendance"] = { view: true, create: true, update: false, delete: false, export: false, mark: true, manage: false };
    m["Announcements"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    m["Campuses"] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    return m;
  })(),

  "Office Staff": (() => {
    const m = createEmptyMatrix();
    // Standard office worker permissions (view everything, manage students, parents, announcements)
    for (const mod of ALL_MODULES) {
      m[mod] = { view: true, create: false, update: false, delete: false, export: false, mark: false, manage: false };
    }
    m["Students"] = { view: true, create: true, update: true, delete: false, export: true, mark: false, manage: false };
    m["Parents"] = { view: true, create: true, update: true, delete: false, export: true, mark: false, manage: false };
    m["Attendance"] = { view: true, create: true, update: true, delete: false, export: false, mark: true, manage: false };
    m["Announcements"] = { view: true, create: true, update: true, delete: true, export: false, mark: false, manage: false };
    m["Marks"] = { view: true, create: true, update: true, delete: false, export: false, mark: false, manage: false };
    return m;
  })()
};
