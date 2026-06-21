"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users, Search, Plus, Filter, Edit, Key, ShieldAlert,
  Trash2, Eye, UserCheck, UserX, Copy, RefreshCw, X, EyeOff
} from "lucide-react";
import { staffAccessService } from "@/features/staff-access/services/staff_access_service";
import { StaffAccount, StaffStatus } from "@/features/staff-access/types";
import { useAuth } from "@/providers/AuthProvider";

export default function StaffAccountsPage() {
  const { role, user } = useAuth();
  const isAdminUser = role === "admin"; // Only Super Admin can mutate staff accounts

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<StaffAccount | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [campusId, setCampusId] = useState("");
  const [status, setStatus] = useState<StaffStatus>("Active");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [requireChangeNextLogin, setRequireChangeNextLogin] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [accs, campsData] = await Promise.all([
        staffAccessService.listStaffAccounts(),
        staffAccessService.listStaffAccounts().then(async () => {
          // Fetch campuses
          const { data } = await staffAccessService.listCampuses();
          return data || [];
        })
      ]);
      setAccounts(accs);
      setCampuses(campsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Secure Password Generator
  function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let generated = "";
    // Generate secure password like "Ax9@Lm21Pw"
    // Let's ensure it has at least one uppercase, one lowercase, one number, and one symbol
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()";
    
    generated += uppers[Math.floor(Math.random() * uppers.length)];
    generated += lowers[Math.floor(Math.random() * lowers.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 0; i < 6; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    generated = generated.split('').sort(() => 0.5 - Math.random()).join('');

    setPassword(generated);
    setConfirmPassword(generated);
  }

  function copyPasswordToClipboard() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    alert("Password copied to clipboard!");
  }

  // Handle CRUD submissions
  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName || !username || !email) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      await staffAccessService.createStaffAccount({
        username: username.trim().toLowerCase(),
        password_hash: "", // Will be hashed in service
        password: password,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone || null,
        designation: designation || null,
        campus_id: campusId || null,
        status: status
      });
      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create staff account.");
    }
  }

  async function handleEditStaff(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedAccount) return;

    if (!fullName || !email) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    try {
      await staffAccessService.updateStaffAccount(selectedAccount.id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone || null,
        designation: designation || null,
        campus_id: campusId || null,
        status: status
      });
      setIsEditOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update staff account.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedAccount) return;

    if (!password || password !== confirmPassword) {
      setErrorMsg("Passwords must match and cannot be empty.");
      return;
    }

    try {
      await staffAccessService.updateStaffAccount(selectedAccount.id, {
        password: password,
        must_change_password: requireChangeNextLogin
      });

      if (notifyEmail) {
        console.log(`[NOTIFY PASSWORD RESET] Email: ${selectedAccount.email}, Password: ${password}`);
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "noreply@atomus.edu",
              to: [selectedAccount.email],
              subject: "Your Atomus Account Password Reset",
              html: `<p>Hello ${selectedAccount.full_name},</p><p>An administrator has reset your password. Your new password is: <strong>${password}</strong></p><p>${requireChangeNextLogin ? "You are required to change this password on your next login." : ""}</p>`
            })
          });
        } catch (mailErr) {
          console.warn("Failed to notify user by email:", mailErr);
        }
      }

      await staffAccessService.logActivity(
        selectedAccount.id,
        selectedAccount.full_name,
        "Staff Access",
        "Admin Reset Password",
        `Admin reset password for staff member ${selectedAccount.full_name}. Force change next login: ${requireChangeNextLogin}. Notify email: ${notifyEmail}`
      );

      setIsResetOpen(false);
      resetForm();
      alert("Password successfully reset!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    }
  }

  async function handleForcePasswordChange(account: StaffAccount) {
    const nextVal = !account.must_change_password;
    try {
      await staffAccessService.updateStaffAccount(account.id, {
        must_change_password: nextVal
      });
      await staffAccessService.logActivity(
        account.id,
        account.full_name,
        "Staff Access",
        "Force Password Change",
        `Admin forced password change on next login = ${nextVal}`
      );
      alert(`Force Password Change successfully set to ${nextVal}`);
      loadData();
      if (selectedAccount && selectedAccount.id === account.id) {
        setSelectedAccount(prev => prev ? { ...prev, must_change_password: nextVal } : null);
      }
    } catch (e: any) {
      alert(e.message || "Failed to force password change.");
    }
  }

  async function handleGenerateTempPassword(account: StaffAccount) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let generated = "";
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()";
    generated += uppers[Math.floor(Math.random() * uppers.length)];
    generated += lowers[Math.floor(Math.random() * lowers.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 0; i < 6; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    generated = generated.split('').sort(() => 0.5 - Math.random()).join('');

    try {
      await staffAccessService.updateStaffAccount(account.id, {
        password: generated,
        must_change_password: true
      });
      setTempPassword(generated);
      await staffAccessService.logActivity(
        account.id,
        account.full_name,
        "Staff Access",
        "Temporary Password Generated",
        `Temporary password generated for staff member: ${account.full_name}`
      );
      alert(`Temporary password generated successfully! Copy it from the profile screen.`);
      loadData();
      if (selectedAccount && selectedAccount.id === account.id) {
        setSelectedAccount(prev => prev ? { ...prev, must_change_password: true } : null);
      }
    } catch (e: any) {
      alert(e.message || "Failed to generate temporary password.");
    }
  }

  async function handleUnlockAccount(account: StaffAccount) {
    try {
      await staffAccessService.updateStaffAccount(account.id, {
        failed_login_attempts: 0,
        locked_until: null
      });
      await staffAccessService.logActivity(
        account.id,
        account.full_name,
        "Staff Access",
        "Unlock Account",
        `Admin unlocked staff account for ${account.full_name}`
      );
      alert("Account successfully unlocked!");
      loadData();
      if (selectedAccount && selectedAccount.id === account.id) {
        setSelectedAccount(prev => prev ? { ...prev, failed_login_attempts: 0, locked_until: null } : null);
      }
    } catch (e: any) {
      alert(e.message || "Failed to unlock account.");
    }
  }

  async function handleToggleStatus(account: StaffAccount) {
    if (!isAdminUser) return;
    if (account.username === "superadmin") {
      alert("Cannot disable the Super Admin account.");
      return;
    }
    const nextStatus: StaffStatus = account.status === "Active" ? "Disabled" : "Active";
    try {
      await staffAccessService.updateStaffAccount(account.id, { status: nextStatus });
      loadData();
    } catch (e: any) {
      alert(e.message || "Failed to update status.");
    }
  }

  async function handleDeleteStaff(account: StaffAccount) {
    if (!isAdminUser) return;
    if (account.username === "superadmin" || account.id === "super-admin-id") {
      alert("Cannot delete the Super Admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete staff account for ${account.full_name}? This cannot be undone.`)) {
      return;
    }
    try {
      await staffAccessService.deleteStaffAccount(account.id);
      loadData();
    } catch (e: any) {
      alert(e.message || "Failed to delete account.");
    }
  }

  function openEdit(account: StaffAccount) {
    setSelectedAccount(account);
    setFullName(account.full_name);
    setUsername(account.username);
    setEmail(account.email);
    setPhone(account.phone || "");
    setDesignation(account.designation || "");
    setCampusId(account.campus_id || "");
    setStatus(account.status);
    setIsEditOpen(true);
  }

  function openReset(account: StaffAccount) {
    setSelectedAccount(account);
    setPassword("");
    setConfirmPassword("");
    setIsResetOpen(true);
  }

  function openView(account: StaffAccount) {
    setSelectedAccount(account);
    setIsViewOpen(true);
  }

  function resetForm() {
    setFullName("");
    setUsername("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setCampusId("");
    setStatus("Active");
    setPassword("");
    setConfirmPassword("");
    setShowPass(false);
    setErrorMsg("");
    setSelectedAccount(null);
    setRequireChangeNextLogin(false);
    setNotifyEmail(false);
    setTempPassword("");
  }

  // Filtered Accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.full_name.toLowerCase().includes(search.toLowerCase()) ||
        acc.username.toLowerCase().includes(search.toLowerCase()) ||
        acc.email.toLowerCase().includes(search.toLowerCase()) ||
        (acc.designation || "").toLowerCase().includes(search.toLowerCase());

      const matchesCampus = !selectedCampus || acc.campus_id === selectedCampus;
      const matchesStatus = !selectedStatus || acc.status === selectedStatus;

      return matchesSearch && matchesCampus && matchesStatus;
    });
  }, [accounts, search, selectedCampus, selectedStatus]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D] tracking-tight">Staff Accounts</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Create, manage, and configure access settings for internal administrative staff members.
          </p>
        </div>
        {isAdminUser && (
          <button
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="flex items-center gap-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus size={15} />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search full name, username, email, designation..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-[#0B3C5D] font-medium"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Campus */}
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
          >
            <option value="">All Campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-[#0B3C5D]" />
            <p className="text-xs font-bold">Loading staff accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm font-bold">No staff accounts found.</p>
            <p className="text-xs mt-1 text-slate-400">Try adjusting your search filters or add a new staff member.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-4 w-[60px]">Profile</th>
                  <th className="px-4 py-4">Full Name</th>
                  <th className="px-4 py-4">Username</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Phone</th>
                  <th className="px-4 py-4">Designation</th>
                  <th className="px-4 py-4">Branch/Campus</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4">Last Login</th>
                  <th className="px-4 py-4">Created Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] font-black flex items-center justify-center uppercase border border-[#0B3C5D]/20">
                        {acc.full_name.charAt(0)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{acc.full_name}</td>
                    <td className="px-4 py-3 text-[#0B3C5D] font-bold">@{acc.username}</td>
                    <td className="px-4 py-3">{acc.email}</td>
                    <td className="px-4 py-3">{acc.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] text-slate-700">
                        {acc.designation || "Staff"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{acc.campus?.name || "All Campuses"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(acc)}
                        disabled={!isAdminUser}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[9px] uppercase leading-none border transition-all ${
                          acc.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-rose-50 text-rose-500 border-rose-200"
                        } ${isAdminUser ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default"}`}
                      >
                        {acc.status === "Active" ? <UserCheck size={10} /> : <UserX size={10} />}
                        {acc.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {acc.last_login ? new Date(acc.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(acc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openView(acc)}
                          title="View Profile"
                          className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        {isAdminUser && (
                          <>
                            <button
                              onClick={() => openEdit(acc)}
                              title="Edit"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => openReset(acc)}
                              title="Reset Password"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(acc)}
                              disabled={acc.username === "superadmin"}
                              title="Delete"
                              className={`p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all ${
                                acc.username === "superadmin" ? "opacity-30 cursor-not-allowed" : ""
                              }`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-sm text-[#0B3C5D] uppercase tracking-wider">Create Staff Account</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <ShieldAlert size={14} className="shrink-0" />
                  {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                    placeholder="e.g. jdoe"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. receptionist"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus</label>
                  <select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold cursor-pointer"
                  >
                    <option value="">All Campuses</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StaffStatus)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Password Generator */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-wider">Security Password</span>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] hover:underline"
                  >
                    <RefreshCw size={10} />
                    Generate Secure Password
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setConfirmPassword(e.target.value); }}
                      placeholder="Security password"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-black tracking-wide"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {password && (
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs flex items-center justify-center transition-colors"
                      title="Copy Password"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype password to confirm"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-black"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {isEditOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-sm text-[#0B3C5D] uppercase tracking-wider">Edit Staff Account</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditStaff} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <ShieldAlert size={14} className="shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none text-[#0B3C5D]/50 font-bold cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. receptionist"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus</label>
                  <select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold cursor-pointer"
                  >
                    <option value="">All Campuses</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StaffStatus)}
                    disabled={username === "superadmin"}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-bold cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-sm text-[#0B3C5D] uppercase tracking-wider">Reset Password</h3>
              <button onClick={() => setIsResetOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <ShieldAlert size={14} className="shrink-0" />
                  {errorMsg}
                </div>
              )}

              <p className="text-slate-500 font-semibold text-xs leading-normal">
                Resetting password for <strong>{selectedAccount.full_name}</strong> (🔑 username: @{selectedAccount.username}).
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-wider">New Password</span>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] hover:underline"
                  >
                    <RefreshCw size={10} />
                    Generate
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setConfirmPassword(e.target.value); }}
                      placeholder="Type new password"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-black tracking-wide"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {password && (
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs flex items-center justify-center transition-colors"
                      title="Copy Password"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] text-[#0B3C5D] font-black"
                  />
                </div>

                {/* Checkboxes for Options */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2 text-[10px] text-slate-600">
                  <label className="flex items-center gap-2 font-bold cursor-pointer text-left">
                    <input
                      type="checkbox"
                      checked={requireChangeNextLogin}
                      onChange={(e) => setRequireChangeNextLogin(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#0B3C5D] border-slate-300 focus:ring-[#0B3C5D]/20 cursor-pointer"
                    />
                    Require password change on next login
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer text-left">
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#0B3C5D] border-slate-300 focus:ring-[#0B3C5D]/20 cursor-pointer"
                    />
                    Notify user by email
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-amber-100"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {isViewOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#0B3C5D] text-white">
              <h3 className="font-black text-xs uppercase tracking-wider text-[#D4AF37]">Staff Profile</h3>
              <button onClick={() => setIsViewOpen(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-[#0B3C5D] text-[#D4AF37] font-black text-2xl flex items-center justify-center uppercase shadow-lg mb-3">
                  {selectedAccount.full_name.charAt(0)}
                </div>
                <h4 className="font-black text-sm text-[#0B3C5D] leading-none">{selectedAccount.full_name}</h4>
                <p className="text-xs text-slate-400 font-bold mt-1.5">@{selectedAccount.username}</p>
                <span className="text-[10px] font-bold mt-1 text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">
                  {selectedAccount.designation || "Staff Member"}
                </span>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email</span>
                  <span className="text-[#0B3C5D] font-bold">{selectedAccount.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-[#0B3C5D] font-bold">{selectedAccount.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Campus</span>
                  <span className="text-[#0B3C5D] font-bold">{selectedAccount.campus?.name || "All Campuses"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                    selectedAccount.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"
                  }`}>
                    {selectedAccount.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Login</span>
                  <span className="text-[#0B3C5D] font-bold">
                    {selectedAccount.last_login ? new Date(selectedAccount.last_login).toLocaleString() : "Never logged in"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created Date</span>
                  <span className="text-[#0B3C5D] font-bold">
                    {new Date(selectedAccount.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* SECURITY & ACCOUNT CONTROLS PANEL */}
              {isAdminUser && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest text-left">
                    Account Controls & Security
                  </h5>
                  
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-[10px] font-semibold text-slate-600 text-left">
                    <div className="flex justify-between items-center">
                      <span>Must Change Password:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${selectedAccount.must_change_password ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                        {selectedAccount.must_change_password ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Failed Login Attempts:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${selectedAccount.failed_login_attempts && selectedAccount.failed_login_attempts >= 5 ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-700"}`}>
                        {selectedAccount.failed_login_attempts || 0} / 5
                      </span>
                    </div>
                    {selectedAccount.locked_until && new Date(selectedAccount.locked_until).getTime() > Date.now() && (
                      <div className="flex justify-between items-center">
                        <span>Locked Until:</span>
                        <span className="font-bold text-rose-600">
                          {new Date(selectedAccount.locked_until).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {tempPassword && (
                      <div className="pt-1.5 border-t border-slate-200 space-y-1">
                        <span className="text-emerald-700 font-bold block">Generated Temp Password:</span>
                        <div className="flex gap-2">
                          <code className="bg-white border border-slate-200 px-2 py-1 rounded text-xs text-[#0B3C5D] font-mono flex-1 select-all">
                            {tempPassword}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tempPassword);
                              alert("Copied temporary password!");
                            }}
                            className="bg-white border border-slate-200 px-2 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleForcePasswordChange(selectedAccount)}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg border text-[9px] font-black uppercase text-center transition-all ${
                        selectedAccount.must_change_password
                          ? "bg-slate-150 text-slate-700 border-slate-250 hover:bg-slate-200 cursor-pointer"
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer"
                      }`}
                    >
                      {selectedAccount.must_change_password ? "Cancel Force Change" : "Force Password Change"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateTempPassword(selectedAccount)}
                      className="flex-1 min-w-[120px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase text-center transition-all cursor-pointer"
                    >
                      Generate Temp Password
                    </button>

                    {((selectedAccount.failed_login_attempts || 0) > 0 || selectedAccount.locked_until) && (
                      <button
                        type="button"
                        onClick={() => handleUnlockAccount(selectedAccount)}
                        className="flex-1 min-w-[120px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase text-center transition-all cursor-pointer"
                      >
                        Unlock Account
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleStatus(selectedAccount);
                        setSelectedAccount(prev => prev ? { ...prev, status: prev.status === "Active" ? "Disabled" : "Active" } : null);
                      }}
                      disabled={selectedAccount.username === "superadmin"}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg border text-[9px] font-black uppercase text-center transition-all ${
                        selectedAccount.status === "Active"
                          ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      } ${selectedAccount.username === "superadmin" ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {selectedAccount.status === "Active" ? "Disable Login" : "Enable Login"}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="px-5 py-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
