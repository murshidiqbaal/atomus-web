import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ATOMUS.edu — Admin Dashboard",
  description: "ATOMUS Coaching Centre — Tuition Management ERP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#F5F7FA] text-[#1F2937] antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
