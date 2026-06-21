"use client";

import React, { useState } from "react";
import { Eye, EyeOff, LogIn, AlertCircle, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { matchesMasterAdmin, setMasterAdminFlag } from "@/lib/auth/master_admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Run pre-login check (lockout, username resolving)
      const preRes = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: email })
      });
      const preData = await preRes.json();
      if (!preRes.ok || preData.error) {
        setError(preData.error || "Login check failed");
        setLoading(false);
        return;
      }

      const resolvedEmail = preData.email || email;

      // 2. Perform Supabase authentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password
      });

      if (authError) {
        // Fallback for local testing / master-admin
        if (matchesMasterAdmin(email, password)) {
          setMasterAdminFlag();
          window.location.href = "/admin";
          return;
        }

        // 3. Register failed attempt in db
        const failRes = await fetch("/api/auth/login-failed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameOrEmail: email })
        });
        const failData = await failRes.json();
        
        setError(failData.message || authError.message);
        setLoading(false);
      } else {
        // 4. Register login success and check force password change
        const successRes = await fetch("/api/auth/login-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameOrEmail: email })
        });
        const successData = await successRes.json();

        if (successData.must_change_password) {
          router.push("/change-password");
        } else {
          router.push("/admin");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3C5D] flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/80 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D4AF37] rounded-2xl mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-white font-black text-3xl tracking-tight">ATOMUS<span className="text-[#D4AF37]">.edu</span></h1>
            <p className="text-white/60 text-sm mt-1 font-medium">Admin Control Panel</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <h2 className="text-xl font-black text-[#0B3C5D] mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in to access the admin dashboard.</p>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username or Email Address</label>
                <input
                  required
                  type="text"
                  placeholder="admin@atomus.edu or username"
                  autoComplete="username"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-xs font-bold text-[#D4AF37] hover:text-[#0B3C5D] hover:underline transition-colors mt-1"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B3C5D] text-white py-3.5 rounded-xl font-black text-sm hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="bg-[#D4AF37]/10 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Parent App Login</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Parents log in to the <strong>ATOMUS Flutter App</strong> using their <strong>phone number</strong> as username and the auto-generated password (<code className="bg-slate-100 px-1 rounded text-[#0B3C5D] font-mono">First3LettersOfStudent + Last5DigitsOfPhone</code>).
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs font-medium mt-6">
          © 2026 ATOMUS.edu Coaching Centre. All rights reserved.
        </p>
      </div>
    </div>
  );
}
