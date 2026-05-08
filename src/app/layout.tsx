import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

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
        <aside className="w-[240px] bg-surface border-r border-border shrink-0 flex flex-col h-screen sticky top-0 shadow-[4px_0_20px_rgba(11,60,93,0.02)] z-10">
          <div className="p-6 border-b border-border">
            <h1 className="text-primary font-bold text-xl tracking-tight">Tuition Admin</h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link href="/" className="block px-4 py-2.5 rounded-lg text-primary bg-primary/5 hover:bg-primary/10 transition-colors font-medium text-sm">
              Dashboard
            </Link>
            <Link href="/attendance" className="block px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-colors font-medium text-sm">
              Attendance
            </Link>
            <Link href="/students" className="block px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-colors font-medium text-sm">
              Students
            </Link>
            <Link href="/marks" className="block px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-colors font-medium text-sm">
              Marks Management
            </Link>
          </nav>
        </aside>
        <main className="flex-1 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
