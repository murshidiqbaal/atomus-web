"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet, Search, Filter, Calendar, RefreshCw, Trash2, ArrowUpDown, Clock, Monitor
} from "lucide-react";
import { staffAccessService } from "@/features/staff-access/services/staff_access_service";
import { ActivityLog, StaffAccount, ALL_MODULES } from "@/features/staff-access/types";
import { useAuth } from "@/providers/AuthProvider";

export default function ActivityLogsPage() {
  const { role } = useAuth();
  const isAdminUser = role === "admin"; // Only Super Admin can audit/view logs fully or wipe logs if supported (though we don't allow wipe to maintain security trail)

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);

  // Search & Filters state
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Sorting state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  async function loadData() {
    setLoading(true);
    try {
      const [activityLogs, staffList] = await Promise.all([
        staffAccessService.listActivityLogs(),
        staffAccessService.listStaffAccounts()
      ]);
      setLogs(activityLogs);
      setStaffAccounts(staffList);
    } catch (e) {
      console.error("Failed to load activity logs:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and Sorted Logs list
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // Filter by Search Query (Name, Action, Description)
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        log =>
          log.staff_name.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.description.toLowerCase().includes(query)
      );
    }

    // Filter by Module/Page
    if (selectedModule) {
      result = result.filter(log => log.module === selectedModule);
    }

    // Filter by Staff member
    if (selectedStaff) {
      result = result.filter(log => log.staff_name === selectedStaff || log.staff_id === selectedStaff);
    }

    // Filter by Date (YYYY-MM-DD check)
    if (selectedDate) {
      result = result.filter(log => log.created_at.startsWith(selectedDate));
    }

    // Sort order (created_at timestamp comparison)
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [logs, search, selectedModule, selectedStaff, selectedDate, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(processedLogs.length / itemsPerPage);
  const currentLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return processedLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [processedLogs, currentPage]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedModule, selectedStaff, selectedDate]);

  function toggleSort() {
    setSortOrder(prev => (prev === "desc" ? "asc" : "desc"));
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B3C5D] tracking-tight">Security & Activity Audit Trail</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Real-time immutable security logs tracking all administrative logins, password resets, and write operations.
          </p>
        </div>
        
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#0B3C5D] font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Activity Log
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, description, staff name..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-[#0B3C5D] font-semibold"
            />
          </div>

          {/* Date Picker */}
          <div className="relative shrink-0 w-full md:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B3C5D] font-bold cursor-pointer text-[#0B3C5D]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2">Filters:</span>
          
          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
          >
            <option value="">All Modules</option>
            {ALL_MODULES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Staff Filter */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="bg-white border border-slate-200 text-[#0B3C5D] text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:border-[#0B3C5D] cursor-pointer"
          >
            <option value="">All Staff</option>
            {staffAccounts.map((acc) => (
              <option key={acc.id} value={acc.full_name}>{acc.full_name}</option>
            ))}
          </select>

          {/* Reset Filters button */}
          {(search || selectedModule || selectedStaff || selectedDate) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedModule("");
                setSelectedStaff("");
                setSelectedDate("");
              }}
              className="text-[10px] font-bold text-rose-500 hover:underline px-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-[#0B3C5D]" />
            <p className="text-xs font-bold">Retrieving audit log entries...</p>
          </div>
        ) : processedLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-sm font-bold">No activity logs match the criteria.</p>
            <p className="text-xs mt-1">Try resetting filters to view all recorded actions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[#0B3C5D] font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100/60 transition-colors w-[180px]" onClick={toggleSort}>
                    <div className="flex items-center gap-1.5">
                      Timestamp
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-4 w-[180px]">Staff User</th>
                  <th className="px-4 py-4 w-[150px]">Module / Page</th>
                  <th className="px-4 py-4 w-[160px]">Action Triggered</th>
                  <th className="px-4 py-4">Audit Description</th>
                  <th className="px-5 py-4 text-right w-[110px]">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {currentLogs.map((log) => {
                  const logDate = new Date(log.created_at);
                  const isLoginLogout = log.action.toLowerCase().includes("login") || log.action.toLowerCase().includes("logout");
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3 text-slate-500 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {logDate.toLocaleDateString()} &nbsp;
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] text-[10px] font-black flex items-center justify-center uppercase shrink-0">
                            {log.staff_name.charAt(0)}
                          </div>
                          <span className="truncate">{log.staff_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#0B3C5D] font-black">
                        <span className="bg-[#0B3C5D]/5 px-2 py-0.5 rounded-lg border border-[#0B3C5D]/10 text-[9px] uppercase tracking-wider">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                          isLoginLogout
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] leading-relaxed font-semibold">
                        {log.description}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400 font-bold font-mono text-[10px] whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Monitor size={10} className="opacity-60" />
                          {log.ip_address || "127.0.0.1"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, processedLogs.length)}</strong> of <strong className="text-slate-800">{processedLogs.length}</strong> logs
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#0B3C5D] font-bold rounded-lg text-xs disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-7 h-7 flex items-center justify-center font-bold rounded-lg text-xs border transition-all ${
                  currentPage === i + 1
                    ? "bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-sm"
                    : "bg-white border-slate-200 text-[#0B3C5D] hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#0B3C5D] font-bold rounded-lg text-xs disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
