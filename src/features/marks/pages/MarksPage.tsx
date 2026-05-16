"use client";

import React, { useState } from "react";
import { BarChart3, FileSpreadsheet, LineChart, Plus, Trophy } from "lucide-react";
import { ExamModal } from "../components/ExamModal";
import { MarksAnalytics } from "../components/MarksAnalytics";
import { MarksDashboard } from "../components/MarksDashboard";
import { MarksEntry } from "../components/MarksEntry";
import { ToastStack, useToasts } from "../components/ui";

type Tab = "dashboard" | "entry" | "analytics";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }>; hint: string }[] = [
  { key: "dashboard", label: "Overview", icon: LineChart, hint: "KPIs & performance trends" },
  { key: "entry", label: "Marks Entry", icon: FileSpreadsheet, hint: "Bulk enter & save marks" },
  { key: "analytics", label: "Analytics & Toppers", icon: Trophy, hint: "Leaderboard & comparisons" },
];

export default function MarksPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [examModalOpen, setExamModalOpen] = useState(false);
  const { toasts, add, dismiss } = useToasts();

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <ExamModal
        isOpen={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        defaultCourse=""
        defaultBatch=""
        onCreated={() => {
          // user can now switch to Entry tab to fill marks
          setTab("entry");
        }}
        onToast={add}
      />

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Marks & Exam Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {TABS.find((t) => t.key === tab)?.hint}
              </p>
            </div>
          </div>

          <button
            onClick={() => setExamModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white
                       bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 transition-all shadow-md shadow-blue-900/20
                       active:scale-[0.98]"
          >
            <Plus size={15} />
            New Exam
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors
                    ${active
                      ? "border-[#0B3C5D] text-[#0B3C5D]"
                      : "border-transparent text-slate-400 hover:text-slate-700"}`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "dashboard" && <MarksDashboard courseFilter="" />}
        {tab === "entry" && (
          <MarksEntry onToast={add} onCreateExam={() => setExamModalOpen(true)} />
        )}
        {tab === "analytics" && <MarksAnalytics />}
      </div>
    </>
  );
}
