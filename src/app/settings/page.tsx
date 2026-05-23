"use client";

import React, { useState } from "react";
import {
  Settings, Shield, Bell, Palette, Database, Key,
  Save, Eye, EyeOff, CheckCircle2, RefreshCw, Globe,
  Plus, Trash2, MapPin, ToggleLeft, ToggleRight, Edit2
} from "lucide-react";
import { campusRepository } from "@/lib/repositories/campus_repository";
import { Campus } from "@/lib/types";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "campuses", label: "Campuses", icon: Globe },
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
          {activeTab === "campuses" && <CampusesSettings />}
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

function CampusesSettings() {
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  
  // Form state for new campus
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  
  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");

  const loadCampuses = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await campusRepository.getCampuses();
      setCampuses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load campuses");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCampuses();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setError("");
      await campusRepository.addCampus({
        name: name.trim(),
        location: location.trim() || null,
        isActive: true
      });
      setName("");
      setLocation("");
      await loadCampuses();
    } catch (err: any) {
      setError(err.message || "Failed to add campus");
    }
  };

  const handleToggleActive = async (campus: Campus) => {
    try {
      setError("");
      await campusRepository.updateCampus(campus.id, {
        isActive: !campus.isActive
      });
      await loadCampuses();
    } catch (err: any) {
      setError(err.message || "Failed to update campus status");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setError("");
      await campusRepository.updateCampus(id, {
        name: editName.trim(),
        location: editLocation.trim() || null
      });
      setEditingId(null);
      await loadCampuses();
    } catch (err: any) {
      setError(err.message || "Failed to update campus");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campus? This may affect linked courses, batches and students.")) return;
    try {
      setError("");
      await campusRepository.deleteCampus(id);
      await loadCampuses();
    } catch (err: any) {
      setError(err.message || "Failed to delete campus");
    }
  };

  const startEdit = (campus: Campus) => {
    setEditingId(campus.id);
    setEditName(campus.name);
    setEditLocation(campus.location || "");
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Add Campus Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#0B3C5D] text-base">Add New Campus</h3>
            <p className="text-xs text-slate-400 mt-0.5">Register a new physical branch or tuition centre campus</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5 col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campus Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Piravom Campus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0B3C5D]"
            />
          </div>
          <div className="space-y-1.5 col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location / City</label>
            <input
              type="text"
              placeholder="e.g. Ernakulam, Kerala"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#0B3C5D]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0B3C5D] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-md flex items-center justify-center gap-2 h-[38px]"
          >
            <Plus size={16} />
            Create Campus
          </button>
        </form>
      </div>

      {/* Campus List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-[#0B3C5D] text-base">Registered Campuses</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage existing branches and branches status</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-slate-400" size={24} />
            </div>
          ) : campuses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No campuses registered yet. Use the form above to add your first campus.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campuses.map((campus) => (
                <div
                  key={campus.id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                    campus.isActive ? "border-slate-200 bg-slate-50/30" : "border-slate-100 bg-slate-50/10 opacity-70"
                  }`}
                >
                  {editingId === campus.id ? (
                    <div className="space-y-3 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm outline-none font-bold text-[#0B3C5D]"
                      />
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none text-slate-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(campus.id)}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-slate-800 text-sm">{campus.name}</h4>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                            campus.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {campus.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      {campus.location && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{campus.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(campus)}
                        title={campus.isActive ? "Deactivate Campus" : "Activate Campus"}
                        className="text-slate-400 hover:text-[#0B3C5D] p-1.5 rounded-lg transition-colors"
                      >
                        {campus.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                      </button>
                      
                      {editingId !== campus.id && (
                        <button
                          onClick={() => startEdit(campus)}
                          title="Edit Campus"
                          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(campus.id)}
                      title="Delete Campus"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
