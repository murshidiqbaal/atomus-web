'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import {
  MASTER_ADMIN_EMAIL,
  clearMasterAdminFlag,
  readMasterAdminFlag,
} from '@/lib/auth/master_admin';

export type AppRole = 'admin' | 'teacher' | 'parent' | 'staff' | null;

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  campusId?: string | null;
  courseIds?: string[];
  subjectIds?: string[];
  batchIds?: string[];
  linkedStudentIds?: string[];
  mustChangePassword?: boolean;
} | null;

export type UserPermissions = {
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageParents: boolean;
  canMarkAttendance: boolean;
  canEditAttendance: boolean;
  canManageExams: boolean;
  canManageFees: boolean;
  canManageAnnouncements: boolean;
  canManageExpenses: boolean;
};

export const ROLE_HOME: Record<Exclude<AppRole, null>, string> = {
  admin: '/admin',
  teacher: '/teacher-dashboard',
  parent: '/parent-dashboard',
  staff: '/students',
};

const DEFAULT_PERMISSIONS: Record<Exclude<AppRole, null>, UserPermissions> = {
  admin: {
    canManageStudents: true,
    canManageTeachers: true,
    canManageParents: true,
    canMarkAttendance: true,
    canEditAttendance: true,
    canManageExams: true,
    canManageFees: true,
    canManageAnnouncements: true,
    canManageExpenses: true,
  },
  staff: {
    canManageStudents: true,
    canManageTeachers: true,
    canManageParents: true,
    canMarkAttendance: true,
    canEditAttendance: true,
    canManageExams: true,
    canManageFees: false,
    canManageAnnouncements: true,
    canManageExpenses: false,
  },
  teacher: {
    canManageStudents: false,
    canManageTeachers: false,
    canManageParents: false,
    canMarkAttendance: true,
    canEditAttendance: true,
    canManageExams: false,
    canManageFees: false,
    canManageAnnouncements: false,
    canManageExpenses: false,
  },
  parent: {
    canManageStudents: false,
    canManageTeachers: false,
    canManageParents: false,
    canMarkAttendance: false,
    canEditAttendance: false,
    canManageExams: false,
    canManageFees: false,
    canManageAnnouncements: false,
    canManageExpenses: false,
  },
};

function extractRole(user: User | null | undefined): AppRole {
  const raw = (user?.user_metadata as Record<string, unknown> | undefined)?.role;
  if (raw === 'admin' || raw === 'teacher' || raw === 'parent' || raw === 'staff') return raw;
  return null;
}

