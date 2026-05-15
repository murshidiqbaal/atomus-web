"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Search, CheckCircle2, User, Mail, Phone, Users, AlertCircle } from "lucide-react";
import { parentSchema, ParentFormValues } from "../schemas";
import { Parent, LinkedStudent } from "../types";
import { generateParentPassword } from "@/lib/utils/password_utils";
import {
  useCreateParent,
  useUpdateParent,
  useUnlinkedStudents,
} from "../hooks";
import { CreateParentResult } from "../services/parent_service";

const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white";
const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";
const errorCls = "mt-1 text-xs text-rose-500";

interface Props {
  parent?: Parent | null;
  onClose: () => void;
  onCreated?: (result: CreateParentResult) => void;
}

export default function ParentModal({ parent, onClose, onCreated }: Props) {
  const isEdit = !!parent;
  const create = useCreateParent();
  const update = useUpdateParent();
  const { data: unlinked = [] } = useUnlinkedStudents();

  const [studentSearch, setStudentSearch] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const presetStudents: LinkedStudent[] = parent?.students ?? [];
  const presetIds = presetStudents.map((s) => s.id);

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentSchema),
    defaultValues: parent
      ? {
          full_name: parent.full_name,
          email: parent.email,
          phone_number: parent.phone_number ?? "",
          account_status: parent.account_status,
          student_ids: presetIds,
          password: "",
        }
      : {
          full_name: "", email: "", phone_number: "",
          account_status: "Active", student_ids: [], password: "",
        },
  });

  const selectedIds = watch("student_ids") ?? [];
  const phone = watch("phone_number") ?? "";
  const fullName = watch("full_name") ?? "";

  const availableStudents: LinkedStudent[] = useMemo(() => {
    const merged = [...unlinked, ...presetStudents.filter((s) => !unlinked.find((u) => u.id === s.id))];
    if (!studentSearch.trim()) return merged;
    const q = studentSearch.toLowerCase();
    return merged.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q)
    );
  }, [unlinked, presetStudents, studentSearch]);

  const previewPassword = useMemo(() => {
    if (isEdit) return "";
    const ref =
      selectedIds.length > 0
        ? availableStudents.find((s) => s.id === selectedIds[0])?.full_name ?? fullName
        : fullName;
    if (!ref || !phone) return "";
    return generateParentPassword(ref, phone);
  }, [selectedIds, availableStudents, fullName, phone, isEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleStudent(id: string) {
    const current = selectedIds;
    setValue(
      "student_ids",
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
      { shouldValidate: true, shouldDirty: true }
    );
  }

  async function onSubmit(values: ParentFormValues) {
    setServerError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: parent!.id, values });
        onClose();
      } else {
        const result = await create.mutateAsync(values);
        onCreated?.(result);
        onClose();
      }
    } catch (err: any) {
      setServerError(err?.message ?? "Something went wrong.");
    }
  }

  const isPending = isSubmitting || create.isPending || update.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">{isEdit ? "Edit Parent" : "Add Parent"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing ${parent!.full_name}` : "Create a parent account and optionally link students"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {serverError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 font-medium">{serverError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}><User size={12} /> Parent Full Name *</label>
                <input {...register("full_name")} placeholder="e.g. Ahmed Khan" className={inputCls} />
                {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
              </div>
              <div>
                <label className={labelCls}><Mail size={12} /> Email *</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="parent@example.com"
                  disabled={isEdit}
                  className={`${inputCls} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                />
                {errors.email && <p className={errorCls}>{errors.email.message}</p>}
              </div>
              <div>
                <label className={labelCls}><Phone size={12} /> Phone (login ID) *</label>
                <input {...register("phone_number")} type="tel" placeholder="+92 300 1234567" className={inputCls} />
                {errors.phone_number && <p className={errorCls}>{errors.phone_number.message}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Account Status</label>
                <select {...register("account_status")} className={inputCls}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}><Users size={12} /> Link Students {isEdit ? "(currently linked + unlinked)" : "(optional)"}</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or roll number..."
                  className={`${inputCls} pl-8`}
                />
              </div>
              <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                {availableStudents.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-6">
                    {unlinked.length === 0 && !isEdit ? "All students are already linked to a parent" : "No matches"}
                  </p>
                ) : (
                  availableStudents.map((s) => {
                    const selected = selectedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${
                          selected ? "bg-[#0B3C5D]/5 text-[#0B3C5D]" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{s.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{s.roll_number}</p>
                        </div>
                        {selected && <CheckCircle2 size={16} className="text-[#0B3C5D] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              {selectedIds.length > 0 && (
                <p className="text-xs text-[#0B3C5D] font-bold">{selectedIds.length} student(s) selected</p>
              )}
            </div>

            {!isEdit && (
              <div className="bg-gradient-to-br from-[#0B3C5D]/5 to-[#D4AF37]/5 rounded-2xl border border-[#0B3C5D]/10 p-4 space-y-2">
                <p className="text-[11px] font-black text-[#0B3C5D] uppercase tracking-wider">Password (auto-generated)</p>
                <p className="text-[10px] text-slate-500">
                  Formula: <code className="bg-white px-1 rounded text-[#D4AF37] font-bold">First3LettersOfStudent + Last5DigitsOfPhone</code>
                </p>
                <div className="flex items-center gap-2 bg-white border border-[#0B3C5D]/20 rounded-xl px-3 py-2.5">
                  <code className="font-mono font-black text-[#0B3C5D] text-base flex-1">
                    {previewPassword || "—"}
                  </code>
                  {previewPassword && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle2 size={10} /> READY
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Override if needed:
                </p>
                <input
                  {...register("password")}
                  type="text"
                  placeholder="Leave blank to use formula"
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-[#0B3C5D] text-white rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={15} className="animate-spin" />}
                {isEdit ? "Save Changes" : "Create Parent Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
