"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpen, Search, RotateCcw, Plus, Grid3x3, Table as TableIcon,
  Edit3, Trash2, Building2, Clock, Layers, BookMarked, Wifi, Eye,
} from "lucide-react";
import {
  useCampuses, useCourses, useDeleteCourse, useUpdateCourse,
} from "../hooks";
import {
  Badge, Card, EmptyState, fieldCls, GhostButton, Label, modeTone, PrimaryButton, typeTone, formatINR,
} from "./ui";
import type {
  Course, CourseFilters, CourseMode, CourseType,
} from "@/lib/types";
import {
  COURSE_CLASS_LEVELS, COURSE_MODES, COURSE_TYPES,
} from "@/lib/types";

type ViewMode = "grid" | "table";

export function CoursesGrid({
  onAddCourse,
  onEditCourse,
  onManageSubjects,
  onManageBatches,
  onToast,
}: {
  onAddCourse: () => void;
  onEditCourse: (course: Course) => void;
  onManageSubjects: (course: Course) => void;
  onManageBatches: (course: Course) => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseType, setCourseType] = useState<CourseType | "">("");
  const [mode, setMode] = useState<CourseMode | "">("");
  const [classLevel, setClassLevel] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<ViewMode>("grid");

  const filters: CourseFilters = useMemo(() => ({
    search: search || undefined,
    campusId: campusId || undefined,
    courseType: courseType || undefined,
    mode: mode || undefined,
    classLevel: classLevel || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  }), [search, campusId, courseType, mode, classLevel, activeFilter]);

  const { data: campuses = [] } = useCampuses();
  const { data: courses = [], isLoading } = useCourses(filters);

  const hasFilters = !!(search || campusId || courseType || mode || classLevel || activeFilter !== "all");

  const resetFilters = () => {
    setSearch(""); setCampusId(""); setCourseType(""); setMode("");
    setClassLevel(""); setActiveFilter("all");
  };

  const updateMut = useUpdateCourse();
  const deleteMut = useDeleteCourse();

  const handleToggleActive = (c: Course) => {
    updateMut.mutate(
      { id: c.id, patch: { isActive: !c.isActive } },
      {
        onSuccess: () => onToast("success", `Course ${c.isActive ? "deactivated" : "activated"}.`),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to update."),
      },
    );
  };

  const handleDelete = (c: Course) => {
    if (!window.confirm(`Delete "${c.name}"? This also removes all batches & subjects.`)) return;
    deleteMut.mutate(c.id, {
      onSuccess: () => onToast("success", "Course deleted."),
      onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to delete."),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 lg:col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Course name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${fieldCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <Label>Campus</Label>
            <select value={campusId} onChange={(e) => setCampusId(e.target.value)} className={fieldCls}>
              <option value="">All</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Type</Label>
            <select value={courseType} onChange={(e) => setCourseType(e.target.value as CourseType | "")} className={fieldCls}>
              <option value="">All</option>
              {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Mode</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as CourseMode | "")} className={fieldCls}>
              <option value="">All</option>
              {COURSE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Class Level</Label>
            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className={fieldCls}>
              <option value="">All</option>
              {COURSE_CLASS_LEVELS.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveFilter(s)}
                className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-colors
                  ${activeFilter === s
                    ? "bg-white text-[#0B3C5D] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              {courses.length} {courses.length === 1 ? "course" : "courses"}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0B3C5D]"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Grid view"
              >
                <Grid3x3 size={14} />
              </button>
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Table view"
              >
                <TableIcon size={14} />
              </button>
            </div>
            <PrimaryButton onClick={onAddCourse} className="!py-2">
              <Plus size={14} />
              New Course
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-28 bg-slate-100 rounded-xl mb-4" />
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} />}
          title={hasFilters ? "No courses match your filters" : "No courses yet"}
          hint={hasFilters ? "Try clearing the filters." : "Create your first course to get started."}
          action={
            hasFilters ? (
              <GhostButton onClick={resetFilters}><RotateCcw size={14} /> Clear filters</GhostButton>
            ) : (
              <PrimaryButton onClick={onAddCourse}><Plus size={14} /> Create Course</PrimaryButton>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((c) => (
            <CourseGridCard
              key={c.id}
              course={c}
              onEdit={() => onEditCourse(c)}
              onDelete={() => handleDelete(c)}
              onToggleActive={() => handleToggleActive(c)}
              onManageSubjects={() => onManageSubjects(c)}
              onManageBatches={() => onManageBatches(c)}
            />
          ))}
        </div>
      ) : (
        <CoursesTable
          courses={courses}
          onEdit={onEditCourse}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onManageSubjects={onManageSubjects}
        />
      )}
    </div>
  );
}

