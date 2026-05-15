"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Camera, UserCircle, Search, ChevronDown } from "lucide-react";
import { studentSchema, StudentFormValues } from "../schemas";
import { StudentWithRelations } from "../types";
import { studentService } from "../services/student_service";
import { useCourses, useBatchesByCourse, useCreateStudent, useUpdateStudent } from "../hooks";
import CredentialsModal from "@/features/parents/components/CredentialsModal";
import { ParentCredentials } from "@/features/parents/types";

const GENDERS = ["Male", "Female", "Other"] as const;
const STATUSES = ["Active", "Inactive", "Graduated", "Dropped"] as const;

const inputCls =
  "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all bg-white appearance-none";
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

interface SearchableSelectProps {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  error?: string;
  disabled?: boolean;
}

function SearchableSelect({ label, options, value, onChange, placeholder, error, disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);
  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className={labelCls}>{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`${inputCls} flex items-center justify-between text-left ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
      >
        <span className={!selectedOption ? "text-slate-400" : "text-slate-900"}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className={errorCls}>{error}</p>}

      {open && (
        <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="p-2 border-b border-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border-none rounded-lg outline-none focus:ring-1 focus:ring-[#0B3C5D]/10"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                    value === opt.id ? "text-[#0B3C5D] font-bold bg-[#0B3C5D]/5" : "text-slate-700"
                  }`}
                >
                  {opt.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  student?: StudentWithRelations | null;
  onClose: () => void;
}

export default function StudentModal({ student, onClose }: Props) {
  const isEdit = !!student;
  const { data: courses = [] } = useCourses();
  const create = useCreateStudent();
  const update = useUpdateStudent();

  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rollError, setRollError]   = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [credentials, setCredentials] = useState<{ data: ParentCredentials; emailSent: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          full_name:       student.full_name,
          roll_number:     student.roll_number,
          gender:          student.gender ?? "Male",
          dob:             student.dob ?? "",
          course_id:       student.course_id,
          batch_id:        student.batch_id,
          joining_date:    student.joining_date ?? "",
          academic_status: student.academic_status ?? "Active",
          phone_number:    student.phone_number ?? "",
          email:           student.email ?? "",
          address:         student.address ?? "",
          parent_name:     student.parents?.full_name ?? "",
          parent_email:    student.parents?.email ?? "",
          parent_phone:    student.parents?.phone_number ?? "",
        }
      : {
          full_name: "", roll_number: "", gender: "Male", dob: "",
          course_id: "", batch_id: "", joining_date: "",
          academic_status: "Active", phone_number: "", email: "",
          address: "", parent_name: "", parent_email: "", parent_phone: "",
        },
  });

  const watchedCourse = watch("course_id");
  const watchedBatch  = watch("batch_id");
  const prevCourse    = useRef(isEdit ? student?.course_id : "");
  const { data: batches = [] } = useBatchesByCourse(watchedCourse);

  useEffect(() => {
    if (prevCourse.current && prevCourse.current !== watchedCourse) {
      setValue("batch_id", "");
    }
    prevCourse.current = watchedCourse;
  }, [watchedCourse, setValue]);

  useEffect(() => {
    setPhotoPreview(student?.photo_url ?? null);
    setPhotoFile(null);
    setRollError(null);
  }, [student]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
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
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function onSubmit(values: StudentFormValues) {
    setRollError(null);

    const selectedBatch = batches.find(b => b.id === values.batch_id);
    if (values.course_id && values.batch_id && !selectedBatch) {
      setRollError("Invalid batch selected for this course.");
      return;
    }

    const isDup = await studentService.checkRollDuplicate(
      values.roll_number,
      isEdit ? student!.id : undefined
    );
    if (isDup) {
      setRollError("Roll number already exists.");
      return;
    }

    try {
      const result = isEdit
        ? await update.mutateAsync({ id: student!.id, values, photoFile: photoFile ?? undefined })
        : await create.mutateAsync({ values, photoFile: photoFile ?? undefined });

      const creds = (result as any)._parentCredentials;
      if (creds && !creds.existed) {
        setCredentials({
          data: {
            email: creds.email,
            phone: creds.phone,
            password: creds.password,
            parentName: creds.parentName,
            studentName: creds.studentName,
          },
          emailSent: creds.emailSent,
        });
      } else {
        onClose();
      }
    } catch (err: any) {
      setRollError(err.message ?? "Something went wrong. Please try again.");
    }
  }

  const isPending = isSubmitting || create.isPending || update.isPending;

  if (credentials) {
    return (
      <CredentialsModal
        credentials={credentials.data}
        emailSent={credentials.emailSent}
        onClose={() => { setCredentials(null); onClose(); }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isEdit ? "Edit Student" : "Add Student"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing: ${student!.roll_number}` : "Enroll a new student"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            <div className="flex justify-center">
              <div className="relative group">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-[#0B3C5D]/5 flex items-center justify-center border-2 border-dashed border-[#0B3C5D]/20 group-hover:bg-[#0B3C5D]/8 transition-colors">
                    <UserCircle size={40} className="text-[#0B3C5D]/30" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0B3C5D] text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Basic Details" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Full Name *</label>
                  <input
                    {...register("full_name")}
                    placeholder="e.g. Zainab Ahmed"
                    className={inputCls}
                  />
                  {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Roll Number *</label>
                  <input
                    {...register("roll_number")}
                    placeholder="e.g. 2026-01"
                    className={inputCls}
                  />
                  {(errors.roll_number || rollError) && (
                    <p className={errorCls}>{errors.roll_number?.message ?? rollError}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Gender *</label>
                  <div className="relative">
                    <select {...register("gender")} className={inputCls}>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.gender && <p className={errorCls}>{errors.gender.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input {...register("dob")} type="date" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Academic Details" />
              <div className="grid grid-cols-2 gap-4">
                <SearchableSelect
                  label="Course *"
                  options={courses}
                  value={watchedCourse}
                  onChange={(id) => setValue("course_id", id)}
                  placeholder="Select course..."
                  error={errors.course_id?.message}
                />
                <SearchableSelect
                  label="Batch *"
                  options={batches}
                  value={watchedBatch}
                  onChange={(id) => setValue("batch_id", id)}
                  placeholder={!watchedCourse ? "Select course first" : "Select batch..."}
                  disabled={!watchedCourse}
                  error={errors.batch_id?.message}
                />
                <div>
                  <label className={labelCls}>Joining Date *</label>
                  <input {...register("joining_date")} type="date" className={inputCls} />
                  {errors.joining_date && <p className={errorCls}>{errors.joining_date.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Academic Status *</label>
                  <div className="relative">
                    <select {...register("academic_status")} className={inputCls}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.academic_status && <p className={errorCls}>{errors.academic_status.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Contact Details" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Student Phone</label>
                  <input
                    {...register("phone_number")}
                    type="tel"
                    placeholder="+92 300 0000000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Student Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="student@example.com"
                    className={inputCls}
                  />
                  {errors.email && <p className={errorCls}>{errors.email.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input
                    {...register("address")}
                    placeholder="Street, City"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Parent / Guardian" />
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-[#0B3C5D]/60 uppercase tracking-widest mb-3">Linked Parent Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Parent Name</label>
                    <input
                      {...register("parent_name")}
                      placeholder="e.g. Ahmed Khan"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Parent Email</label>
                    <input
                      {...register("parent_email")}
                      type="email"
                      placeholder="parent@example.com"
                      className={inputCls}
                    />
                    {errors.parent_email && <p className={errorCls}>{errors.parent_email.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Parent Phone</label>
                    <input
                      {...register("parent_phone")}
                      type="tel"
                      placeholder="+92 300 0000000"
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                  A parent account will be auto-linked based on the email provided. If no account exists, one will be created and credentials will be sent to the parent.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-[2] px-4 py-3 bg-[#0B3C5D] text-white rounded-xl text-sm font-black hover:bg-[#0B3C5D]/90 disabled:opacity-60 transition-all shadow-lg shadow-[#0B3C5D]/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  isEdit ? "Save Changes" : "Enroll Student"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
