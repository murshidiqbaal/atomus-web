"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ROLE_HOME } from "@/providers/AuthProvider";

export default function UnauthorizedPage() {
  const { role } = useAuth();
  const homePath = role ? ROLE_HOME[role] : "/login";

  return (
    <div className="min-h-screen bg-[#0B3C5D] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center space-y-6 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">
            403 <span className="text-[#D4AF37]">Unauthorized</span>
          </h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed">
            You do not have permission to access this page. Please contact the administrator if you believe this is an error.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={homePath}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0B3C5D] font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-yellow-900/10 active:scale-95 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Safety
          </Link>
        </div>
      </div>
    </div>
  );
}