function makeMasterAdminUser(): User {
  return {
    id: 'master-admin',
    aud: 'authenticated',
    role: 'authenticated',
    email: MASTER_ADMIN_EMAIL,
    app_metadata: { provider: 'master', providers: ['master'] },
    user_metadata: { role: 'admin', full_name: 'Master Admin' },
    created_at: new Date(0).toISOString(),
  } as unknown as User;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: AppRole;
  profile: UserProfile;
  permissions: UserPermissions | null;
  loading: boolean;
  isMasterAdmin: boolean;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isParent: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [masterAdmin, setMasterAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMasterAdmin(readMasterAdminFlag());
  }, []);

  const realUser = session?.user ?? null;
  // The synthetic master-admin user is only injected when the localStorage flag
  // is active. If neither a real session nor the flag exists, user is null so
  // the route guard redirects to /login.
  const user: User | null = realUser ?? (masterAdmin ? makeMasterAdminUser() : null);
  const role: AppRole = realUser
    ? (extractRole(realUser) ?? 'admin')
    : (masterAdmin ? 'admin' : null);

  // central permissions mapping
  const permissions = useMemo(() => {
    if (!role) return null;
    return DEFAULT_PERMISSIONS[role];
  }, [role]);

  // Load profiles from the DB depending on active role
  useEffect(() => {
    // No user logged in — clear profile and return
    if (!user || !role) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    // Master-admin synthetic session: profile comes from the fake user object
    // directly, no DB lookup needed.
    if (!realUser) {
      setProfile({
        id: user.id,
        name: 'Master Admin',
        email: user.email,
      });
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      setProfileLoading(true);
      try {
        if (role === 'admin') {
          const { data: admin, error: adminErr } = await supabase
            .from('admins')
            .select('id, full_name, email, must_change_password')
            .eq('auth_id', user!.id)
            .maybeSingle();

          if (!adminErr && admin && !cancelled) {
            setProfile({
              id: admin.id,
              name: admin.full_name,
              email: admin.email,
              mustChangePassword: admin.must_change_password,
            });
          } else if (!cancelled) {
            setProfile({
              id: user!.id,
              name: (user!.user_metadata?.full_name as string) || 'Admin User',
              email: user!.email,
              mustChangePassword: false,
            });
          }
        } else if (role === 'staff') {
          const { data: staff } = await supabase
            .from('staff_accounts')
            .select('id, full_name, email, phone, campus_id, must_change_password')
            .eq('auth_id', user!.id)
            .maybeSingle();

          if (staff && !cancelled) {
            setProfile({
              id: staff.id,
              name: staff.full_name,
              email: staff.email,
              phone: staff.phone || undefined,
              campusId: staff.campus_id,
              mustChangePassword: staff.must_change_password,
            });
          } else if (!cancelled) {
            setProfile({
              id: user!.id,
              name: (user!.user_metadata?.full_name as string) || 'Staff User',
              email: user!.email,
              mustChangePassword: false,
            });
          }
        } else if (role === 'teacher') {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id, full_name, campus_id')
            .eq('auth_id', user!.id)
            .maybeSingle();

          if (teacher) {
            const [courses, subjects, batches] = await Promise.all([
              supabase.from('teacher_courses').select('course_id').eq('teacher_id', teacher.id),
              supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', teacher.id),
              supabase.from('teacher_batches').select('batch_id').eq('teacher_id', teacher.id),
            ]);

            if (!cancelled) {
              setProfile({
                id: teacher.id,
                name: teacher.full_name,
                campusId: teacher.campus_id,
                courseIds: (courses.data ?? []).map((r) => r.course_id),
                subjectIds: (subjects.data ?? []).map((r) => r.subject_id),
                batchIds: (batches.data ?? []).map((r) => r.batch_id),
              });
            }
          }
        } else if (role === 'parent') {
          const { data: parent } = await supabase
            .from('parents')
            .select('id, full_name, phone_number, email')
            .eq('id', user!.id)
            .maybeSingle();

          if (parent) {
            const { data: childrenRows } = await supabase
              .from('students')
              .select('id')
              .eq('parent_id', parent.id);

            if (!cancelled) {
              setProfile({
                id: parent.id,
                name: parent.full_name,
                email: parent.email,
                phone: parent.phone_number,
                linkedStudentIds: (childrenRows ?? []).map((r) => r.id),
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching role profile:', err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, role, realUser]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('Session check warning:', error.message);
        if (
          error.message.toLowerCase().includes('refresh token') ||
          error.message.toLowerCase().includes('invalid_grant') ||
          error.message.toLowerCase().includes('session')
        ) {
          supabase.auth.signOut().catch(() => {});
          if (typeof window !== 'undefined') {
            try {
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                  localStorage.removeItem(key);
                }
              }
            } catch {}
          }
        }
      }
      setSession(session);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession((prev) => (prev === session ? prev : session));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    clearMasterAdminFlag();
    setMasterAdmin(false);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  const isAdmin = useCallback(() => role === 'admin', [role]);
  const isTeacher = useCallback(() => role === 'teacher', [role]);
  const isParent = useCallback(() => role === 'parent', [role]);

  const combinedLoading = loading || profileLoading;

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      role,
      profile,
      permissions,
      loading: combinedLoading,
      isMasterAdmin: !realUser,
      signOut,
      isAdmin,
      isTeacher,
      isParent,
    }),
    [session, user, role, profile, permissions, combinedLoading, realUser, signOut, isAdmin, isTeacher, isParent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
