'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QueryProvider from '@/providers/QueryProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  LayoutDashboard, Users, UserCircle, GraduationCap, BookOpen,
  BookMarked, CalendarCheck, FileSpreadsheet, CreditCard, Megaphone,
  BarChart3, Settings, Menu, X, Bell, Search, ChevronDown,
  LogOut, Calculator
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: any };

const navItems: readonly NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/parents', label: 'Parents', icon: UserCircle },
  { href: '/teachers', label: 'Teachers', icon: GraduationCap },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/subjects', label: 'Subjects', icon: BookMarked },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/marks', label: 'Marks', icon: FileSpreadsheet },
  { href: '/fees', label: 'Fees', icon: CreditCard },
  { href: '/expenses', label: 'Expenses', icon: Calculator },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  // Route protection
  React.useEffect(() => {
    if (loading) return;
    if (!session && !isLoginPage) {
      router.push('/login');
    } else if (session && isLoginPage) {
      router.push('/admin');
    }
  }, [session, loading, isLoginPage, router]);

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
  // every parent render (e.g. when the profile dropdown toggles).
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const toggleProfile = useCallback(() => setProfileOpen((v) => !v), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const handleSignOut = useCallback(() => {
    setProfileOpen(false);
    signOut();
  }, [signOut]);

  const sidebarNav = useMemo(
    () => navItems.map((item) => (
      <SidebarItem
        key={item.href}
        href={item.href}
        label={item.label}
        icon={item.icon}
        active={isItemActive(item.href, pathname)}
        onClick={closeSidebar}
      />
    )),
    [pathname, closeSidebar],
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0B3C5D]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;
  if (!session) return null; // Prevent flash of content

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
        fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-[#0B3C5D] flex flex-col h-screen shrink-0
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
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
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shrink-0 z-20">
          {/* Mobile Hamburger */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
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
                  AD
                </div>
                <span className="hidden sm:block">Admin</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Admin User</p>
                    <p className="text-xs text-slate-400">Super Admin</p>
                  </div>
                  <div className="p-2">
                    <Link href="/settings" onClick={closeProfile} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                      <Settings size={15} />
                      Settings
                    </Link>
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
