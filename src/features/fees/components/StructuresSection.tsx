"use client";

import { useState } from "react";
import {
  BookOpen, Plus, Trash2, Loader2, Users, Receipt, AlertTriangle,
} from "lucide-react";
import {
  useBulkAssign,
  useCreateFeeStructure,
  useDeleteFeeStructure,
  useFeeBatches,
  useFeeCampuses,
  useFeeCourses,
  useFeeStructures,
} from "../hooks";
import { FeeFilters, FeeStructure, formatINR, inferCadence } from "../types";
import { Card, EmptyState, fieldCls, Label } from "./ui";

interface Props {
  filters: FeeFilters;
  onToast: (type: "success" | "error", msg: string) => void;
}

export function StructuresSection({ filters, onToast }: Props) {
  const { data: structures = [], isLoading } = useFeeStructures({
    campus_id: filters.campus_id,
    course_id: filters.course_id,
    batch_id: filters.batch_id,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 h-40 animate-pulse" />
            ))}
          </div>
        ) : structures.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={26} />}
            title="No fee structures yet"
            hint="Create your first structure on the right →"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {structures.map((s) => (
              <StructureCard key={s.id} structure={s} onToast={onToast} />
            ))}
          </div>
        )}
      </div>

      <CreateStructureCard onToast={onToast} />
    </div>
  );
}

