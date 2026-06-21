"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) {
      setError("Please enter your username or email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request password reset.");
      }

      setSuccess(data.message || "A secure password reset link has been sent to your email.");
      setUsernameOrEmail("");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3C5D] flex items-center justify-center p-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/80 p-8 text-center text-white relative">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#D4AF37] text-[#0B3C5D] rounded-2xl mb-4 shadow-lg">
              <KeyRound size={26} />
            </div>
            <h1 className="font-black text-2xl tracking-tight leading-none uppercase">Forgot Password</h1>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-2">
              Recover Admin / Staff Access
            </p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-slate-800 font-black text-lg">Check Your Email</h3>
                  <p className="text-slate-500 font-semibold text-xs leading-relaxed">
                    {success}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full bg-[#0B3C5D] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#0B3C5D]/95 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-slate-400 font-semibold text-xs leading-relaxed mb-4">
                  Enter your registered username or email address below. We'll verify your account and send a secure password reset link.
                </p>

                {error && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-normal">{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Username or Email Address
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your username or email"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-bold text-[#0B3C5D]"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0B3C5D] text-white py-3.5 rounded-xl font-black text-xs hover:bg-[#0B3C5D]/90 transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
