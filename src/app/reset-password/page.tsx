"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Check, X, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Check token validity on mount
  useEffect(() => {
    if (!token) {
      setTokenError("Missing reset token. Please request a new password recovery link.");
      setVerifying(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch("/api/auth/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setTokenError(data.error || "This reset token is invalid or has expired.");
        } else {
          setEmail(data.email);
        }
      } catch (err) {
        setTokenError("Unable to verify reset token. Please try again.");
      } finally {
        setVerifying(false);
      }
    }

    checkToken();
  }, [token]);

  // Countdown redirect effect
  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, router]);

  // Strength validation
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0
  };

  const isFormValid = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/auth/reset-password-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while resetting your password.");
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center justify-center text-center max-w-sm w-full border border-slate-100">
        <Loader2 size={36} className="animate-spin text-[#0B3C5D] mb-4" />
        <h2 className="text-[#0B3C5D] font-black text-lg">Verifying Recovery Link</h2>
        <p className="text-slate-400 font-semibold text-xs mt-1 leading-relaxed">
          Retrieving secure authentication tokens from database...
        </p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-100">
        <div className="bg-rose-500 p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl mb-3">
            <AlertCircle size={24} />
          </div>
          <h2 className="font-black text-xl tracking-tight uppercase leading-none">Link Invalid</h2>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mt-1.5">
            Password Recovery Error
          </p>
        </div>
        <div className="p-8 text-center space-y-6">
          <p className="text-slate-500 font-semibold text-xs leading-relaxed">
            {tokenError}
          </p>
          <button
            onClick={() => router.push("/forgot-password")}
            className="w-full bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/80 p-8 text-center text-white relative">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#D4AF37] text-[#0B3C5D] rounded-2xl mb-4 shadow-lg">
          <ShieldCheck size={26} />
        </div>
        <h1 className="font-black text-2xl tracking-tight leading-none uppercase">Reset Password</h1>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-2">
          Update account password safely
        </p>
      </div>

      <div className="p-8">
        {success ? (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-slate-800 font-black text-lg">Password Updated Successfully</h3>
              <p className="text-slate-400 font-semibold text-xs leading-relaxed">
                Your password has been changed. You will be redirected to the login page in <strong className="text-[#0B3C5D]">{countdown} seconds</strong>...
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
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-500">
              Recovering account for: <span className="text-[#0B3C5D] font-bold">{email}</span>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-normal">{submitError}</p>
              </div>
            )}

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
                  Minimum 8 characters
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
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0B3C5D] flex items-center justify-center p-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/10 translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full flex justify-center">
        <Suspense fallback={
          <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center justify-center text-center max-w-sm w-full border border-slate-100">
            <Loader2 size={36} className="animate-spin text-[#0B3C5D] mb-4" />
            <h2 className="text-[#0B3C5D] font-black text-lg">Loading Page</h2>
            <p className="text-slate-400 font-semibold text-xs mt-1">Please wait...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
