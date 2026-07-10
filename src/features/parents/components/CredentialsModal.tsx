"use client";

import { useState } from "react";
import { X, Copy, Check, Mail, Phone, KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import { ParentCredentials } from "../types";

interface Props {
  credentials: ParentCredentials;
  emailSent?: boolean;
  onClose: () => void;
}

export default function CredentialsModal({ credentials, emailSent, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const loginEmail = credentials.email.toLowerCase();

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function copyAll() {
    const block = `Parent: ${credentials.parentName}
Login ID (email): ${loginEmail}
Phone: ${credentials.phone}
Password: ${credentials.password}`;
    copy("all", block);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/85 px-6 py-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#0B3C5D] flex items-center justify-center">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black tracking-tight">Parent Credentials Generated</h2>
            <p className="text-white/65 text-xs mt-0.5">Save or share these now — password is visible once.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <CredField icon={<Mail size={14} />} label="Login ID (email)" value={loginEmail} copied={copied === "email"} onCopy={() => copy("email", loginEmail)} mono highlight />
          <CredField icon={<Phone size={14} />} label="Phone" value={credentials.phone} copied={copied === "phone"} onCopy={() => copy("phone", credentials.phone)} mono />
          <CredField icon={<KeyRound size={14} />} label="Password" value={credentials.password} copied={copied === "pwd"} onCopy={() => copy("pwd", credentials.password)} mono highlight />

          {!emailSent && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Email delivery is unavailable. Please share these credentials with the parent manually.
              </p>
            </div>
          )}

          {emailSent && (
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
              <Check size={14} /> Credentials emailed to {credentials.email}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={copyAll}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              {copied === "all" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied === "all" ? "Copied" : "Copy All"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#0B3C5D] text-white rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CredField({
  icon, label, value, copied, onCopy, mono, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </label>
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${highlight ? "border-[#D4AF37]/40 bg-[#D4AF37]/5" : "border-slate-200 bg-slate-50"}`}>
        <code className={`flex-1 text-sm break-all ${mono ? "font-mono" : ""} ${highlight ? "text-[#0B3C5D] font-black" : "text-slate-700 font-semibold"}`}>
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-white rounded-lg transition-colors"
          title="Copy"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
