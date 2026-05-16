"use client";

import { useState } from "react";
import {
  LayoutDashboard, BookOpen, Building2, BarChart3, Plus,
} from "lucide-react";
import type { Campus, Course } from "@/lib/types";
import { CampusesPanel } from "../components/CampusesPanel";
import { CampusModal } from "../components/CampusModal";
import { CoursesAnalytics } from "../components/CoursesAnalytics";
import { CoursesDashboard } from "../components/CoursesDashboard";
import { CoursesGrid } from "../components/CoursesGrid";
import { CourseModal } from "../components/CourseModal";
import { SubjectsDrawer } from "../components/SubjectsDrawer";
import { BatchesDrawer } from "../components/BatchesDrawer";
import { PrimaryButton, ToastStack, useToasts } from "../components/ui";

type Tab = "overview" | "courses" | "campuses" | "analytics";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }>; hint: string }[] = [
  { key: "overview",  label: "Overview",  icon: LayoutDashboard, hint: "Stats, charts, and recent activity" },
  { key: "courses",   label: "Courses",   icon: BookOpen,        hint: "Manage and assign courses to campuses" },
  { key: "campuses",  label: "Campuses",  icon: Building2,       hint: "Manage your physical & online campuses" },
  { key: "analytics", label: "Analytics", icon: BarChart3,       hint: "Revenue, batches, and distribution" },
];

export default function CoursesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const { toasts, add, dismiss } = useToasts();

  // Modals & drawers
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [campusModalOpen, setCampusModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [subjectsCourse, setSubjectsCourse] = useState<Course | null>(null);
  const [batchesCourse, setBatchesCourse] = useState<Course | null>(null);

  const openNewCourse = () => { setEditingCourse(null); setCourseModalOpen(true); };
  const openEditCourse = (c: Course) => { setEditingCourse(c); setCourseModalOpen(true); };
  const openNewCampus = () => { setEditingCampus(null); setCampusModalOpen(true); };
  const openEditCampus = (c: Campus) => { setEditingCampus(c); setCampusModalOpen(true); };

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <CourseModal
        isOpen={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        course={editingCourse}
        onToast={add}
      />
      <CampusModal
        isOpen={campusModalOpen}
        onClose={() => setCampusModalOpen(false)}
        campus={editingCampus}
        onToast={add}
      />
      <SubjectsDrawer
        isOpen={!!subjectsCourse}
        onClose={() => setSubjectsCourse(null)}
        course={subjectsCourse}
        onToast={add}
      />
      <BatchesDrawer
        isOpen={!!batchesCourse}
        onClose={() => setBatchesCourse(null)}
        course={batchesCourse}
        onToast={add}
      />

      <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#0B3C5D] p-2.5 rounded-xl">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Course Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {TABS.find((t) => t.key === tab)?.hint}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "campuses" ? (
              <PrimaryButton onClick={openNewCampus}>
                <Plus size={14} />
                New Campus
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={openNewCourse}>
                <Plus size={14} />
                New Course
              </PrimaryButton>
            )}
          </div>
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

        {tab === "overview" && <CoursesDashboard onJumpToCourses={() => setTab("courses")} />}
        {tab === "courses" && (
          <CoursesGrid
            onAddCourse={openNewCourse}
            onEditCourse={openEditCourse}
            onManageSubjects={(c) => setSubjectsCourse(c)}
            onManageBatches={(c) => setBatchesCourse(c)}
            onToast={add}
          />
        )}
        {tab === "campuses" && (
          <CampusesPanel
            onAddCampus={openNewCampus}
            onEditCampus={openEditCampus}
            onToast={add}
          />
        )}
        {tab === "analytics" && <CoursesAnalytics />}
      </div>
    </>
  );
}
