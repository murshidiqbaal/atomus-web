"use client";

import { useState } from "react";
import {
  BarChart3, Receipt, Wallet, CreditCard, History, AlertCircle,
} from "lucide-react";
import { emptyFilters, FeeFilters } from "../types";
import { ToastStack, useToasts } from "../components/ui";
import { FilterBar } from "../components/FilterBar";
import { OverviewSection } from "../components/OverviewSection";
import { StructuresSection } from "../components/StructuresSection";
import { StudentFeesSection } from "../components/StudentFeesSection";
import { QuickCollectSection } from "../components/QuickCollectSection";
import { HistorySection } from "../components/HistorySection";
import { DuesSection } from "../components/DuesSection";

type Tab = "overview" | "structures" | "students" | "collect" | "dues" | "history";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  filter: {
    search?: boolean;
    campus?: boolean;
    course?: boolean;
    batch?: boolean;
    status?: boolean;
    dateRange?: boolean;
    method?: boolean;
  } | null;
}

const TABS: TabDef[] = [
  { id: "overview",   label: "Overview",     icon: BarChart3, filter: null },
  { id: "structures", label: "Structures",   icon: Receipt,
    filter: { campus: true, course: true, batch: true } },
  { id: "students",   label: "Student Fees", icon: Wallet,
    filter: { search: true, campus: true, course: true, batch: true, status: true } },
  { id: "collect",    label: "Collect",      icon: CreditCard, filter: null },
  { id: "dues",       label: "Pending Dues", icon: AlertCircle,
    filter: { search: true, campus: true, course: true, batch: true } },
  { id: "history",    label: "History",      icon: History,
    filter: { search: true, campus: true, course: true, batch: true, method: true, dateRange: true } },
];

export default function FeesPage() {
  const { toasts, add, dismiss } = useToasts();
  const [active, setActive] = useState<Tab>("overview");
  const [filters, setFilters] = useState<FeeFilters>(emptyFilters());

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="p-4 lg:p-6 max-w-[1500px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Finance & Fees
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Fee structures, student dues, payment collection, and analytics — all in one place.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-1 px-1">
          <nav className="inline-flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                    ${isActive
                      ? "bg-[#0B3C5D] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Optional filter bar (per tab) */}
        {activeTab.filter && (
          <FilterBar value={filters} onChange={setFilters} show={activeTab.filter} />
        )}

        {/* Tab content */}
        <div>
          {active === "overview" && <OverviewSection />}
          {active === "structures" && <StructuresSection filters={filters} onToast={add} />}
          {active === "students" && <StudentFeesSection filters={filters} onToast={add} />}
          {active === "collect" && <QuickCollectSection onToast={add} />}
          {active === "dues" && <DuesSection filters={filters} onToast={add} />}
          {active === "history" && <HistorySection filters={filters} />}
        </div>
      </div>
    </>
  );
}
