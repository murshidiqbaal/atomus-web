"use client";

import { useMemo, useState } from "react";
import {
  Building2, Plus, Edit3, Trash2, MapPin, BookOpen, Search,
  Grid3x3, Table as TableIcon, RotateCcw,
} from "lucide-react";
import {
  useCampuses, useCourses, useDeleteCampus, useUpdateCampus,
} from "../hooks";
import {
  Card, EmptyState, fieldCls, GhostButton, Label, PrimaryButton, StatCard,
} from "./ui";
import type { Campus } from "@/lib/types";

type ViewMode = "grid" | "table";

export function CampusesPanel({
  onAddCampus,
  onEditCampus,
  onToast,
}: {
  onAddCampus: () => void;
  onEditCampus: (campus: Campus) => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  const { data: campuses = [], isLoading } = useCampuses();
  const { data: courses = [] } = useCourses();
  const updateMut = useUpdateCampus();
  const deleteMut = useDeleteCampus();

  const coursesByCampus = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      for (const cp of c.campuses ?? []) {
        map.set(cp.id, (map.get(cp.id) ?? 0) + 1);
      }
    }
    return map;
  }, [courses]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campuses;
    const q = search.toLowerCase();
    return campuses.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q),
    );
  }, [campuses, search]);

  const activeCount = campuses.filter((c) => c.isActive).length;
  const totalCourseLinks = useMemo(
    () => campuses.reduce((a, c) => a + (coursesByCampus.get(c.id) ?? 0), 0),
    [campuses, coursesByCampus],
  );

  const handleToggleActive = (campus: Campus) => {
    updateMut.mutate(
      { id: campus.id, patch: { isActive: !campus.isActive } },
      {
        onSuccess: () => onToast("success", `Campus ${campus.isActive ? "deactivated" : "activated"}.`),
        onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to update."),
      },
    );
  };

  const handleDelete = (campus: Campus) => {
    const usage = coursesByCampus.get(campus.id) ?? 0;
    const warn = usage > 0
      ? `"${campus.name}" is linked to ${usage} course${usage === 1 ? "" : "s"}. Delete anyway?`
      : `Delete "${campus.name}"?`;
    if (!window.confirm(warn)) return;
    deleteMut.mutate(campus.id, {
      onSuccess: () => onToast("success", "Campus deleted."),
      onError: (e) => onToast("error", e instanceof Error ? e.message : "Failed to delete."),
    });
  };

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Campuses"
          value={isLoading ? "—" : campuses.length}
          icon={<Building2 size={18} />}
          accent="bg-[#0B3C5D]"
        />
        <StatCard
          label="Active Campuses"
          value={isLoading ? "—" : activeCount}
          icon={<MapPin size={18} />}
          accent="bg-emerald-500"
          sub={`${campuses.length - activeCount} inactive`}
        />
        <StatCard
          label="Course-Campus Links"
          value={isLoading ? "—" : totalCourseLinks}
          icon={<BookOpen size={18} />}
          accent="bg-[#D4AF37]"
          sub="Across all courses"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Label>Search</Label>
          <Search size={14} className="absolute left-3 top-[34px] text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${fieldCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto self-end">
          {search && (
            <button
              onClick={() => setSearch("")}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0B3C5D]"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-white text-[#0B3C5D] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <TableIcon size={14} />
            </button>
          </div>
          <PrimaryButton onClick={onAddCampus} className="!py-2">
            <Plus size={14} /> New Campus
          </PrimaryButton>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-100 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={26} />}
          title={search ? "No campuses match" : "No campuses yet"}
          hint={search ? "Try a different search." : "Add a campus to start assigning courses."}
          action={
            search ? (
              <GhostButton onClick={() => setSearch("")}><RotateCcw size={14} /> Clear search</GhostButton>
            ) : (
              <PrimaryButton onClick={onAddCampus}><Plus size={14} /> Add Campus</PrimaryButton>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <CampusCard
              key={c.id}
              campus={c}
              courseCount={coursesByCampus.get(c.id) ?? 0}
              onEdit={() => onEditCampus(c)}
              onDelete={() => handleDelete(c)}
              onToggleActive={() => handleToggleActive(c)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Campus", "Location", "Courses", "Status", "Created", ""].map((h) => (
                    <th key={h} className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center">
                          <Building2 size={15} />
                        </div>
                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{c.location ?? "—"}</td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-700 tabular-nums">
                      {coursesByCampus.get(c.id) ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEditCampus(c)} className="p-1.5 text-slate-400 hover:text-[#0B3C5D]" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 text-slate-400 hover:text-rose-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CampusCard({
  campus, courseCount, onEdit, onDelete, onToggleActive,
}: {
  campus: Campus;
  courseCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center shrink-0">
          <Building2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-slate-900 truncate">{campus.name}</h3>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin size={10} /> {campus.location ?? "Location not set"}
          </p>
        </div>
        <button
          onClick={onToggleActive}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0
            ${campus.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
        >
          {campus.isActive ? "Active" : "Inactive"}
        </button>
      </div>

      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <BookOpen size={12} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Courses</span>
        </div>
        <span className="text-sm font-black text-[#0B3C5D] tabular-nums">{courseCount}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <GhostButton onClick={onEdit} className="!px-3 !py-1.5 !text-xs">
          <Edit3 size={12} /> Edit
        </GhostButton>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  );
}
