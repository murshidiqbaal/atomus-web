import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

function SidebarItem({ href, label, icon, active = false }: { href: string, label: string, icon: keyof typeof LucideIcons, active?: boolean }) {
  const Icon = LucideIcons[icon] as any;
  return (
    <Link href={href} className={`
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm
      ${active ? 'bg-white/10 text-white border border-white/10 shadow-lg shadow-black/5' : 'text-white/60 hover:text-white hover:bg-white/5'}
    `}>
      <Icon size={18} className={active ? 'text-accent' : ''} />
      {label}
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Tuition Management Admin Dashboard",
  description: "Tuition Management Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="flex min-h-screen bg-background text-foreground antialiased">
        <aside className="w-[280px] bg-primary border-r border-white/10 shrink-0 flex flex-col h-screen sticky top-0 z-10">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-2 rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0B3C5D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="#0B3C5D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="#0B3C5D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-white font-black text-2xl tracking-tighter">ATOMUS</h1>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            <SidebarItem href="/" label="Dashboard" icon="LayoutDashboard" active />
            <SidebarItem href="/students" label="Students" icon="Users" />
            <SidebarItem href="/parents" label="Parents" icon="UserCircle" />
            <SidebarItem href="/courses" label="Courses" icon="BookOpen" />
            <SidebarItem href="/batches" label="Batches" icon="Layers" />
            <SidebarItem href="/attendance" label="Attendance" icon="CalendarCheck" />
            <SidebarItem href="/marks" label="Marks" icon="FileSpreadsheet" />
            <SidebarItem href="/fees" label="Fees" icon="CreditCard" />
            <SidebarItem href="/reports" label="Reports" icon="BarChart3" />
            <SidebarItem href="/settings" label="Settings" icon="Settings" />
          </nav>

          <div className="p-6 mt-auto">
            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-primary text-xs">AD</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">Admin User</p>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Super Admin</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
