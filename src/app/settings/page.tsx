"use client";

import React, { useState } from "react";
import {
  Settings, Shield, Bell, Palette, Database, Key,
  Save, Eye, EyeOff, CheckCircle2, RefreshCw, Globe
} from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "database", label: "Database", icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Settings</h1>
        <p className="text-slate-500 font-medium mt-1">Configure the ATOMUS.edu admin dashboard.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <nav className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all border-b border-slate-100 last:border-0 ${
                  activeTab === tab.id
                    ? "bg-[#0B3C5D] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "general" && <GeneralSettings onSave={handleSave} />}
          {activeTab === "security" && <SecuritySettings onSave={handleSave} />}
          {activeTab === "notifications" && <NotificationSettings onSave={handleSave} />}
          {activeTab === "appearance" && <AppearanceSettings onSave={handleSave} />}
          {activeTab === "database" && <DatabaseSettings />}
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 size={18} />
          Settings saved!
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-[#0B3C5D] text-base">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      <div className="sm:w-48 shrink-0">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function GeneralSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Institution Info" desc="Basic details about your coaching centre">
        <FieldRow label="Centre Name" hint="Displayed in header and reports">
          <input defaultValue="ATOMUS.edu Coaching Centre"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10" />
        </FieldRow>
        <FieldRow label="Contact Email">
          <input defaultValue="admin@atomus.edu" type="email"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10" />
        </FieldRow>
        <FieldRow label="Contact Phone">
          <input defaultValue="+92 300 1234567" type="tel"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10" />
        </FieldRow>
        <FieldRow label="Address">
          <textarea defaultValue="123 Education Street, Karachi, Pakistan" rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 resize-none" />
        </FieldRow>
        <FieldRow label="Academic Year">
          <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] bg-white">
            <option>2026 – 2027</option>
            <option>2025 – 2026</option>
          </select>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Fee Currency" desc="Currency used across fee records and reports">
        <FieldRow label="Currency Symbol">
          <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] bg-white">
            <option>₹ — Indian Rupee (INR)</option>
            <option>PKR — Pakistani Rupee</option>
            <option>$ — US Dollar (USD)</option>
            <option>AED — UAE Dirham</option>
          </select>
        </FieldRow>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={onSave} className="flex items-center gap-2 bg-[#0B3C5D] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SecuritySettings({ onSave }: { onSave: () => void }) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard title="Admin Password" desc="Update your admin login password">
        <FieldRow label="Current Password">
          <div className="relative">
            <input type={showPwd ? "text" : "password"} placeholder="Enter current password"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 pr-12" />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FieldRow>
        <FieldRow label="New Password">
          <input type="password" placeholder="Minimum 8 characters"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10" />
        </FieldRow>
        <FieldRow label="Confirm New Password">
          <input type="password" placeholder="Repeat new password"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Parent Password Policy" desc="Default format for parent account passwords">
        <div className="bg-[#0B3C5D]/5 rounded-xl p-4 border border-[#0B3C5D]/10 space-y-2">
          <p className="text-sm font-bold text-[#0B3C5D]">Current Formula:</p>
          <code className="block text-sm font-mono text-[#D4AF37] bg-white border border-slate-200 px-4 py-2 rounded-xl">
            First 3 letters of Student Name + Last 5 digits of Parent Phone
          </code>
          <p className="text-xs text-slate-500">
            Example: Student "Zainab Ahmed", Phone "923001234567" → Password: <strong>Zai34567</strong>
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Role-Based Access" desc="Access levels for each role">
        {[
          { role: "Admin", perms: ["Full access", "User management", "Reports", "Settings"], color: "text-[#0B3C5D]", bg: "bg-blue-50" },
          { role: "Teacher", perms: ["Attendance entry", "Marks entry", "View own batches"], color: "text-emerald-700", bg: "bg-emerald-50" },
          { role: "Parent", perms: ["View student progress", "Attendance history", "Fee status", "Announcements"], color: "text-purple-700", bg: "bg-purple-50" },
        ].map(r => (
          <FieldRow key={r.role} label={r.role}>
            <div className={`${r.bg} rounded-xl p-3 flex flex-wrap gap-2`}>
              {r.perms.map(p => (
                <span key={p} className={`px-2.5 py-1 bg-white rounded-lg text-[11px] font-bold ${r.color} border border-white shadow-sm`}>{p}</span>
              ))}
            </div>
          </FieldRow>
        ))}
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={onSave} className="flex items-center gap-2 bg-[#0B3C5D] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function NotificationSettings({ onSave }: { onSave: () => void }) {
  const [settings, setSettings] = useState({
    feeReminders: true,
    attendanceAlerts: true,
    examNotifications: true,
    parentCredentials: true,
    weeklyReports: false,
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Email Notifications" desc="Configure when to send automated emails">
        {[
          { key: "feeReminders", label: "Fee Due Reminders", hint: "Notify parents when fees are overdue" },
          { key: "attendanceAlerts", label: "Low Attendance Alerts", hint: "Alert parents when attendance drops below 75%" },
          { key: "examNotifications", label: "Exam Notifications", hint: "Notify students and parents before exams" },
          { key: "parentCredentials", label: "New Account Credentials", hint: "Email login details when a parent account is created" },
          { key: "weeklyReports", label: "Weekly Summary Reports", hint: "Send admin a weekly dashboard summary" },
        ].map(item => (
          <FieldRow key={item.key} label={item.label} hint={item.hint}>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer"
                checked={settings[item.key as keyof typeof settings]}
                onChange={e => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-[#0B3C5D]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B3C5D]" />
            </label>
          </FieldRow>
        ))}
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={onSave} className="flex items-center gap-2 bg-[#0B3C5D] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Brand Colors" desc="Primary theme colors used across the dashboard">
        <FieldRow label="Primary Color" hint="Sidebar and main headings">
          <div className="flex items-center gap-3">
            <input type="color" defaultValue="#0B3C5D" className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-1" />
            <input defaultValue="#0B3C5D" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono" />
          </div>
        </FieldRow>
        <FieldRow label="Accent Color" hint="Highlights and action buttons">
          <div className="flex items-center gap-3">
            <input type="color" defaultValue="#D4AF37" className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-1" />
            <input defaultValue="#D4AF37" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono" />
          </div>
        </FieldRow>
        <FieldRow label="Background Color">
          <div className="flex items-center gap-3">
            <input type="color" defaultValue="#F5F7FA" className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-1" />
            <input defaultValue="#F5F7FA" className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono" />
          </div>
        </FieldRow>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={onSave} className="flex items-center gap-2 bg-[#0B3C5D] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200">
          <Save size={16} />
          Save Appearance
        </button>
      </div>
    </div>
  );
}

function DatabaseSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Supabase Connection" desc="Database and authentication provider configuration">
        <FieldRow label="Supabase URL">
          <input defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || "https://txtvvlxaurqovghtngzm.supabase.co"}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono text-slate-600 bg-slate-50" readOnly />
        </FieldRow>
        <FieldRow label="Anon Key" hint="Public anonymous key (read-only display)">
          <input type="password" defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono bg-slate-50" readOnly />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Edge Functions" desc="Supabase Edge Functions for email delivery">
        <div className="space-y-3">
          {[
            { name: "send-parent-credentials", status: "Deploy Required", desc: "Sends parent login credentials to Gmail" },
            { name: "send-teacher-credentials", status: "Deploy Required", desc: "Sends teacher account details" },
            { name: "send-fee-reminder", status: "Deploy Required", desc: "Sends fee due reminders to parents" },
          ].map(fn => (
            <div key={fn.name} className="flex items-start justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div>
                <code className="text-sm font-mono font-bold text-[#0B3C5D]">{fn.name}</code>
                <p className="text-xs text-slate-400 mt-0.5">{fn.desc}</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                {fn.status}
              </span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Deploy Edge Functions using: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">supabase functions deploy send-parent-credentials</code>
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
