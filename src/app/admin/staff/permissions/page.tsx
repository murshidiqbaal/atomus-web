"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Shield, CheckSquare, Square, Save, RefreshCw, AlertCircle, Info, Lock, Check, CheckSquare2
} from "lucide-react";
import { staffAccessService } from "@/features/staff-access/services/staff_access_service";
import {
  StaffAccount,
  PermissionsMatrix,
  ALL_MODULES,
  ALL_ACTIONS,
  PERMISSION_PRESETS,
  createEmptyMatrix,
  PermissionAction
} from "@/features/staff-access/types";
import { useAuth } from "@/providers/AuthProvider";

export default function RolesPermissionsPage() {
  const { role } = useAuth();
  const isAdminUser = role === "admin"; // Only Super Admin can edit permissions

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [matrix, setMatrix] = useState<PermissionsMatrix>(createEmptyMatrix());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load staff list
  async function loadStaffList() {
    setLoading(true);
    try {
      const list = await staffAccessService.listStaffAccounts();
      // Remove superadmin from list or keep but show read-only
      setStaffAccounts(list);
      
      // Auto select first staff member if available (excluding superadmin if possible, otherwise first)
      const firstNonAdmin = list.find(s => s.username !== "superadmin") || list[0];
      if (firstNonAdmin) {
        setSelectedStaffId(firstNonAdmin.id);
      }
    } catch (e) {
      console.error("Failed to load staff list:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaffList();
  }, []);

  // Load selected staff permissions
  useEffect(() => {
    if (!selectedStaffId) return;

    let active = true;
    async function loadPermissions() {
      try {
        const perms = await staffAccessService.getStaffPermissions(selectedStaffId);
        if (active) {
          setMatrix(perms);
        }
      } catch (e) {
        console.error("Failed to load permissions:", e);
      }
    }

    loadPermissions();
    return () => {
      active = false;
    };
  }, [selectedStaffId]);

  // Find selected staff account details
  const selectedAccount = useMemo(() => {
    return staffAccounts.find(s => s.id === selectedStaffId) || null;
  }, [staffAccounts, selectedStaffId]);

  const isSelectedSuperadmin = useMemo(() => {
    return selectedAccount?.username === "superadmin" || selectedAccount?.id === "super-admin-id";
  }, [selectedAccount]);

  // Handle cell click / toggle
  function handleTogglePermission(module: string, action: PermissionAction) {
    if (!isAdminUser || isSelectedSuperadmin) return;

    setMatrix(prev => {
      const updatedModule = {
        ...prev[module],
        [action]: !prev[module][action]
      };
      
      // Auto view toggle helper:
      // If any write/manage action is checked, view should automatically be checked.
      // If view is unchecked, all other actions should automatically be unchecked.
      if (action !== "view" && updatedModule[action] && !updatedModule.view) {
        updatedModule.view = true;
      } else if (action === "view" && !updatedModule.view) {
        // Uncheck all if view is unchecked
        updatedModule.create = false;
        updatedModule.update = false;
        updatedModule.delete = false;
        updatedModule.export = false;
        updatedModule.mark = false;
        updatedModule.manage = false;
      }

      return {
        ...prev,
        [module]: updatedModule
      };
    });
    setSaveSuccess(false);
  }

  // Handle Template Preset clicks
  function applyPreset(presetName: keyof typeof PERMISSION_PRESETS) {
    if (!isAdminUser || isSelectedSuperadmin) return;
    
    // Deep clone preset matrix
    const presetMatrix = JSON.parse(JSON.stringify(PERMISSION_PRESETS[presetName]));
    setMatrix(presetMatrix);
    setSaveSuccess(false);
  }

  // Handle Select All
  function handleSelectAll() {
    if (!isAdminUser || isSelectedSuperadmin) return;
    const newMatrix = createEmptyMatrix();
    for (const mod of ALL_MODULES) {
      newMatrix[mod] = { view: true, create: true, update: true, delete: true, export: true, mark: true, manage: true };
    }
    setMatrix(newMatrix);
    setSaveSuccess(false);
  }

  // Handle Clear All
  function handleClearAll() {
    if (!isAdminUser || isSelectedSuperadmin) return;
    setMatrix(createEmptyMatrix());
    setSaveSuccess(false);
  }

  // Save permissions
  async function handleSavePermissions() {
    if (!isAdminUser || isSelectedSuperadmin || !selectedStaffId) return;
    
    setSaving(true);
    setSaveSuccess(false);
    try {
      await staffAccessService.saveStaffPermissions(selectedStaffId, matrix);
      
      // Log this action
      if (selectedAccount) {
        await staffAccessService.logActivity(
          null,
          "Super Admin",
          "Staff Access",
          "Configure Permissions",
          `Updated permissions for ${selectedAccount.full_name} (${selectedAccount.username})`
        );
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      alert("Failed to save permissions. Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const actionLabels: Record<PermissionAction, string> = {
    view: "View",
    create: "Create",
    update: "Edit",
    delete: "Delete",
    export: "Export",
    mark: "Mark",
    manage: "Manage"
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D] tracking-tight">Roles & Permissions Matrix</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Map granular action-level access permissions per dashboard page for administrative personnel.
          </p>
        </div>
        
        {isAdminUser && !isSelectedSuperadmin && selectedStaffId && (
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {saving ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving Changes..." : "Save Permission Configuration"}
          </button>
        )}
      </div>

      {/* Control Panel: Staff Selection & Template Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Select Staff Member */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Select Staff Member</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Select an account to view or modify permissions.</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
              <RefreshCw className="animate-spin text-[#0B3C5D]" size={16} />
              <span className="text-xs font-bold">Loading staff accounts...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setSaveSuccess(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-2.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
              >
                <option value="" disabled>Choose a staff member...</option>
                {staffAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.full_name} (@{acc.username}) — {acc.designation || "Staff"}
                  </option>
                ))}
              </select>

              {selectedAccount && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designation:</span>
                    <span className="text-[#0B3C5D] font-bold">{selectedAccount.designation || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Branch/Campus:</span>
                    <span className="text-[#0B3C5D] font-bold">{selectedAccount.campus?.name || "All Campuses"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Status:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase border leading-none ${
                      selectedAccount.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"
                    }`}>
                      {selectedAccount.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Card: Quick Templates Presets */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Quick Templates & Controls</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Instantly configure permission matrix using preset template layouts.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSelectAll}
              disabled={!isAdminUser || isSelectedSuperadmin || !selectedStaffId}
              className="bg-[#0B3C5D]/10 hover:bg-[#0B3C5D]/15 text-[#0B3C5D] font-black text-[10px] uppercase px-3.5 py-2 rounded-xl transition-all disabled:opacity-30 border border-[#0B3C5D]/20 active:scale-95"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              disabled={!isAdminUser || isSelectedSuperadmin || !selectedStaffId}
              className="bg-rose-50 hover:bg-rose-100/70 text-rose-600 font-black text-[10px] uppercase px-3.5 py-2 rounded-xl transition-all disabled:opacity-30 border border-rose-100 active:scale-95"
            >
              Clear All
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1 align-middle self-center" />

            {(["Full Access", "Read Only", "Accounting", "Teacher Office", "Reception", "Office Staff"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                disabled={!isAdminUser || isSelectedSuperadmin || !selectedStaffId}
                className="bg-slate-50 hover:bg-slate-100 text-[#0B3C5D] font-bold text-[10px] px-3.5 py-2 rounded-xl border border-slate-200 transition-all disabled:opacity-30 active:scale-95"
              >
                {preset}
              </button>
            ))}
          </div>

          {!isAdminUser && (
            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex items-center gap-2 text-[11px] font-medium leading-relaxed">
              <Lock size={14} className="shrink-0 text-amber-600" />
              <span>You are viewing in <strong>Read-Only Mode</strong>. Only the Super Admin is authorized to edit staff access controls.</span>
            </div>
          )}

          {isSelectedSuperadmin && (
            <div className="p-3 bg-blue-50 border border-blue-100 text-[#0B3C5D] rounded-xl flex items-center gap-2 text-[11px] font-medium leading-relaxed">
              <Info size={14} className="shrink-0 text-[#0B3C5D]" />
              <span><strong>Super Admin</strong> account bypasses all local configuration settings and maintains full access to all modules.</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification banner */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-sm animate-fadeIn">
          <Check className="text-white bg-emerald-600 rounded-full p-0.5" size={16} />
          <span>Permissions saved successfully! The changes are now active for {selectedAccount?.full_name}.</span>
        </div>
      )}

      {/* Permissions Matrix Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                <th className="px-6 py-4.5 w-[220px]">Dashboard Module / Page</th>
                {ALL_ACTIONS.map((action) => (
                  <th key={action} className="px-4 py-4.5 text-center">
                    {actionLabels[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {ALL_MODULES.map((module) => {
                const modulePerms = matrix[module] || {
                  view: false, create: false, update: false, delete: false, export: false, mark: false, manage: false
                };

                return (
                  <tr key={module} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#0B3C5D]/30" />
                        <span className="font-bold text-slate-800 text-xs">{module}</span>
                      </div>
                    </td>
                    
                    {ALL_ACTIONS.map((action) => {
                      const isChecked = !!modulePerms[action];
                      const disabled = !isAdminUser || isSelectedSuperadmin || !selectedStaffId;

                      return (
                        <td key={action} className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(module, action)}
                            disabled={disabled}
                            className={`mx-auto flex items-center justify-center w-5 h-5 rounded-md border transition-all ${
                              isChecked
                                ? "bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm shadow-blue-100"
                                : "bg-white border-slate-300 text-transparent hover:border-[#0B3C5D]/50"
                            } ${
                              disabled
                                ? "cursor-not-allowed opacity-50 bg-slate-100"
                                : "cursor-pointer active:scale-90"
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Save Bar (Floating style) */}
      {isAdminUser && !isSelectedSuperadmin && selectedStaffId && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Info size={14} className="text-[#0B3C5D]" />
            <span>Unsaved changes will be lost if you navigate away. Click Save to commit changes.</span>
          </div>
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {saving ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving Changes..." : "Save Permission Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
