"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, UserCircle, RotateCcw, CheckCircle2, AlertCircle, X,
  Users, Sparkles, Activity, Filter, LayoutGrid, List as ListIcon,
  ChevronRight, ArrowRight
} from "lucide-react";
import { Parent, ParentCredentials } from "../types";
import {
  useParents, useToggleParentStatus, useDeleteParent, useResetParentPassword,
} from "../hooks";
import { useCourses, useAllBatches } from "@/features/students/hooks";
import ParentRow from "../components/ParentRow";
import ParentCard from "../components/ParentCard";
import ParentModal from "../components/ParentModal";
import CredentialsModal from "../components/CredentialsModal";

const PAGE_SIZE = 12;

interface Filters {
  search: string;
  status: "all" | Parent["account_status"];
  course_id: string;
  batch_id: string;
}

function StatCard({ icon, label, value, sub, tone = "blue" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "gold";
}) {
  const tones: Record<string, string> = {
    blue:    "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber:   "bg-amber-50 text-amber-600 border-amber-100",
    rose:    "bg-rose-50 text-rose-600 border-rose-100",
    gold:    "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20",
  };
  return (
    <div className={`bg-white rounded-3xl border ${tones[tone]} px-6 py-5 shadow-sm hover:shadow-md transition-all`}>
      <div className={`w-10 h-10 ${tones[tone]} rounded-2xl flex items-center justify-center mb-4 border`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-3xl font-black text-[#0B3C5D] mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-tight">{sub}</p>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      <td className="px-4 py-4"><div className="h-10 bg-slate-100 rounded-xl animate-pulse w-40" /></td>
      <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded-md animate-pulse w-32" /></td>
      <td className="px-4 py-4"><div className="h-6 bg-slate-100 rounded-lg animate-pulse w-12" /></td>
      <td className="px-4 py-4 hidden lg:table-cell"><div className="h-6 bg-slate-100 rounded-lg animate-pulse w-24" /></td>
      <td className="px-4 py-4 hidden xl:table-cell"><div className="h-6 bg-slate-100 rounded-lg animate-pulse w-24" /></td>
      <td className="px-4 py-4"><div className="h-6 bg-slate-100 rounded-lg animate-pulse w-16" /></td>
      <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded-md animate-pulse w-20" /></td>
      <td className="px-4 py-4"><div className="h-8 bg-slate-100 rounded-lg animate-pulse w-24 ml-auto" /></td>
    </tr>
  );
}

export default function ParentsPage() {
  const { data: parents = [], isLoading } = useParents();
  const { data: courses = [] } = useCourses();
  const { data: allBatches = [] } = useAllBatches();
  const toggleStatus = useToggleParentStatus();
  const deleteParent = useDeleteParent();
  const resetPassword = useResetParentPassword();

  const [filters, setFilters] = useState<Filters>({ search: "", status: "all", course_id: "", batch_id: "" });
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);

  const [credentials, setCredentials] = useState<{ data: ParentCredentials; emailSent: boolean } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters((p) => {
      const next = { ...p, [key]: val };
      if (key === "course_id") next.batch_id = "";
      return next;
    });
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", status: "all", course_id: "", batch_id: "" });
    setPage(1);
  }

  const hasActiveFilters = filters.search || filters.status !== "all" || filters.course_id || filters.batch_id;

  const availableBatches = useMemo(
    () => (filters.course_id ? allBatches.filter((b) => b.course_id === filters.course_id) : allBatches),
    [allBatches, filters.course_id]
  );

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return parents.filter((p) => {
      if (filters.status !== "all" && p.account_status !== filters.status) return false;

      const students = p.students ?? [];

      if (filters.course_id && !students.some((s) => s.course_id === filters.course_id)) return false;
      if (filters.batch_id && !students.some((s) => s.batch_id === filters.batch_id)) return false;

      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone_number ?? "").includes(filters.search) ||
        students.some((s) => s.full_name.toLowerCase().includes(q))
      );
    });
  }, [parents, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      total:    parents.length,
      active:   parents.filter((p) => p.account_status === "Active").length,
      multi:    parents.filter((p) => (p.students?.length ?? 0) > 1).length,
      newMonth: parents.filter((p) => p.created_at?.startsWith(thisMonth)).length,
    };
  }, [parents]);

  function openAdd()              { setEditing(null); setModalOpen(true); }
  function openEdit(p: Parent)    { setEditing(p); setModalOpen(true); }

  async function handleToggleStatus(p: Parent) {
    const next = p.account_status === "Active" ? "Disabled" : "Active";
    try {
      await toggleStatus.mutateAsync({ id: p.id, status: next });
      notify("success", `${p.full_name} is now ${next}`);
    } catch (e: any) { notify("error", e?.message ?? "Failed to update status"); }
  }

  async function handleResetPassword(p: Parent) {
    if (!confirm(`Send password reset email to ${p.email}?`)) return;
    try {
      const ok = await resetPassword.mutateAsync(p.email);
      notify(ok ? "success" : "error", ok ? `Reset link sent to ${p.email}` : "Reset failed");
    } catch (e: any) { notify("error", e?.message ?? "Reset failed"); }
  }

  async function handleDelete(p: Parent) {
    if (!confirm(`Delete ${p.full_name}? Linked students will be unlinked.`)) return;
    try {
      await deleteParent.mutateAsync(p.id);
      notify("success", "Parent removed");
    } catch (e: any) { notify("error", e?.message ?? "Delete failed"); }
  }

  return (
    <div className="p-6 space-y-8 max-w-[1500px] mx-auto animate-in fade-in duration-500">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] max-w-sm px-6 py-4 rounded-[2rem] shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === "success" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 transition-opacity"><X size={16} /></button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-[#0B3C5D] w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-[#0B3C5D]/20 ring-4 ring-[#0B3C5D]/5">
            <UserCircle size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Parent Directory</h1>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} />
              {parents.length} Total Accounts Managed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-xl transition-all ${view === "list" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ListIcon size={18} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-xl transition-all ${view === "grid" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2.5 bg-[#0B3C5D] text-white px-6 py-3.5 rounded-[1.25rem] text-sm font-black hover:bg-[#0B3C5D]/90 transition-all shadow-xl shadow-[#0B3C5D]/20 active:scale-95"
          >
            <Plus size={18} />
            Add New Parent
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard tone="blue"    icon={<UserCircle size={20} />} label="Total Directory" value={stats.total} />
        <StatCard tone="emerald" icon={<Activity size={20} />}   label="Active Accounts" value={stats.active}  sub={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% Engagement`} />
        <StatCard tone="gold"    icon={<Users size={20} />}      label="Multi-Student"  value={stats.multi}   sub="2+ Children Linked" />
        <StatCard tone="amber"   icon={<Sparkles size={20} />}   label="New Enrollments" value={stats.newMonth} sub="This Month" />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0B3C5D] transition-colors" />
            <input
              type="text"
              placeholder="Search parent name, email, phone, or child..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl border border-transparent focus-within:border-[#0B3C5D]/20 focus-within:bg-white transition-all">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filters.course_id}
                onChange={(e) => setFilter("course_id", e.target.value)}
                className="bg-transparent text-sm font-bold outline-none min-w-[140px] text-slate-700"
              >
                <option value="">All Courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl border border-transparent focus-within:border-[#0B3C5D]/20 focus-within:bg-white transition-all">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filters.batch_id}
                onChange={(e) => setFilter("batch_id", e.target.value)}
                className="bg-transparent text-sm font-bold outline-none min-w-[140px] text-slate-700"
              >
                <option value="">All Batches</option>
                {availableBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden lg:block mx-2" />

            <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
              {(["all", "Active", "Pending", "Disabled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter("status", s)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filters.status === s ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                title="Reset Filters"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th colSpan={8} className="px-6 py-4 h-12" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
              <Users size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">No Parents Found</h3>
            <p className="text-slate-400 text-sm mt-2 font-bold max-w-xs mx-auto uppercase tracking-tight">
              {hasActiveFilters ? "We couldn't find any accounts matching those filters. Try broadening your search." : "Your parent directory is currently empty. Start by adding your first parent account."}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-6 text-[#0B3C5D] text-sm font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                Clear all filters <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Parent Entity", "Contact / Login", "Children", "Curriculum", "Group", "Account Status", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap
                        ${i === 1 ? "hidden md:table-cell" : ""}
                        ${i === 3 ? "hidden lg:table-cell" : ""}
                        ${i === 4 ? "hidden xl:table-cell" : ""}
                        ${i === 6 ? "text-right" : ""}
                      `}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((p) => (
                  <ParentRow
                    key={p.id}
                    parent={p}
                    onEdit={openEdit}
                    onResetPassword={handleResetPassword}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8">
            {paginated.map((p) => (
              <ParentCard
                key={p.id}
                parent={p}
                onEdit={openEdit}
                onResetPassword={handleResetPassword}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> Parents
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-[#0B3C5D] disabled:opacity-30 transition-all"
              >
                Prev
              </button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = page;
                  if (totalPages > 5) {
                    if (page <= 3) pNum = i + 1;
                    else if (page >= totalPages - 2) pNum = totalPages - 4 + i;
                    else pNum = page - 2 + i;
                  } else {
                    pNum = i + 1;
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-9 h-9 text-xs font-black rounded-xl transition-all ${
                        pNum === page ? "bg-[#0B3C5D] text-white shadow-lg shadow-[#0B3C5D]/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-[#0B3C5D] disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOpen && (
        <ParentModal
          parent={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onCreated={(result) => {
            const studentName = result.parent.students?.[0]?.full_name;
            setCredentials({
              data: {
                email: result.parent.email,
                phone: result.parent.phone_number ?? "",
                password: result.password,
                parentName: result.parent.full_name,
                studentName,
              },
              emailSent: result.emailSent,
            });
            notify("success", result.existed ? "Parent already existed — students linked." : "Parent account created.");
          }}
        />
      )}

      {credentials && (
        <CredentialsModal
          credentials={credentials.data}
          emailSent={credentials.emailSent}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
