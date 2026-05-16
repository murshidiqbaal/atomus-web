"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import Image from "next/image";
import {
  X, Save, Loader2, Image as ImageIcon, UploadCloud, Search, Check,
  Building2, BookOpen, Trash2,
} from "lucide-react";
import {
  COURSE_CLASS_LEVELS, COURSE_MODES, COURSE_TYPES,
  Course, CourseMode, CourseType, Campus,
} from "@/lib/types";
import {
  useCampuses, useCreateCourse, useUpdateCourse, useUploadThumbnail,
} from "../hooks";
import {
  Badge, fieldCls, GhostButton, Label, PrimaryButton,
} from "./ui";

type FormState = {
  name: string;
  description: string;
  courseType: CourseType;
  classLevel: string;
  mode: CourseMode;
  durationMonths: string;
  feeAmount: string;
  isActive: boolean;
  thumbnailUrl: string | null;
  campusIds: string[];
};

const EMPTY: FormState = {
  name: "",
  description: "",
  courseType: "Regular",
  classLevel: "",
  mode: "Offline",
  durationMonths: "12",
  feeAmount: "0",
  isActive: true,
  thumbnailUrl: null,
  campusIds: [],
};

function fromCourse(c: Course): FormState {
  return {
    name: c.name,
    description: c.description ?? "",
    courseType: c.courseType,
    classLevel: c.classLevel ?? "",
    mode: c.mode,
    durationMonths: c.durationMonths != null ? String(c.durationMonths) : "",
    feeAmount: String(c.feeAmount ?? 0),
    isActive: c.isActive,
    thumbnailUrl: c.thumbnailUrl,
    campusIds: (c.campuses ?? []).map((cp) => cp.id),
  };
}