function StructureCard({
  structure, onToast,
}: { structure: FeeStructure; onToast: (t: "success" | "error", m: string) => void }) {
  const del = useDeleteFeeStructure();
  const bulk = useBulkAssign();
  const [confirming, setConfirming] = useState(false);

  const onAssign = () => {
    bulk.mutate(structure.id, {
      onSuccess: (r) => {
        if (r.assigned === 0) {
          onToast("success", `All ${r.skipped} students already assigned.`);
        } else {
          onToast("success", `Assigned to ${r.assigned} students (${r.skipped} already had a row).`);
        }
      },
      onError: (e) => onToast("error", e instanceof Error ? e.message : "Bulk assign failed."),
    });
  };

  const onDelete = () => {
    del.mutate(structure.id, {
      onSuccess: () => onToast("success", "Structure deleted."),
      onError: (e) => onToast("error", e instanceof Error ? e.message : "Delete failed."),
    });
  };

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">
            {structure.courses?.name ?? "Course"}
          </p>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
            {structure.batches?.name ?? "All batches"} · {inferCadence(structure.installment_count)}
          </p>
        </div>
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          {structure.installment_count}x
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={formatINR(structure.total_amount)} accent="text-[#0B3C5D]" />
        <Stat label="Admission" value={formatINR(structure.admission_fee)} accent="text-slate-700" />
        <Stat label="Monthly" value={formatINR(structure.monthly_fee)} accent="text-[#D4AF37]" />
      </div>

      <div className="text-[11px] text-slate-400">
        Due on day <span className="font-bold text-slate-600">{structure.due_date_day}</span> of each month
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onAssign}
          disabled={bulk.isPending || !structure.batch_id}
          title={structure.batch_id ? "Assign to all students in this batch" : "Set a batch first"}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {bulk.isPending ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
          Assign to batch
        </button>
        {confirming ? (
          <>
            <button
              onClick={onDelete}
              disabled={del.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50"
            >
              {del.isPending ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center px-2.5 py-1.5 text-rose-500 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
            title="Delete structure"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className={`text-xs font-black tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function CreateStructureCard({
  onToast,
}: { onToast: (t: "success" | "error", m: string) => void }) {
  const create = useCreateFeeStructure();
  const [campus_id, setCampus] = useState("");
  const [course_id, setCourse] = useState("");
  const [batch_id, setBatch] = useState("");
  const [total_amount, setTotal] = useState("");
  const [admission_fee, setAdmission] = useState("");
  const [monthly_fee, setMonthly] = useState("");
  const [installment_count, setInstallments] = useState("12");
  const [due_date_day, setDueDay] = useState("10");

  const { data: campuses = [] } = useFeeCampuses();
  const { data: courses = [] } = useFeeCourses(campus_id);
  const { data: batches = [] } = useFeeBatches(course_id, campus_id);

  const reset = () => {
    setCourse(""); setBatch("");
    setTotal(""); setAdmission(""); setMonthly("");
    setInstallments("12"); setDueDay("10");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!course_id) {
      onToast("error", "Pick a course.");
      return;
    }
    const total = Number(total_amount);
    const admission = Number(admission_fee || 0);
    const monthly = Number(monthly_fee || 0);
    const count = Number(installment_count || 1);
    const day = Number(due_date_day || 10);

    if (!Number.isFinite(total) || total <= 0) {
      onToast("error", "Total amount must be positive.");
      return;
    }
    if (count < 1 || count > 36) {
      onToast("error", "Installment count must be between 1 and 36.");
      return;
    }
    if (day < 1 || day > 28) {
      onToast("error", "Due day must be between 1 and 28.");
      return;
    }

    create.mutate(
      {
        course_id,
        batch_id: batch_id || null,
        total_amount: total,
        admission_fee: admission,
        monthly_fee: monthly,
        installment_count: count,
        due_date_day: day,
      },
      {
        onSuccess: () => {
          onToast("success", "Fee structure created.");
          reset();
        },
        onError: (err) =>
          onToast("error", err instanceof Error ? err.message : "Create failed."),
      },
    );
  };

  return (
    <Card className="p-5 h-fit lg:sticky lg:top-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-[#0B3C5D] text-white">
          <Receipt size={16} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 leading-tight">New Structure</h3>
          <p className="text-[11px] text-slate-400">Course + batch + amounts</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Campus (optional, scopes courses)</Label>
          <select
            value={campus_id}
            onChange={(e) => { setCampus(e.target.value); setCourse(""); setBatch(""); }}
            className={fieldCls}
          >
            <option value="">All campuses</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <Label>Course</Label>
          <select
            value={course_id}
            onChange={(e) => { setCourse(e.target.value); setBatch(""); }}
            className={fieldCls}
            required
          >
            <option value="">Select course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <Label>Batch (optional)</Label>
          <select
            value={batch_id}
            onChange={(e) => setBatch(e.target.value)}
            disabled={!course_id}
            className={`${fieldCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">{course_id ? "All batches" : "Pick course first"}</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!batch_id && course_id && (
            <p className="mt-1 text-[10px] text-amber-600 font-bold inline-flex items-center gap-1">
              <AlertTriangle size={10} /> Bulk assign needs a batch
            </p>
          )}
        </div>

        <div>
          <Label>Total Amount (₹)</Label>
          <input
            type="number"
            value={total_amount}
            onChange={(e) => setTotal(e.target.value)}
            className={fieldCls}
            placeholder="50000"
            required
            min="1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Admission</Label>
            <input
              type="number"
              value={admission_fee}
              onChange={(e) => setAdmission(e.target.value)}
              className={fieldCls}
              placeholder="10000"
              min="0"
            />
          </div>
          <div>
            <Label>Monthly</Label>
            <input
              type="number"
              value={monthly_fee}
              onChange={(e) => setMonthly(e.target.value)}
              className={fieldCls}
              placeholder="5000"
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Installments</Label>
            <input
              type="number"
              value={installment_count}
              onChange={(e) => setInstallments(e.target.value)}
              className={fieldCls}
              min="1"
              max="36"
            />
          </div>
          <div>
            <Label>Due Day</Label>
            <input
              type="number"
              value={due_date_day}
              onChange={(e) => setDueDay(e.target.value)}
              className={fieldCls}
              min="1"
              max="28"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={create.isPending}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0B3C5D] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#0B3C5D]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Save Structure
        </button>
      </form>
    </Card>
  );
}