function CourseGridCard({
  course, onEdit, onDelete, onToggleActive, onManageSubjects, onManageBatches,
}: {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onManageSubjects: () => void;
  onManageBatches: () => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-32 bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/70">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <BookOpen size={40} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          <Badge tone={modeTone(course.mode)}>
            {course.mode === "Online" && <Wifi size={9} />}
            {course.mode}
          </Badge>
          <Badge tone={typeTone(course.courseType)}>{course.courseType}</Badge>
        </div>
        <button
          onClick={onToggleActive}
          className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
            ${course.isActive ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}
          title={course.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
        >
          {course.isActive ? "Active" : "Inactive"}
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-black text-slate-900 leading-tight truncate">
          {course.name}
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {course.classLevel ?? "—"}
        </p>
        {course.description && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{course.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat icon={<Clock size={12} />} label="Months" value={course.durationMonths ?? "—"} />
          <Stat icon={<Layers size={12} />} label="Batches" value={course.batchCount ?? 0} />
          <Stat icon={<BookMarked size={12} />} label="Subjects" value={course.subjectCount ?? 0} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Fee</p>
          <p className="text-sm font-black text-[#0B3C5D] tabular-nums">{formatINR(course.feeAmount)}</p>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Campuses</p>
          <div className="flex flex-wrap gap-1">
            {(course.campuses ?? []).length === 0 ? (
              <span className="text-[11px] text-slate-300">No campuses</span>
            ) : (
              (course.campuses ?? []).map((cp) => (
                <Badge key={cp.id} tone="blue" className="!normal-case !tracking-normal">
                  <Building2 size={9} /> {cp.name}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          <GhostButton onClick={onEdit} className="!px-2.5 !py-1.5 !text-xs">
            <Edit3 size={12} /> Edit
          </GhostButton>
          <GhostButton onClick={onManageSubjects} className="!px-2.5 !py-1.5 !text-xs">
            <BookMarked size={12} /> Subjects
          </GhostButton>
          <GhostButton onClick={onManageBatches} className="!px-2.5 !py-1.5 !text-xs">
            <Layers size={12} /> Batches
          </GhostButton>
          <button
            onClick={onDelete}
            className="ml-auto p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-400">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-black text-slate-700 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function CoursesTable({
  courses, onEdit, onDelete, onToggleActive, onManageSubjects,
}: {
  courses: Course[];
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void;
  onToggleActive: (c: Course) => void;
  onManageSubjects: (c: Course) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Course", "Type", "Mode", "Class", "Campuses", "Batches", "Subjects", "Fee", "Status", ""].map((h) => (
                <th key={h} className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center shrink-0 overflow-hidden relative">
                      {c.thumbnailUrl ? (
                        <Image src={c.thumbnailUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                      ) : (
                        <BookOpen size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.durationMonths ?? "—"} months</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4"><Badge tone={typeTone(c.courseType)}>{c.courseType}</Badge></td>
                <td className="py-3 px-4"><Badge tone={modeTone(c.mode)}>{c.mode}</Badge></td>
                <td className="py-3 px-4 text-xs text-slate-600">{c.classLevel ?? "—"}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 max-w-[260px]">
                    {(c.campuses ?? []).slice(0, 3).map((cp) => (
                      <Badge key={cp.id} tone="blue" className="!normal-case !tracking-normal">
                        {cp.name}
                      </Badge>
                    ))}
                    {(c.campuses?.length ?? 0) > 3 && (
                      <Badge tone="slate">+{(c.campuses?.length ?? 0) - 3}</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">{c.batchCount ?? 0}</td>
                <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">{c.subjectCount ?? 0}</td>
                <td className="py-3 px-4 text-xs font-bold text-[#0B3C5D] tabular-nums">{formatINR(c.feeAmount)}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onToggleActive(c)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onManageSubjects(c)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Manage subjects">
                      <BookMarked size={14} />
                    </button>
                    <button onClick={() => onEdit(c)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => onDelete(c)} className="p-1.5 text-slate-400 hover:text-rose-500" title="Delete">
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-[#0B3C5D] hidden" title="View">
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
