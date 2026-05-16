"use client";

import { useEffect, useState } from "react";
import {
  X, Plus, Layers, Trash2, Loader2, Users, Clock, Building2,
} from "lucide-react";
import type { Course } from "@/lib/types";
import {
  useBatchesForCourse, useCampuses, useCreateBatch, useDeleteBatch,
} from "../hooks";
import {
  Card, EmptyState, fieldCls, GhostButton, Label, PrimaryButton, StatCard,
} from "./ui";

export function BatchesDrawer({
  isOpen, onClose, course, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const { data: batches = [], isLoading } = useBatchesForCourse(course?.id ?? null);
  const { data: campuses = [] } = useCampuses(true);
  const createMut = useCreateBatch();
  const deleteMut = useDeleteBatch();

  const linkedCampuses = course?.campuses ?? [];
  const eligibleCampuses = campuses.filter((cp) => linkedCampuses.some((lc) => lc.id === cp.id));

  const [name, setName] = useState("");
  const [timing, setTiming] = useState("");
  const [capacity, setCapacity] = useState("");
  const [campusId, setCampusId] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    setName(""); setTiming(""); setCapacity("");
    setCampusId(eligibleCampuses[0]?.id ?? "");
  }, [isOpen, course?.id, eligibleCampuses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalCapacity = batches.reduce((a, b) => a + (b.capacity ?? 0), 0);
  const activeBatches = batches.filter((b) => b.isActive).length;
  const totalStudents = batches.reduce((a, b) => a + (b.studentCount ?? 0), 0);

  const handleAdd = async () => {
    if (!course) return;
    if (!name.trim()) {
      onToast("error", "Batch name is required.");
      return;
    }
    try {
      await createMut.mutateAsync({
        courseId: course.id,
        campusId: campusId || null,
        name: name.trim(),
        timing: timing.trim() || null,
        capacity: capacity === "" ? null : Number(capacity),
        isActive: true,
      });
      onToast("success", "Batch created.");
      setName(""); setTiming(""); setCapacity("");
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to create batch.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this batch?")) return;
    try {
      await deleteMut.mutateAsync(id);
      onToast("success", "Batch deleted.");
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50">
      <div className="bg-white w-full sm:max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-violet-500 p-2 rounded-xl text-white">
            <Layers size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 truncate">Batches</h2>
            <p className="text-[11px] text-slate-400 truncate">{course.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Total" value={batches.length} icon={<Layers size={14} />} accent="bg-[#0B3C5D]" />
            <StatCard label="Active" value={activeBatches} icon={<Users size={14} />} accent="bg-emerald-500" />
            <StatCard label="Capacity" value={totalCapacity || "—"} icon={<Users size={14} />} accent="bg-[#D4AF37]" sub={`${totalStudents} enrolled`} />
          </div>

          {/* Add batch */}
          <Card className="p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Add a batch</p>
            {linkedCampuses.length === 0 ? (
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                Assign at least one campus to this course before creating batches.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldCls}
                      placeholder="e.g. Morning Batch A"
                    />
                  </div>
                  <div>
                    <Label>Campus</Label>
                    <select
                      value={campusId}
                      onChange={(e) => setCampusId(e.target.value)}
                      className={fieldCls}
                    >
                      {eligibleCampuses.map((cp) => (
                        <option key={cp.id} value={cp.id}>{cp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label optional>Capacity</Label>
                    <input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className={fieldCls}
                      placeholder="30"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label optional>Timing</Label>
                    <input
                      value={timing}
                      onChange={(e) => setTiming(e.target.value)}
                      className={fieldCls}
                      placeholder="Mon–Fri 4–6pm"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <PrimaryButton onClick={handleAdd} disabled={createMut.isPending}>
                    {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Batch
                  </PrimaryButton>
                </div>
              </>
            )}
          </Card>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <EmptyState icon={<Layers size={26} />} title="No batches yet" hint="Add the first batch above." />
          ) : (
            <div className="space-y-2">
              {batches.map((b) => {
                const cp = campuses.find((c) => c.id === b.campusId);
                return (
                  <Card key={b.id} className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                      <Layers size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{b.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        {cp && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={10} /> {cp.name}
                          </span>
                        )}
                        {b.timing && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} /> {b.timing}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users size={10} />
                          {b.studentCount ?? 0}{b.capacity ? ` / ${b.capacity}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${b.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {batches.length} batch{batches.length === 1 ? "" : "es"}
          </p>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}
