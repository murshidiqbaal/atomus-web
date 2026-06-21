"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Check, X, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Redirect countdown
  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Hard reload to refresh profile context
          window.location.href = "/admin";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success]);

  // Password strength checklist
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    different: currentPassword !== password && password.length > 0,
    match: password === confirmPassword && confirmPassword.length > 0
  };

  const isFormValid = currentPassword.length > 0 && Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword: password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change password. Please verify your current password.");
      setSubmitting(false);
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="#0B3C5D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-black text-2xl tracking-tight leading-none uppercase">Change Password</h1>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-2">
              Update password for security
            </p>
          </div>

          <div className="p-8">
            {profile?.mustChangePassword && !success && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs font-semibold leading-normal">
                  <strong>Password Change Required:</strong> For security purposes, you must change your password before you can proceed to the dashboard.
                </p>
              </div>
            )}

            {success ? (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-slate-800 font-black text-lg">Password Changed Successfully</h3>
                  <p className="text-slate-400 font-semibold text-xs leading-relaxed">
                    Your password has been changed. You will be redirected to the dashboard in <strong className="text-[#0B3C5D]">{countdown} seconds</strong>...
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-1000"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {errorMsg && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-normal">{errorMsg}</p>
                  </div>
                )}

                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showCurrentPass ? "text" : "password"}
                      placeholder="Enter current password"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-bold text-[#0B3C5D]"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPass ? "text" : "password"}
                      placeholder="Enter new password"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-bold text-[#0B3C5D]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all font-bold text-[#0B3C5D]"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Criteria List */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Password Security Checklist:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <div className={`flex items-center gap-1.5 ${criteria.length ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.length ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.uppercase ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.uppercase ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Uppercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.lowercase ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.lowercase ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Lowercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.number ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.number ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Number (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.special ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.special ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Special character
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.different ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.different ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Different from current
                    </div>
                    <div className={`flex items-center gap-1.5 ${criteria.match ? "text-emerald-600" : "text-slate-400"}`}>
                      {criteria.match ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 text-slate-300" />}
                      Passwords match
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className="w-full bg-[#0B3C5D] text-white py-3.5 rounded-xl font-black text-xs hover:bg-[#0B3C5D]/90 transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  Sign Out
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
