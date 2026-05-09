"use client";

import React, { useState } from "react";
import { X, Clock, Layers, Loader2 } from "lucide-react";
import { courseRepository } from "@/lib/repositories/course_repository";

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: string;
  courseName: string;
}

export default function AddBatchModal({ isOpen, onClose, onSuccess, courseId, courseName }: AddBatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    timing: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await courseRepository.addBatch({
        courseId,
        name: formData.name,
        timing: formData.timing,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-2 rounded-xl">
              <Layers className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">New Batch</h2>
              <p className="text-white/60 text-xs font-medium">Adding to: {courseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/60 ml-1">Batch Name</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                <input 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Morning Batch - A"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/60 ml-1">Timing</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                <input 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. 09:00 AM - 11:00 AM"
                  value={formData.timing}
                  onChange={e => setFormData({...formData, timing: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-bold text-foreground/60 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
