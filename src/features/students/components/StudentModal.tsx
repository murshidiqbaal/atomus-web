"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Camera, UserCircle, Search, ChevronDown, Building2, BookOpen, Users, GraduationCap } from "lucide-react";
import { studentSchema, StudentFormValues } from "../schemas";
import { StudentWithRelations } from "../types";
import { studentService } from "../services/student_service";
import { useCampuses, useCoursesByCampus, useBatchesByCourseAndCampus, useCreateStudent, useUpdateStudent } from "../hooks";
import CredentialsModal from "@/features/parents/components/CredentialsModal";
import { ParentCredentials } from "@/features/parents/types";

const GENDERS = ["Male", "Female", "Other"] as const;
const STATUSES = ["Active", "Inactive", "Graduated", "Dropped"] as const;

const inputCls =
  "w-full px-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0B3C5D] focus:ring-8 focus:ring-[#0B3C5D]/5 transition-all bg-white appearance-none shadow-sm placeholder:text-slate-400";
const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 px-1";
const errorCls = "mt-1.5 text-[11px] font-bold text-rose-500 px-1";

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="p-2 bg-[#0B3C5D]/5 rounded-lg text-[#0B3C5D]">
        <Icon size={14} />
      </div>
      <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</span>
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
        className={`${inputCls} flex items-center justify-between text-left ${disabled ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:border-slate-300 active:scale-[0.99]"}`}
      >
        <span className={!selectedOption ? "text-slate-400 font-normal" : "text-slate-900"}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {error && <p className={errorCls}>{error}</p>}

      {open && (
        <div className="absolute z-[100] w-full mt-3 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-50">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#0B3C5D]/10"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-xs text-slate-400 text-center font-bold uppercase tracking-widest">No matching results</div>
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
                  className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all ${value === opt.id
                      ? "text-[#0B3C5D] font-black bg-[#0B3C5D]/5 border-l-4 border-l-[#0B3C5D]"
                      : "text-slate-600 font-medium hover:bg-slate-50 hover:pl-5"
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
  const { data: campuses = [] } = useCampuses();
  const create = useCreateStudent();
  const update = useUpdateStudent();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rollError, setRollError] = useState<string | null>(null);
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
        full_name: student.full_name,
        roll_number: student.roll_number,
        gender: student.gender ?? "Male",
        dob: student.dob ?? "",
        campus_id: student.campus_id,
        course_id: student.course_id,
        batch_id: student.batch_id,
        joining_date: student.joining_date ?? "",
        academic_status: student.academic_status ?? "Active",
        phone_number: student.phone_number ?? "",
        email: student.email ?? "",
        address: student.address ?? "",
        parent_name: student.parents?.full_name ?? "",
        parent_email: student.parents?.email ?? "",
        parent_phone: student.parents?.phone_number ?? "",
      }
      : {
        full_name: "", roll_number: "", gender: "Male", dob: "",
        campus_id: "", course_id: "", batch_id: "", joining_date: "",
        academic_status: "Active", phone_number: "", email: "",
        address: "", parent_name: "", parent_email: "", parent_phone: "",
      },
  });

  const watchedCampus = watch("campus_id");
  const watchedCourse = watch("course_id");
  const watchedBatch = watch("batch_id");

  const prevCampus = useRef(student?.campus_id || "");
  const prevCourse = useRef(student?.course_id || "");

  const { data: courses = [] } = useCoursesByCampus(watchedCampus);
  const { data: batches = [] } = useBatchesByCourseAndCampus(watchedCourse, watchedCampus);

  // Dependent logic: Reset Course/Batch when Campus changes
  useEffect(() => {
    if (prevCampus.current && prevCampus.current !== watchedCampus) {
      setValue("course_id", "");
      setValue("batch_id", "");
    }
    prevCampus.current = watchedCampus;
  }, [watchedCampus, setValue]);

  // Dependent logic: Reset Batch when Course changes
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="bg-[#0B3C5D] p-3 rounded-2xl shadow-lg shadow-[#0B3C5D]/20">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {isEdit ? "Edit Scholar Profile" : "Enroll New Scholar"}
              </h2>
              <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mt-0.5">
                {isEdit ? `ID: ${student!.roll_number}` : "Digital Admission System"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">
            {/* Photo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl transition-transform duration-500 group-hover:scale-105">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0B3C5D]/5 flex items-center justify-center">
                      <UserCircle size={48} className="text-[#0B3C5D]/20" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0B3C5D] text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all border-4 border-white"
                >
                  <Camera size={18} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scholar Portrait</p>
            </div>

            <div className="space-y-6">
              <SectionHeader title="Institutional Assignment" icon={Building2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SearchableSelect
                  label="Campus *"
                  options={campuses}
                  value={watchedCampus}
                  onChange={(id) => {
                    setValue("campus_id", id, { shouldValidate: true });
                    setValue("course_id", "", { shouldValidate: true });
                    setValue("batch_id", "", { shouldValidate: true });
                  }}
                  placeholder="Select primary campus..."
                  error={errors.campus_id?.message}
                />
                <div>
                  <label className={labelCls}>Scholar Roll ID *</label>
                  <input
                    {...register("roll_number")}
                    placeholder="e.g. 2026-X12"
                    className={inputCls}
                  />
                  {(errors.roll_number || rollError) && (
                    <p className={errorCls}>{errors.roll_number?.message ?? rollError}</p>
                  )}
                </div>
              </div>

              <SectionHeader title="Academic Program" icon={BookOpen} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SearchableSelect
                  label="Course *"
                  options={courses}
                  value={watchedCourse}
                  onChange={(id) => {
                    setValue("course_id", id, { shouldValidate: true });
                    setValue("batch_id", "", { shouldValidate: true });
                  }}
                  placeholder={!watchedCampus ? "Select campus first" : "Select program..."}
                  disabled={!watchedCampus}
                  error={errors.course_id?.message}
                />
                <SearchableSelect
                  label="Class Batch *"
                  options={batches}
                  value={watchedBatch}
                  onChange={(id) => setValue("batch_id", id, { shouldValidate: true })}
                  placeholder={!watchedCourse ? "Select course first" : "Select batch..."}
                  disabled={!watchedCourse}
                  error={errors.batch_id?.message}
                />
                <div>
                  <label className={labelCls}>Enrollment Date *</label>
                  <input {...register("joining_date")} type="date" className={inputCls} />
                  {errors.joining_date && <p className={errorCls}>{errors.joining_date.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Scholastic Status *</label>
                  <div className="relative">
                    <select {...register("academic_status")} className={inputCls}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.academic_status && <p className={errorCls}>{errors.academic_status.message}</p>}
                </div>
              </div>

              <SectionHeader title="Personal Information" icon={UserCircle} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input
                    {...register("full_name")}
                    placeholder="Legal name of the scholar"
                    className={inputCls}
                  />
                  {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Gender Identifier *</label>
                  <div className="relative">
                    <select {...register("gender")} className={inputCls}>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.gender && <p className={errorCls}>{errors.gender.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input {...register("dob")} type="date" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Primary Contact</label>
                  <input
                    {...register("phone_number")}
                    type="tel"
                    placeholder="+92 3XX XXXXXXX"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Official Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="scholar@institute.com"
                    className={inputCls}
                  />
                  {errors.email && <p className={errorCls}>{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Residential Address</label>
                  <input
                    {...register("address")}
                    placeholder="Permanent residential details"
                    className={inputCls}
                  />
                </div>
              </div>

              <SectionHeader title="Guardian Credentials" icon={Users} />
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-inner space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Guardian Name</label>
                    <input
                      {...register("parent_name")}
                      placeholder="Father/Guardian Name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Access Email</label>
                    <input
                      {...register("parent_email")}
                      type="email"
                      placeholder="guardian@example.com"
                      className={inputCls}
                    />
                    {errors.parent_email && <p className={errorCls}>{errors.parent_email.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Access Phone</label>
                    <input
                      {...register("parent_phone")}
                      type="tel"
                      placeholder="+92 3XX XXXXXXX"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/10">
                  <div className="text-[#D4AF37] shrink-0 mt-0.5">
                    <Users size={16} />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    A secure digital account will be generated for the guardian. If an account already exists for this contact, the scholar will be automatically linked.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-8 py-4 border border-slate-200 rounded-[1.25rem] text-sm font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-[2] px-8 py-4 bg-[#0B3C5D] text-white rounded-[1.25rem] text-sm font-black hover:bg-[#0B3C5D]/90 disabled:opacity-60 transition-all shadow-2xl shadow-[#0B3C5D]/30 active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                {isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  isEdit ? "Confirm Modifications" : "Initiate Enrollment"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
