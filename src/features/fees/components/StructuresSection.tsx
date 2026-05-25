"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Plus, Trash2, Loader2, Users, Receipt, RefreshCw, Pencil, X,
} from "lucide-react";
import {
  useAssignStructureToScope,
  useCreateFeeStructure,
  useDeleteFeeStructure,
  useFeeCampuses,
  useFeeCourses,
  useFeeStructures,
  useUpdateFeeStructure,
} from "../hooks";
import {
  FEE_FREQUENCIES,
  FeeFilters,
  FeeFrequency,
  FeeStructure,
  FeeStructureInsert,
  FREQUENCY_DEFAULT_COUNT,
  TermDetail,
  formatINR,
} from "../types";
import { Card, EmptyState, fieldCls, Label } from "./ui";

interface Props {
  filters: FeeFilters;
  onToast: (type: "success" | "error", msg: string) => void;
}

export function StructuresSection({ filters, onToast }: Props) {
  const { data: structures = [], isLoading } = useFeeStructures({
    campus_id: filters.campus_id,
    course_id: filters.course_id,
  });
  const [editing, setEditing] = useState<FeeStructure | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 h-44 animate-pulse" />
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
              <StructureCard
                key={s.id}
                structure={s}
                onToast={onToast}
                onEdit={() => setEditing(s)}
              />
            ))}
          </div>
        )}
      </div>

      <StructureFormCard
        key={editing?.id ?? "new"}
        editing={editing}
        onClear={() => setEditing(null)}
        onToast={onToast}
      />
    </div>
  );
}

