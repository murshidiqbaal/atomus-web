"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { studentRepository } from "@/lib/repositories/student_repository";

// ── Schema ────────────────────────────────────────────────────
const schema = z.object({
  full_name:    z.string().min(2, "Name must be at least 2 characters"),
  roll_number:  z.string().min(1, "Roll number is required"),
  course_id:    z.string().min(1, "Select a course"),
  batch_id:     z.string().min(1, "Select a batch"),
  email:        z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone_number: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Reusable field wrapper ────────────────────────────────────
function Field({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ── Input className helper ────────────────────────────────────
const inputCls = (hasError?: boolean) =>
  `w-full px-3 py-2.5 text-sm rounded-lg border bg-white outline-none transition-all
   focus:ring-2 focus:ring-[#0B3C5D]/15 focus:border-[#0B3C5D]
   ${hasError ? "border-rose-300 bg-rose-50/40" : "border-slate-200 hover:border-slate-300"}`;

// ── Component ─────────────────────────────────────────────────
export default function AddStudentModal({ isOpen, onClose, onSuccess }: Props) {
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "", roll_number: "", course_id: "",
      batch_id: "", email: "", phone_number: "",
    },
  });

  const selectedCourse = watch("course_id");

  // Load courses on open
  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from("courses")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCourses(data ?? []));
  }, [isOpen]);

  // Load batches when course changes
  useEffect(() => {
    if (!selectedCourse) { setBatches([]); return; }
    setLoadingBatches(true);
    supabase
      .from("batches")
      .select("id, name")
      .eq("course_id", selectedCourse)
      .order("name")
      .then(({ data }) => { setBatches(data ?? []); setLoadingBatches(false); });
  }, [selectedCourse]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) { reset(); setServerError(""); setBatches([]); }
  }, [isOpen, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      await studentRepository.insertStudent({
        full_name:    values.full_name,
        roll_number:  values.roll_number,
        course_id:    values.course_id,
        batch_id:     values.batch_id,
        email:        values.email || undefined,
        phone_number: values.phone_number || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.message ?? "Something went wrong. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0B3C5D]">Add Student</h2>
            <p className="text-xs text-slate-400 mt-0.5">Fill in the details to enroll a new student.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-5 py-4 space-y-4">

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Row 1 — Full Name + Roll Number */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" error={errors.full_name?.message}>
                <input
                  {...register("full_name")}
                  placeholder="e.g. Zainab Ahmed"
                  className={inputCls(!!errors.full_name)}
                />
              </Field>
              <Field label="Roll Number" error={errors.roll_number?.message}>
                <input
                  {...register("roll_number")}
                  placeholder="e.g. 2026-01"
                  className={inputCls(!!errors.roll_number)}
                />
              </Field>
            </div>

            {/* Row 2 — Course + Batch */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Course" error={errors.course_id?.message}>
                <select {...register("course_id")} className={inputCls(!!errors.course_id)}>
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Batch" error={errors.batch_id?.message}>
                <select
                  {...register("batch_id")}
                  disabled={!selectedCourse || loadingBatches}
                  className={`${inputCls(!!errors.batch_id)} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {loadingBatches ? "Loading…" : !selectedCourse ? "Select course first" : "Select batch"}
                  </option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Row 3 — Email */}
            <Field label="Email (optional)" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="student@example.com"
                className={inputCls(!!errors.email)}
              />
            </Field>

            {/* Row 4 — Phone */}
            <Field label="Phone Number (optional)" error={errors.phone_number?.message}>
              <input
                {...register("phone_number")}
                type="tel"
                placeholder="+92 300 0000000"
                className={inputCls(!!errors.phone_number)}
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#0B3C5D] rounded-lg
                         hover:bg-[#0B3C5D]/90 active:scale-[0.98] transition-all shadow-md shadow-blue-900/20
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                "Add Student"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