export function CourseModal({
  isOpen, onClose, course, onToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const isEdit = !!course;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [campusSearch, setCampusSearch] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: campuses = [] } = useCampuses(true);
  const createMut = useCreateCourse();
  const updateMut = useUpdateCourse();
  const uploadMut = useUploadThumbnail();

  // Sync form when opening with a different course (or fresh), and manage
  // the local-preview URL for a newly chosen file. localStorage / DOM-bound
  // state has to be initialised in an effect, so the lint rule is opt-out.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    setForm(course ? fromCourse(course) : EMPTY);
    setThumbFile(null);
    setThumbPreview(null);
    setCampusSearch("");
  }, [isOpen, course]);

  useEffect(() => {
    if (!thumbFile) {
      setThumbPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredCampuses = useMemo(() => {
    if (!campusSearch.trim()) return campuses;
    const q = campusSearch.toLowerCase();
    return campuses.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q),
    );
  }, [campuses, campusSearch]);

  const selectedCampuses = useMemo(
    () => campuses.filter((c) => form.campusIds.includes(c.id)),
    [campuses, form.campusIds],
  );

  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const toggleCampus = (id: string) => {
    setForm((p) => ({
      ...p,
      campusIds: p.campusIds.includes(id)
        ? p.campusIds.filter((x) => x !== id)
        : [...p.campusIds, id],
    }));
  };

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("error", "Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onToast("error", "Image is larger than 5 MB. Pick something smaller.");
      return;
    }
    setThumbFile(file);
  }, [onToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const removeThumb = () => {
    setThumbFile(null);
    setForm((p) => ({ ...p, thumbnailUrl: null }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Course name is required.";
    const fee = Number(form.feeAmount);
    if (Number.isNaN(fee) || fee < 0) return "Fee must be a non-negative number.";
    const dur = form.durationMonths === "" ? null : Number(form.durationMonths);
    if (dur !== null && (Number.isNaN(dur) || dur <= 0)) return "Duration must be a positive number.";
    return null;
  };

  const saving = createMut.isPending || updateMut.isPending || uploadMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      onToast("error", err);
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      courseType: form.courseType,
      classLevel: form.classLevel || null,
      durationMonths: form.durationMonths === "" ? null : Number(form.durationMonths),
      feeAmount: Number(form.feeAmount),
      mode: form.mode,
      isActive: form.isActive,
      thumbnailUrl: form.thumbnailUrl,
      campusIds: form.campusIds,
    };

    try {
      let result: Course;
      if (isEdit && course) {
        result = await updateMut.mutateAsync({ id: course.id, patch: payload });
      } else {
        result = await createMut.mutateAsync(payload);
      }

      if (thumbFile) {
        const url = await uploadMut.mutateAsync({ courseId: result.id, file: thumbFile });
        await updateMut.mutateAsync({ id: result.id, patch: { thumbnailUrl: url } });
      }

      onToast("success", isEdit ? "Course updated." : "Course created.");
      onClose();
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Failed to save course.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-4xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="bg-[#0B3C5D] p-2 rounded-xl text-white">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              {isEdit ? "Edit Course" : "New Course"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isEdit ? "Update course details and campus assignments." : "Set up a new course and assign campuses."}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Section: Basics */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Basics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Course Name</Label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={fieldCls}
                    placeholder="e.g. CEE Crash Course 2026"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select value={form.courseType} onChange={(e) => setField("courseType", e.target.value as CourseType)} className={fieldCls}>
                    {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Mode</Label>
                  <select value={form.mode} onChange={(e) => setField("mode", e.target.value as CourseMode)} className={fieldCls}>
                    {COURSE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label optional>Class Level</Label>
                  <select value={form.classLevel} onChange={(e) => setField("classLevel", e.target.value)} className={fieldCls}>
                    <option value="">—</option>
                    {COURSE_CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Duration (months)</Label>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMonths}
                    onChange={(e) => setField("durationMonths", e.target.value)}
                    className={fieldCls}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label>Fee Amount (₹)</Label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={form.feeAmount}
                    onChange={(e) => setField("feeAmount", e.target.value)}
                    className={fieldCls}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setField("isActive", e.target.checked)}
                      className="rounded text-[#0B3C5D] focus:ring-[#0B3C5D]"
                    />
                    <span className="text-sm font-semibold text-slate-700">Active</span>
                    <span className="ml-auto text-[10px] text-slate-400">
                      {form.isActive ? "Visible to admins" : "Hidden"}
                    </span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <Label optional>Description</Label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={3}
                    className={`${fieldCls} resize-y`}
                    placeholder="Short summary shown to admins and parents…"
                  />
                </div>
              </div>
            </section>

            {/* Section: Thumbnail */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Thumbnail
              </h3>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-[#0B3C5D]/40 transition-colors"
              >
                <div className="w-28 h-20 relative rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {thumbPreview ? (
                    <Image src={thumbPreview} alt="" fill sizes="112px" className="object-cover" unoptimized />
                  ) : form.thumbnailUrl ? (
                    <Image src={form.thumbnailUrl} alt="" fill sizes="112px" className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {thumbFile ? thumbFile.name : form.thumbnailUrl ? "Current thumbnail" : "Drop an image here or click upload"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Auto-compressed to WebP · up to 5 MB
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0B3C5D] bg-[#0B3C5D]/10 rounded-lg hover:bg-[#0B3C5D]/20"
                    >
                      <UploadCloud size={12} />
                      {thumbFile || form.thumbnailUrl ? "Replace" : "Upload"}
                    </button>
                    {(thumbFile || form.thumbnailUrl) && (
                      <button
                        type="button"
                        onClick={removeThumb}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Campuses */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Campuses
                </h3>
                <span className="text-[11px] text-slate-400">
                  {form.campusIds.length} selected
                </span>
              </div>
              {selectedCampuses.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selectedCampuses.map((cp) => (
                    <Badge key={cp.id} tone="blue" className="!normal-case !tracking-normal">
                      <Building2 size={9} /> {cp.name}
                      <button
                        type="button"
                        onClick={() => toggleCampus(cp.id)}
                        className="ml-1 opacity-60 hover:opacity-100"
                      >
                        <X size={10} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  placeholder="Search campuses…"
                  className={`${fieldCls} pl-9`}
                />
              </div>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredCampuses.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400 text-center">
                    {campuses.length === 0 ? "No campuses available — add one first." : "No matches."}
                  </p>
                ) : (
                  filteredCampuses.map((cp) => (
                    <CampusChoice
                      key={cp.id}
                      campus={cp}
                      checked={form.campusIds.includes(cp.id)}
                      onToggle={() => toggleCampus(cp.id)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center gap-2 sticky bottom-0">
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isEdit ? "Changes apply immediately." : "Course will be created and linked to selected campuses."}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isEdit ? "Save Changes" : "Create Course"}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampusChoice({
  campus, checked, onToggle,
}: {
  campus: Campus;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
        ${checked ? "bg-[#0B3C5D]/5" : "hover:bg-slate-50"}`}
    >
      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0
        ${checked ? "bg-[#0B3C5D] border-[#0B3C5D]" : "border-slate-300"}`}>
        {checked && <Check size={12} className="text-white" />}
      </div>
      <Building2 size={14} className="text-slate-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">{campus.name}</p>
        {campus.location && (
          <p className="text-[11px] text-slate-400 truncate">{campus.location}</p>
        )}
      </div>
      {!campus.isActive && (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactive</span>
      )}
    </button>
  );
}
