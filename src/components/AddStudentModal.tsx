"use client";

import { studentRepository } from "@/lib/repositories/student_repository";
import { supabase } from "@/lib/supabase";
import { GraduationCap, Hash, Loader2, Mail, Phone, ShieldCheck, User, X } from "lucide-react";
import React, { useState } from "react";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    studentName: "",
    admissionNumber: "",
    rollNumber: "",
    courseId: "",
    batchId: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
  });

  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      const { data: coursesData } = await supabase.from('courses').select('id, name');
      if (coursesData) {
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setFormData(prev => ({ ...prev, courseId: coursesData[0].id }));
          const { data: batchesData } = await supabase.from('batches').select('id, name').eq('course_id', coursesData[0].id);
          if (batchesData) {
            setBatches(batchesData);
            if (batchesData.length > 0) setFormData(prev => ({ ...prev, batchId: batchesData[0].id }));
          }
        }
      }
    };
    if (isOpen) loadData();
  }, [isOpen]);

  const handleCourseChange = async (courseId: string) => {
    setFormData({ ...formData, courseId, batchId: "" });
    const { data } = await supabase.from('batches').select('id, name').eq('course_id', courseId);
    if (data) {
      setBatches(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, batchId: data[0].id }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.courseId || !formData.batchId) {
        throw new Error("Please select both a Course and a Batch.");
      }

      await studentRepository.createStudentWithParent(
        {
          fullName: formData.studentName,
          admissionNumber: formData.admissionNumber,
          rollNumber: formData.rollNumber || null,
          courseId: formData.courseId,
          batchId: formData.batchId,
        },
        {
          fullName: formData.parentName,
          email: formData.parentEmail,
          phone: formData.parentPhone,
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create student and parent account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-2 rounded-xl">
              <GraduationCap className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add New Student</h2>
              <p className="text-white/60 text-xs font-medium">Create student profile and parent account simultaneously.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium">
              <ShieldCheck size={18} />
              {error}
            </div>
          )}

          {/* Student Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary/40">Student Information</h3>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                    placeholder="Enter student name"
                    value={formData.studentName}
                    onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Admission Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                  <input
                    required
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium font-mono"
                    placeholder="STU-2026-XXXX"
                    value={formData.admissionNumber}
                    onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Roll Number</label>
                <input
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  placeholder="Optional"
                  value={formData.rollNumber}
                  onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Assigned Course</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  value={formData.courseId}
                  onChange={e => handleCourseChange(e.target.value)}
                >
                  <option value="" disabled>{courses.length === 0 ? "Loading courses..." : "Select Course"}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {courses.length === 0 && !loading && (
                  <p className="text-[10px] text-rose-500 mt-1 font-bold">⚠️ No courses found in database. Please add a course first.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Assigned Batch</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  value={formData.batchId}
                  onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                >
                  <option value="" disabled>{batches.length === 0 ? "No batches available" : "Select Batch"}</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {batches.length === 0 && formData.courseId && (
                  <p className="text-[10px] text-rose-500 mt-1 font-bold">⚠️ No batches found for this course.</p>
                )}
              </div>
            </div>
          </section>

          {/* Parent Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary/40">Parent Account Details</h3>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/60 ml-1">Parent Name</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  placeholder="Full name of guardian"
                  value={formData.parentName}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground/60 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                    <input
                      required
                      type="email"
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                      placeholder="parent@example.com"
                      value={formData.parentEmail}
                      onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground/60 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                    <input
                      required
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                      placeholder="+1 (555) 000-0000"
                      value={formData.parentPhone}
                      onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="p-6 bg-muted/30 border-t border-border/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-foreground/60 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Accounts"}
          </button>
        </div>
      </div>
    </div>
  );
}
