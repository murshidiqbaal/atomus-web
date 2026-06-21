"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock, History, Shield,
  ArrowRight, Plus, Loader2, ArrowUpRight
} from "lucide-react";
import { staffAccessService } from "@/features/staff-access/services/staff_access_service";
import { StaffAccount, ActivityLog } from "@/features/staff-access/types";

export default function StaffDashboard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accs, activityLogs] = await Promise.all([
          staffAccessService.listStaffAccounts(),
          staffAccessService.listActivityLogs()
        ]);
        setAccounts(accs);
        setLogs(activityLogs);
      } catch (e) {
        console.error("Failed to load staff stats:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 size={36} className="animate-spin text-[#0B3C5D]" />
        <p className="text-sm font-bold">Loading staff dashboard data...</p>
      </div>
    );
  }

  const totalStaff = accounts.length;
  const activeStaff = accounts.filter(a => a.status === "Active").length;
  const disabledStaff = accounts.filter(a => a.status === "Disabled").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogins = logs.filter(
    l => l.action.toLowerCase().includes("login") && l.created_at.startsWith(todayStr)
  ).length;

  const kpis = [
    { label: "Total Staff", value: totalStaff, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Accounts", value: activeStaff, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Disabled Accounts", value: disabledStaff, icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Today's Logins", value: todayLogins, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Staff Access Control</h1>
          <p className="text-slate-500 font-medium mt-1">
            System administration, roles, permissions, and security log auditing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/staff/accounts" className="flex items-center gap-2 bg-[#0B3C5D] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 active:scale-95 text-sm">
            <Plus size={16} />
            Manage Accounts
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex items-center gap-4">
            <div className={`w-12 h-12 ${kpi.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon className={kpi.color} size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5">{kpi.label}</p>
              <h3 className="text-2xl font-black text-[#0B3C5D] leading-none">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Recent Activity Logs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <History className="text-[#0B3C5D]" size={18} />
              <h2 className="text-lg font-black text-[#0B3C5D]">Recent Staff Activities</h2>
            </div>
            <Link href="/admin/staff/logs" className="text-xs text-[#0B3C5D] font-bold hover:underline flex items-center gap-1">
              View All Logs
              <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="flex-1 space-y-3">
            {logs.slice(0, 5).map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-2 rounded-lg text-xs font-bold shrink-0 min-w-[50px] text-center">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-xs text-[#0B3C5D] truncate">{log.staff_name}</p>
                    <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {log.module}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{log.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">{log.description}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <p className="text-sm font-semibold">No activity logs recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Summaries */}
        <div className="space-y-6">
          {/* Latest Staff Created */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-black text-[#0B3C5D] mb-4 flex items-center gap-2">
              <Users size={16} className="text-[#D4AF37]" />
              Recently Added Staff
            </h2>
            <div className="space-y-3">
              {accounts.slice(0, 4).map((acc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#0B3C5D] text-[#D4AF37] font-black text-xs flex items-center justify-center">
                    {acc.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[#0B3C5D] leading-none truncate">{acc.full_name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{acc.designation || "Staff Member"}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${acc.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                    {acc.status}
                  </span>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No staff accounts found.</p>
              )}
            </div>
          </div>

          {/* Permissions Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-black text-[#0B3C5D] mb-3 flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              Permissions Presets
            </h2>
            <p className="text-[11px] text-slate-400 mb-4 leading-normal">
              Roles are modeled as permissions matrices. Configure them in the Roles & Permissions tab.
            </p>
            <div className="space-y-2.5">
              {[
                { name: "Full Access", desc: "Super Admin controls" },
                { name: "Accounting", desc: "Fees, expenses & report exports" },
                { name: "Teacher Office", desc: "Marks, courses, subjects & attendance" },
                { name: "Reception", desc: "Student & parent CRUD, view classes" }
              ].map((rolePreset, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-all">
                  <div>
                    <h5 className="font-bold text-xs text-[#0B3C5D]">{rolePreset.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{rolePreset.desc}</p>
                  </div>
                  <Link href="/admin/staff/permissions" className="text-slate-400 hover:text-[#0B3C5D]">
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
