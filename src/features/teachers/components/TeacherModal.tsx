"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Camera, UserCircle, AlertCircle, User, Mail, Phone, GraduationCap } from "lucide-react";
import { teacherSchema, TeacherFormValues } from "../schemas";
import { Teacher, TeacherCredentials } from "../types";
import {
  useTeacherCourses, useTeacherSubjects, useTeacherBatches,
  useCreateTeacher, useUpdateTeacher,
} from "../hooks";
import MultiSelect from "./MultiSelect";
import TeacherCredentialsModal from "./TeacherCredentialsModal";

const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white";
const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5";
const errorCls = "mt-1 text-xs text-rose-500";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-black text-[#0B3C5D] uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

interface Props {
  teacher?: Teacher | null;
  onClose: () => void;
}

export default function TeacherModal({ teacher, onClose }: Props) {
  const isEdit = !!teacher;

  const { data: courses = [] }  = useTeacherCourses();
  const { data: subjects = [] } = useTeacherSubjects();
  const { data: batches = [] }  = useTeacherBatches();

  const create = useCreateTeacher();
  const update = useUpdateTeacher();

  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(teacher?.profile_image ?? null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<TeacherCredentials | null>(null);

  const defaultCourses  = useMemo(() => (teacher?.teacher_courses  ?? []).map((c) => c.courses?.id).filter(Boolean) as string[], [teacher]);
  const defaultSubjects = useMemo(() => (teacher?.teacher_subjects ?? []).map((s) => s.subjects?.id).filter(Boolean) as string[], [teacher]);
  const defaultBatches  = useMemo(() => (teacher?.teacher_batches  ?? []).map((b) => b.batches?.id).filter(Boolean) as string[], [teacher]);

  const {
    register, handleSubmit, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: teacher
      ? {
          full_name: teacher.full_name,
          email: teacher.email,
          phone_number: teacher.phone_number ?? "",
          qualification: teacher.qualification ?? "",
          gender: (teacher.gender ?? "") as any,
          address: teacher.address ?? "",
          experience_years: teacher.experience_years ?? 0,
          subject_specialization: teacher.subject_specialization ?? "",
          account_status: teacher.account_status,
          course_ids: defaultCourses,
          subject_ids: defaultSubjects,
          batch_ids: defaultBatches,
        }
      : {
          full_name: "", email: "", phone_number: "", qualification: "",
          gender: "" as any, address: "", experience_years: 0, subject_specialization: "",
          account_status: "Active",
          course_ids: [], subject_ids: [], batch_ids: [],
        },
  });

  const selectedCourseIds = watch("course_ids");

  const subjectOptions = useMemo(() => {
    const filtered = selectedCourseIds.length
      ? subjects.filter((s) => selectedCourseIds.includes(s.course_id))
      : subjects;
    return filtered.map((s) => ({ id: s.id, name: s.name, hint: s.courses?.name ?? undefined }));
  }, [subjects, selectedCourseIds]);

  const batchOptions = useMemo(() => {
    const filtered = selectedCourseIds.length
      ? batches.filter((b) => selectedCourseIds.includes(b.course_id))
      : batches;
    return filtered.map((b) => ({ id: b.id, name: b.name }));
  }, [batches, selectedCourseIds]);

  const courseOptions = useMemo(() => courses.map((c) => ({ id: c.id, name: c.name })), [courses]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: TeacherFormValues) {
    setServerError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: teacher!.id, values, photoFile: photoFile ?? undefined });
        onClose();
      } else {
        const result = await create.mutateAsync({ values, photoFile: photoFile ?? undefined });
        if (!result.existed) {
          setCredentials({ email: result.teacher.email, password: result.password, fullName: result.teacher.full_name });
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setServerError(err?.message ?? "Something went wrong.");
    }
  }

  const isPending = isSubmitting || create.isPending || update.isPending;

  if (credentials) {
    return (
      <TeacherCredentialsModal credentials={credentials} onClose={() => { setCredentials(null); onClose(); }} />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">{isEdit ? "Edit Teacher" : "Add Teacher"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing ${teacher!.full_name}` : "Create a teacher account with login credentials"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {serverError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 font-medium">{serverError}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0B3C5D]/20" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#0B3C5D]/8 flex items-center justify-center border-2 border-dashed border-[#0B3C5D]/20">
                    <UserCircle size={32} className="text-[#0B3C5D]/40" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#0B3C5D] text-white rounded-lg flex items-center justify-center shadow-md hover:bg-[#0B3C5D]/90 transition-colors"
                >
                  <Camera size={13} />
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Basic Details" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}><User size={12} className="inline mr-1" /> Full Name *</label>
                  <input {...register("full_name")} placeholder="e.g. Prof. Ahmad Raza" className={inputCls} />
                  {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}><Mail size={12} className="inline mr-1" /> Email *</label>
                  <input {...register("email")} type="email" placeholder="teacher@atomus.edu" disabled={isEdit}
                    className={`${inputCls} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`} />
                  {errors.email && <p className={errorCls}>{errors.email.message}</p>}
                </div>
                <div>
                  <label className={labelCls}><Phone size={12} className="inline mr-1" /> Phone *</label>
                  <input {...register("phone_number")} type="tel" placeholder="+92 300 0000000" className={inputCls} />
                  {errors.phone_number && <p className={errorCls}>{errors.phone_number.message}</p>}
                </div>
                <div>
                  <label className={labelCls}><GraduationCap size={12} className="inline mr-1" /> Qualification *</label>
                  <input {...register("qualification")} placeholder="e.g. M.Sc. Mathematics" className={inputCls} />
                  {errors.qualification && <p className={errorCls}>{errors.qualification.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select {...register("gender")} className={inputCls}>
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Experience (Years)</label>
                  <input {...register("experience_years", { valueAsNumber: true })} type="number" min="0" max="70" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Subject Specialization</label>
                  <input {...register("subject_specialization")} placeholder="e.g. Mathematics, Physics" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input {...register("address")} placeholder="Street, City" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Account Status</label>
                  <select {...register("account_status")} className={inputCls}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Assignments" />
              <Controller
                name="course_ids"
                control={control}
                render={({ field, fieldState }) => (
                  <MultiSelect
                    label="Assigned Courses"
                    options={courseOptions}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Select courses..."
                    error={fieldState.error?.message}
                  />
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="subject_ids"
                  control={control}
                  render={({ field, fieldState }) => (
                    <MultiSelect
                      label="Assigned Subjects"
                      options={subjectOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Select subjects..."
                      error={fieldState.error?.message}
                      emptyHint={selectedCourseIds.length ? "No subjects in selected courses" : "No subjects available"}
                    />
                  )}
                />
                <Controller
                  name="batch_ids"
                  control={control}
                  render={({ field, fieldState }) => (
                    <MultiSelect
                      label="Assigned Batches"
                      options={batchOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Select batches..."
                      error={fieldState.error?.message}
                      emptyHint={selectedCourseIds.length ? "No batches in selected courses" : "No batches available"}
                    />
                  )}
                />
              </div>
              {selectedCourseIds.length === 0 && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Tip: select courses first to narrow subject/batch lists.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-[#0B3C5D] text-white rounded-xl text-sm font-bold hover:bg-[#0B3C5D]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={15} className="animate-spin" />}
                {isEdit ? "Save Changes" : "Create Teacher Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