function StructureCard({
  structure, onToast, onEdit,
}: {
  structure: FeeStructure;
  onToast: (t: "success" | "error", m: string) => void;
  onEdit: () => void;
}) {
  const del = useDeleteFeeStructure();
  const assign = useAssignStructureToScope();
  const [confirming, setConfirming] = useState(false);

  const onAssign = () => {
    assign.mutate(structure.id, {
      onSuccess: (r) => {
        if (r.assigned === 0) {
          onToast("success", `All ${r.skipped} matching students already have a fee row.`);
        } else {
          onToast("success", `Assigned to ${r.assigned} students (${r.skipped} already assigned).`);
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

  const title = structure.name?.trim()
    || structure.courses?.name
    || "Untitled Structure";

  const termsCount = structure.term_details?.length ?? structure.term_count ?? 0;

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{title}</p>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
            {structure.campuses?.name ?? "All campuses"} · {structure.courses?.name ?? "Universal / Manual"}
          </p>
        </div>
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          {structure.fee_frequency}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={formatINR(structure.total_amount)} accent="text-[#0B3C5D]" />
        <Stat label="Admission" value={formatINR(structure.admission_fee)} accent="text-slate-700" />
        <Stat label="Terms" value={`${termsCount}x`} accent="text-[#D4AF37]" />
      </div>

      {structure.term_details && structure.term_details.length > 0 && (
        <ul className="text-[11px] text-slate-500 space-y-0.5 max-h-24 overflow-y-auto pr-1">
          {structure.term_details.slice(0, 4).map((t, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{t.term_name}</span>
              <span className="font-bold tabular-nums text-slate-700">{formatINR(t.amount)}</span>
            </li>
          ))}
          {structure.term_details.length > 4 && (
            <li className="text-slate-400">+ {structure.term_details.length - 4} more…</li>
          )}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onAssign}
          disabled={assign.isPending || !structure.course_id}
          title="Assign to all matching students (Campus + Course)"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0B3C5D] rounded-xl hover:bg-[#0B3C5D]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {assign.isPending ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
          Assign
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100"
        >
          <Pencil size={12} />
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
            className="inline-flex items-center px-2.5 py-1.5 text-rose-500 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all"
            title="Delete"
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

// ── Form ─────────────────────────────────────────────────────────
function defaultTerms(count: number, frequency: FeeFrequency): TermDetail[] {
  const baseName = (i: number): string => {
    if (frequency === "Monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = (new Date().getMonth() + i) % 12;
      return monthNames[m];
    }
    if (frequency === "Quarterly") return `Q${i + 1}`;
    if (frequency === "Half-Yearly") return i === 0 ? "H1" : "H2";
    if (frequency === "Yearly") return "Yearly";
    return `Term ${i + 1}`;
  };
  return Array.from({ length: count }, (_, i) => ({
    term_name: baseName(i),
    amount: 0,
    due_day: 10,
  }));
}

function StructureFormCard({
  editing, onClear, onToast,
}: {
  editing: FeeStructure | null;
  onClear: () => void;
  onToast: (t: "success" | "error", m: string) => void;
}) {
  const create = useCreateFeeStructure();
  const update = useUpdateFeeStructure();
  const isEditing = !!editing;

  const [name, setName] = useState(editing?.name ?? "");
  const [campusId, setCampusId] = useState(editing?.campus_id ?? "");
  const [courseId, setCourseId] = useState(editing?.course_id ?? "");
  const [frequency, setFrequency] = useState<FeeFrequency>(
    editing?.fee_frequency ?? "Monthly",
  );
  const [termCount, setTermCount] = useState<number>(
    editing?.term_count ?? FREQUENCY_DEFAULT_COUNT.Monthly,
  );
  const [terms, setTerms] = useState<TermDetail[]>(
    editing?.term_details && editing.term_details.length > 0
      ? editing.term_details
      : defaultTerms(FREQUENCY_DEFAULT_COUNT[editing?.fee_frequency ?? "Monthly"], editing?.fee_frequency ?? "Monthly"),
  );
  const [admissionFee, setAdmissionFee] = useState<string>(
    String(editing?.admission_fee ?? ""),
  );

  const { data: campuses = [] } = useFeeCampuses();
  const { data: courses = [] } = useFeeCourses(campusId);

  // When frequency changes (and we're not editing), reset terms to defaults.
  useEffect(() => {
    if (isEditing) return;
    const defaultCount = FREQUENCY_DEFAULT_COUNT[frequency];
    setTermCount(defaultCount);
    setTerms(defaultTerms(defaultCount, frequency));
  }, [frequency, isEditing]);

  // Sync term count <-> terms array length.
  const onChangeTermCount = (n: number) => {
    const clamped = Math.max(1, Math.min(36, Math.round(n) || 1));
    setTermCount(clamped);
    setTerms((prev) => {
      if (clamped === prev.length) return prev;
      if (clamped < prev.length) return prev.slice(0, clamped);
      const extra = Array.from({ length: clamped - prev.length }, (_, i) => ({
        term_name: `Term ${prev.length + i + 1}`,
        amount: 0,
        due_day: 10,
      }));
      return [...prev, ...extra];
    });
  };

  const setTerm = (i: number, patch: Partial<TermDetail>) => {
    setTerms((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const addTerm = () => {
    setTerms((prev) => [...prev, { term_name: `Term ${prev.length + 1}`, amount: 0, due_day: 10 }]);
    setTermCount((c) => c + 1);
  };

  const removeTerm = (i: number) => {
    setTerms((prev) => prev.filter((_, idx) => idx !== i));
    setTermCount((c) => Math.max(1, c - 1));
  };

  const termsTotal = useMemo(
    () => terms.reduce((a, t) => a + (Number(t.amount) || 0), 0),
    [terms],
  );
  const admission = Number(admissionFee || 0);
  const total = admission + termsTotal;

  const resetForm = () => {
    setName("");
    setCampusId("");
    setCourseId("");
    setFrequency("Monthly");
    setTermCount(FREQUENCY_DEFAULT_COUNT.Monthly);
    setTerms(defaultTerms(FREQUENCY_DEFAULT_COUNT.Monthly, "Monthly"));
    setAdmissionFee("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onToast("error", "Structure name is required.");
      return;
    }
    if (!terms.length) {
      onToast("error", "Add at least one term.");
      return;
    }
    for (const [i, t] of terms.entries()) {
      if (!t.term_name.trim()) {
        onToast("error", `Term ${i + 1} needs a name.`);
        return;
      }
      if (!Number.isFinite(Number(t.amount)) || Number(t.amount) < 0) {
        onToast("error", `Term ${i + 1} has an invalid amount.`);
        return;
      }
      if (t.due_day < 1 || t.due_day > 28) {
        onToast("error", `Term ${i + 1} due day must be 1–28.`);
        return;
      }
    }

    const payload: FeeStructureInsert = {
      name: name.trim(),
      campus_id: campusId || null,
      course_id: courseId || null,
      fee_frequency: frequency,
      term_count: terms.length,
      term_details: terms.map((t) => ({
        term_name: t.term_name.trim(),
        amount: Number(t.amount) || 0,
        due_day: Number(t.due_day) || 10,
      })),
      total_amount: total,
      admission_fee: admission,
      is_active: editing?.is_active ?? true,
    };

    if (isEditing && editing) {
      update.mutate(
        { id: editing.id, input: payload },
        {
          onSuccess: () => {
            onToast("success", "Structure updated.");
            onClear();
            resetForm();
          },
          onError: (err) =>
            onToast("error", err instanceof Error ? err.message : "Update failed."),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          onToast("success", "Fee structure created.");
          resetForm();
        },
        onError: (err) =>
          onToast("error", err instanceof Error ? err.message : "Create failed."),
      });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Card className="p-5 h-fit lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-[#0B3C5D] text-white">
          <Receipt size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-800 leading-tight truncate">
            {isEditing ? "Edit Structure" : "New Structure"}
          </h3>
          <p className="text-[11px] text-slate-400 truncate">
            {isEditing ? editing!.name ?? "Editing existing" : "Campus + Course + Terms"}
          </p>
        </div>
        {isEditing && (
          <button
            onClick={() => { onClear(); resetForm(); }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            title="Cancel edit"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Structure Name</Label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldCls}
            placeholder="e.g. 10th Regular State"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Campus</Label>
            <select
              value={campusId}
              onChange={(e) => { setCampusId(e.target.value); setCourseId(""); }}
              className={fieldCls}
            >
              <option value="">All campuses</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Course (Optional)</Label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className={fieldCls}
            >
              <option value="">Universal / Manual (all courses)</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Frequency</Label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FeeFrequency)}
              className={fieldCls}
            >
              {FEE_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label>Term Count</Label>
            <input
              type="number"
              value={termCount}
              onChange={(e) => onChangeTermCount(Number(e.target.value))}
              className={fieldCls}
              min={1}
              max={36}
            />
          </div>
        </div>

        <div>
          <Label>Admission Fee (₹)</Label>
          <input
            type="number"
            value={admissionFee}
            onChange={(e) => setAdmissionFee(e.target.value)}
            className={fieldCls}
            placeholder="0"
            min="0"
          />
        </div>

        {/* Dynamic term list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Terms</Label>
            <button
              type="button"
              onClick={addTerm}
              className="text-[11px] font-bold text-[#0B3C5D] inline-flex items-center gap-1 hover:underline"
            >
              <Plus size={11} /> Add term
            </button>
          </div>
          <ul className="space-y-2">
            {terms.map((t, i) => (
              <li key={i} className="grid grid-cols-[1fr_90px_64px_28px] gap-1.5 items-end">
                <input
                  type="text"
                  value={t.term_name}
                  onChange={(e) => setTerm(i, { term_name: e.target.value })}
                  className={`${fieldCls} text-xs py-1.5 px-2`}
                  placeholder={`Term ${i + 1}`}
                  required
                />
                <input
                  type="number"
                  value={t.amount}
                  onChange={(e) => setTerm(i, { amount: Number(e.target.value) })}
                  className={`${fieldCls} text-xs py-1.5 px-2 tabular-nums`}
                  placeholder="₹"
                  min="0"
                  required
                />
                <input
                  type="number"
                  value={t.due_day}
                  onChange={(e) => setTerm(i, { due_day: Number(e.target.value) })}
                  className={`${fieldCls} text-xs py-1.5 px-2 tabular-nums`}
                  placeholder="Day"
                  min={1}
                  max={28}
                  title="Due day of month"
                />
                <button
                  type="button"
                  onClick={() => removeTerm(i)}
                  disabled={terms.length <= 1}
                  className="p-1.5 text-rose-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-400 font-bold uppercase tracking-widest">Total</span>
          <span className="font-black tabular-nums text-[#0B3C5D]">{formatINR(total)}</span>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#0B3C5D] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#0B3C5D]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending
            ? <Loader2 size={14} className="animate-spin" />
            : isEditing ? <RefreshCw size={14} /> : <Plus size={14} />}
          {isEditing ? "Save Changes" : "Save Structure"}
        </button>
      </form>
    </Card>
  );
}
