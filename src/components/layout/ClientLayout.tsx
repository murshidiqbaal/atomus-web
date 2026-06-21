'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QueryProvider from '@/providers/QueryProvider';
import { useAuth, ROLE_HOME, AppRole } from '@/providers/AuthProvider';
import { PermissionProvider, usePermissions } from '@/features/staff-access/hooks/usePermissions';
import {
  LayoutDashboard, Users, UserCircle, GraduationCap, BookOpen,
  BookMarked, CalendarCheck, FileSpreadsheet, CreditCard, Megaphone,
  BarChart3, Settings, Menu, X, Bell, Search, ChevronDown,
  LogOut, Calculator, Award, Timer, QrCode, Shield
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: any; roles?: Exclude<AppRole, null>[] };

const navItems: readonly NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/students', label: 'Students', icon: Users, roles: ['admin', 'staff'] },
  { href: '/parents', label: 'Parents', icon: UserCircle, roles: ['admin', 'staff'] },
  { href: '/teachers', label: 'Teachers', icon: GraduationCap, roles: ['admin', 'staff'] },
  { href: '/courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'staff'] },
  { href: '/subjects', label: 'Subjects', icon: BookMarked, roles: ['admin', 'staff'] },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'staff'] },
  { href: '/teacher-attendance', label: 'Teacher Attendance', icon: Timer, roles: ['admin', 'staff'] },
  { href: '/marks', label: 'Marks', icon: FileSpreadsheet, roles: ['admin', 'staff'] },
  { href: '/fees', label: 'Fees', icon: CreditCard, roles: ['admin'] },
  { href: '/payment-qr', label: 'Payment QR', icon: QrCode, roles: ['admin'] },
  { href: '/expenses', label: 'Expenses', icon: Calculator, roles: ['admin'] },
  { href: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'staff'] },
  { href: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'staff'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  { href: '/performance', label: 'Performance', icon: Award, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  { href: '/teacher-dashboard', label: 'My Classes', icon: LayoutDashboard, roles: ['teacher'] },
  { href: '/parent-dashboard', label: 'My Children', icon: LayoutDashboard, roles: ['parent'] },
];

const staffNavItems: readonly NavItem[] = [
  { href: '/admin/staff', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
  { href: '/admin/staff/accounts', label: 'Staff Accounts', icon: Users, roles: ['admin', 'staff'] },
  { href: '/admin/staff/permissions', label: 'Roles & Permissions', icon: Shield, roles: ['admin', 'staff'] },
  { href: '/admin/staff/logs', label: 'Activity Logs', icon: FileSpreadsheet, roles: ['admin', 'staff'] },
];

const ROUTE_TO_MODULE: Record<string, string> = {
  '/admin': 'Dashboard',
  '/students': 'Students',
  '/parents': 'Parents',
  '/teachers': 'Teachers',
  '/courses': 'Courses',
  '/subjects': 'Subjects',
  '/attendance': 'Attendance',
  '/teacher-attendance': 'Attendance',
  '/marks': 'Marks',
  '/fees': 'Fees',
  '/payment-qr': 'Fees',
  '/expenses': 'Expenses',
  '/announcements': 'Announcements',
  '/notifications': 'Announcements',
  '/reports': 'Reports',
  '/performance': 'Reports',
  '/settings': 'Settings',
  '/admin/staff': 'Staff Access',
};

function getModuleForPath(path: string): string | null {
  for (const [route, module] of Object.entries(ROUTE_TO_MODULE)) {
    if (path === route || path.startsWith(route + '/')) {
      return module;
    }
  }
  return null;
}

const ROLE_PATH_RULES: { prefix: string; allow: Exclude<AppRole, null>[] }[] = [
  { prefix: '/admin', allow: ['admin', 'staff'] }, // allow staff to access admin prefix for staff sub-routes
  { prefix: '/students', allow: ['admin', 'staff'] },
  { prefix: '/parents', allow: ['admin', 'staff'] },
  { prefix: '/teachers', allow: ['admin', 'staff'] },
  { prefix: '/courses', allow: ['admin', 'staff'] },
  { prefix: '/subjects', allow: ['admin', 'staff'] },
  { prefix: '/attendance', allow: ['admin', 'staff'] },
  { prefix: '/teacher-attendance', allow: ['admin', 'staff'] },
  { prefix: '/marks', allow: ['admin', 'staff'] },
  { prefix: '/fees', allow: ['admin', 'staff'] }, // allow staff to access fees (gated by RLS/Permissions)
  { prefix: '/payment-qr', allow: ['admin'] },
  { prefix: '/expenses', allow: ['admin', 'staff'] }, // allow staff to access expenses (gated)
  { prefix: '/announcements', allow: ['admin', 'staff'] },
  { prefix: '/reports', allow: ['admin', 'staff'] }, // allow staff to access reports (gated)
  { prefix: '/settings', allow: ['admin', 'teacher', 'parent', 'staff'] },
  { prefix: '/teacher-dashboard', allow: ['teacher', 'admin'] },
  { prefix: '/parent-dashboard', allow: ['parent', 'admin'] },
];

function isPathAllowed(pathname: string, role: Exclude<AppRole, null>): boolean {
  const rule = ROLE_PATH_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));
  if (!rule) return true; // unknown routes default to allowed (admin shell shows them)
  return rule.allow.includes(role);
}

function getStaffHomeRoute(permissions: any): string {
  for (const item of navItems) {
    const module = ROUTE_TO_MODULE[item.href];
    if (module && permissions?.[module]?.view) {
      return item.href;
    }
  }
  for (const item of staffNavItems) {
    const module = ROUTE_TO_MODULE[item.href];
    if (module && permissions?.[module]?.view) {
      return item.href;
    }
  }
  return '/403';
}

function isItemActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

const SidebarItem = React.memo(function SidebarItem({
  href, label, icon: Icon, active, onClick
}: {
  href: string; label: string; icon: any; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold group
        ${active
          ? 'bg-white/15 text-white shadow-sm border border-white/10'
          : 'text-white/55 hover:text-white hover:bg-white/8'
        }
      `}
    >
      <Icon
        size={17}
        className={active ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-white/70 transition-colors'}
      />
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
    </Link>
  );
});

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, user, role, loading, signOut, profile } = useAuth();
  const { permissions, loading: permsLoading } = usePermissions();
  const authed = !!session || !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Initialize sidebar state based on screen size and localStorage
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    const stored = localStorage.getItem('sidebar_open');
    const targetState = stored !== null ? stored === 'true' : isDesktop;
    
    const timer = setTimeout(() => {
      setSidebarOpen(targetState);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const isPublicPage = pathname === '/login' || pathname === '/forgot-password' || pathname.startsWith('/reset-password');

  // Route protection + role-based gating
  React.useEffect(() => {
    if (loading || permsLoading) return;

    if (!authed && !isPublicPage) {
      router.replace('/login');
      return;
    }
    if (authed && isPublicPage) {
      const home = role === 'staff' ? getStaffHomeRoute(permissions) : (role ? ROLE_HOME[role] : '/admin');
      router.replace(home);
      return;
    }

    if (authed && role) {
      if (profile?.mustChangePassword && pathname !== '/change-password') {
        router.replace('/change-password');
        return;
      }
      if (role === 'staff') {
        const module = getModuleForPath(pathname);
        if (module && (!permissions || !permissions[module]?.view)) {
          if (pathname === '/admin') {
            const allowedRoute = getStaffHomeRoute(permissions);
            router.replace(allowedRoute);
            return;
          }
          router.replace('/403');
          return;
        }
      }
      if (!isPathAllowed(pathname, role)) {
        const home = role === 'staff' ? getStaffHomeRoute(permissions) : ROLE_HOME[role];
        router.replace(home);
      }
    }
  }, [authed, role, loading, permsLoading, permissions, isPublicPage, pathname, router, profile]);

  // Global Ctrl+Shift+A navigation shortcut to admin panel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        router.push('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Stable callbacks so memoized SidebarItem children don't re-render on
  // every parent render
  const closeSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => {
      const next = !v;
      if (window.innerWidth >= 1024) {
        localStorage.setItem('sidebar_open', String(next));
      }
      return next;
    });
  }, []);
  const toggleProfile = useCallback(() => setProfileOpen((v) => !v), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const handleSignOut = useCallback(() => {
    setProfileOpen(false);
    signOut();
  }, [signOut]);

  const sidebarNav = useMemo(() => {
    // Filter standard navigation items
    const mainFiltered = navItems
      .filter((item) => {
        if (item.roles && (!role || !item.roles.includes(role))) return false;
        if (role === 'staff') {
          const module = ROUTE_TO_MODULE[item.href];
          if (module && (!permissions || !permissions[module]?.view)) return false;
        }
        return true;
      })
      .map((item) => (
        <SidebarItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isItemActive(item.href, pathname)}
          onClick={closeSidebar}
        />
      ));

    // Filter staff sub-navigation items
    const hasStaffAccess = role === 'admin' || (role === 'staff' && permissions?.['Staff Access']?.view);
    const staffFiltered = hasStaffAccess
      ? staffNavItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isItemActive(item.href, pathname)}
            onClick={closeSidebar}
          />
        ))
      : [];

    return (
      <div className="space-y-4">
        <div className="space-y-0.5">{mainFiltered}</div>
        {staffFiltered.length > 0 && (
          <div className="space-y-1">
            <div className="pt-4 px-3 mb-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              Staff Access
            </div>
            <div className="space-y-0.5">{staffFiltered}</div>
          </div>
        )}
      </div>
    );
  }, [pathname, role, permissions, closeSidebar]);

  if (loading || permsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0B3C5D]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublicPage) return <>{children}</>;
  if (!authed) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 bg-[#0B3C5D] flex flex-col h-screen shrink-0
        transition-all duration-300 ease-in-out
        ${sidebarOpen 
          ? 'w-[260px] translate-x-0' 
          : 'w-[260px] -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden'
        }
      `}>
        <div className="w-[260px] flex flex-col h-screen shrink-0">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4AF37] p-2 rounded-xl shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17L12 22L22 17" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-black text-lg tracking-tight leading-none">ATOMUS</h1>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">.edu Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 pb-6 space-y-0.5 overflow-y-auto scrollbar-thin">
            {sidebarNav}
          </nav>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shrink-0 z-20">
          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search students, parents, fees..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={toggleProfile}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-[#0B3C5D] text-white text-[10px] font-black flex items-center justify-center">
                  {role === 'teacher' ? 'TC' : role === 'parent' ? 'PR' : role === 'staff' ? 'ST' : 'AD'}
                </div>
                <span className="hidden sm:block capitalize">{role ?? 'Admin'}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{role === 'staff' ? 'Staff Member' : 'Admin User'}</p>
                    <p className="text-xs text-slate-400">{role === 'staff' ? 'Coaching Center Staff' : 'Super Admin'}</p>
                  </div>
                  <div className="p-2">
                    {role !== 'staff' && (
                      <Link href="/settings" onClick={closeProfile} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <Settings size={15} />
                        Settings
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <QueryProvider>{children}</QueryProvider>
        </main>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </PermissionProvider>
  );
}
