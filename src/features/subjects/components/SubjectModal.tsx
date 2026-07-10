"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { subjectSchema, SubjectFormValues } from "../schemas";
import { Subject } from "../types";
import { subjectService } from "../services/subject_service";
import { useCourses, useCreateSubject, useUpdateSubject } from "../hooks";

const CLASS_LEVELS = ["8", "9", "10", "+1", "+2"] as const;
const SUBJECT_TYPES = ["Core", "Theory", "Practical", "Language"] as const;

interface Props {
  subject?: Subject | null;
  onClose: () => void;
}

export default function SubjectModal({ subject, onClose }: Props) {
  const isEdit = !!subject;
  const { data: courses = [] } = useCourses();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const [dupError, setDupError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subject
      ? {
          name: subject.name,
          subject_code: subject.subject_code || "",
          course_id: subject.course_id,
          class_level: (subject.class_level || "10") as any,
          subject_type: subject.subject_type,
          is_active: subject.is_active,
        }
      : {
          name: "",
          subject_code: "",
          course_id: "",
          class_level: "8",
          subject_type: "Core",
          is_active: true,
        },
  });

  const selectedCourseId = watch("course_id");

  useEffect(() => {
    if (selectedCourseId && courses.length > 0) {
      const shouldDerive = !isEdit || !subject?.class_level;
      if (shouldDerive) {
        const selectedCourse = courses.find((c) => c.id === selectedCourseId);
        if (selectedCourse) {
          const combined = `${selectedCourse.name} ${selectedCourse.class_level || ""}`.toLowerCase();
          let derived: "8" | "9" | "10" | "+1" | "+2" = "8";
          if (combined.includes("10") || combined.includes("10th") || combined.includes("sslc")) {
            derived = "10";
          } else if (combined.includes("+1") || combined.includes("plus one") || combined.includes("11") || combined.includes("11th")) {
            derived = "+1";
          } else if (combined.includes("+2") || combined.includes("plus two") || combined.includes("12") || combined.includes("12th")) {
            derived = "+2";
          } else if (combined.includes("9") || combined.includes("9th")) {
            derived = "9";
          } else if (combined.includes("8") || combined.includes("8th")) {
            derived = "8";
          }
          setValue("class_level", derived, { shouldValidate: true });
        }
      }
    }
  }, [selectedCourseId, courses, setValue, isEdit, subject]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(values: SubjectFormValues) {
    setDupError(null);

    const { nameDuplicate, codeDuplicate } = await subjectService.checkDuplicates(
      values.name,
      values.course_id,
      values.subject_code,
      isEdit ? subject!.id : undefined
    );

    if (nameDuplicate || codeDuplicate) {
      const parts: string[] = [];
      if (nameDuplicate) parts.push("subject name (for this course)");
      if (codeDuplicate) parts.push("subject code");
      setDupError(`Duplicate ${parts.join(" and ")} already exists.`);
      return;
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: subject!.id, values });
      } else {
        await create.mutateAsync(values);
      }
      onClose();
    } catch {
      setDupError("Something went wrong. Please try again.");
    }
  }

  const isPending = isSubmitting || create.isPending || update.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isEdit ? "Edit Subject" : "Add Subject"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing: ${subject!.subject_code}` : "Create a new subject"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Subject Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Subject Name
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Mathematics"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
            )}
          </div>

          {/* Subject Code */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Subject Code
            </label>
            <input
              {...register("subject_code")}
              placeholder="e.g. MATH101"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all uppercase"
            />
            {errors.subject_code && (
              <p className="mt-1 text-xs text-rose-500">{errors.subject_code.message}</p>
            )}
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Course
            </label>
            <select
              {...register("course_id")}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white"
            >
              <option value="">Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.course_id && (
              <p className="mt-1 text-xs text-rose-500">{errors.course_id.message}</p>
            )}
          </div>

          {/* Class Level */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Class Level
            </label>
            <select
              {...register("class_level")}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white"
            >
              {CLASS_LEVELS.map((cl) => (
                <option key={cl} value={cl}>
                  Class {cl}
                </option>
              ))}
            </select>
            {errors.class_level && (
              <p className="mt-1 text-xs text-rose-500">{errors.class_level.message}</p>
            )}
          </div>

          {/* Subject Type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Subject Type
            </label>
            <select
              {...register("subject_type")}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white"
            >
              {SUBJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.subject_type && (
              <p className="mt-1 text-xs text-rose-500">{errors.subject_type.message}</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 py-1">
            <input
              {...register("is_active")}
              id="is_active"
              type="checkbox"
              className="w-4 h-4 accent-[#0B3C5D] rounded"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Active (visible in system)
            </label>
          </div>

          {/* Duplicate error */}
          {dupError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
              {dupError}
            </div>
          )}

          {/* Actions */}
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
              {isEdit ? "Save Changes" : "Add Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
