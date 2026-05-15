"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Search, Edit2, Trash2, Eye,
  Mail, Phone, BookOpen, Layers, MoreVertical, X, CheckCircle2,
  AlertCircle, Shield, User
} from "lucide-react";
import { teacherRepository } from "@/lib/repositories/teacher_repository";
import { courseRepository } from "@/lib/repositories/course_repository";
import { Teacher, Course, Batch } from "@/lib/types";
import { generateSecurePassword } from "@/lib/utils/password_utils";

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const data = await teacherRepository.getTeachers();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this teacher account?")) return;
    try {
      await teacherRepository.deleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      showNotif("success", "Teacher deleted.");
    } catch {
      showNotif("error", "Failed to delete teacher.");
    }
  };

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.subject_specialization?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
          notification.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-bold">{notification.msg}</p>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Teacher Management</h1>
          <p className="text-slate-500 font-medium mt-1">{teachers.length} teachers across all courses and batches.</p>
        </div>
        <button
          onClick={() => { setEditTeacher(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-[#0B3C5D] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          <Plus size={18} />
          Add Teacher
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Teachers", value: teachers.length, color: "bg-blue-50 text-blue-600" },
          { label: "Active", value: teachers.filter(t => t.account_status === "Active").length, color: "bg-emerald-50 text-emerald-600" },
          { label: "Courses Covered", value: [...new Set(teachers.flatMap(t => t.assigned_courses))].length, color: "bg-purple-50 text-purple-600" },
          { label: "Batches Covered", value: [...new Set(teachers.flatMap(t => t.assigned_batches))].length, color: "bg-amber-50 text-amber-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <GraduationCap size={20} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <h3 className="text-2xl font-black text-[#0B3C5D] mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or subject..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <p className="text-sm text-slate-400 font-medium shrink-0">
          Showing <span className="text-[#0B3C5D] font-bold">{filtered.length}</span> teachers
        </p>
      </div>

      {/* Teacher Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No teachers found</h3>
          <p className="text-slate-400 text-sm mt-1">Add a teacher to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={() => { setEditTeacher(teacher); setIsModalOpen(true); }}
              onDelete={() => handleDelete(teacher.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <TeacherModal
          teacher={editTeacher}
          onClose={() => { setIsModalOpen(false); setEditTeacher(null); }}
          onSuccess={async (data) => {
            try {
              if (editTeacher) {
                const updated = await teacherRepository.updateTeacher(editTeacher.id, data);
                setTeachers(prev => prev.map(t => t.id === editTeacher.id ? updated : t));
                showNotif("success", "Teacher updated successfully.");
              } else {
                const created = await teacherRepository.addTeacher(data);
                setTeachers(prev => [created, ...prev]);
                showNotif("success", "Teacher account created. Credentials sent to their email.");
              }
            } catch (err: any) {
              showNotif("error", err.message || "Operation failed.");
            }
            setIsModalOpen(false);
            setEditTeacher(null);
          }}
        />
      )}
    </div>
  );
}

function TeacherCard({ teacher, onEdit, onDelete }: { teacher: Teacher; onEdit: () => void; onDelete: () => void }) {
  const initials = teacher.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B3C5D] to-[#0B3C5D]/70 text-white flex items-center justify-center font-black text-lg">
              {initials}
            </div>
            <div>
              <h3 className="font-black text-[#0B3C5D] text-base leading-tight">{teacher.full_name}</h3>
              <p className="text-xs font-bold text-[#D4AF37] mt-0.5 uppercase tracking-wider">{teacher.subject_specialization}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            teacher.account_status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}>
            {teacher.account_status}
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{teacher.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Phone size={13} className="text-slate-400 shrink-0" />
            <span>{teacher.phone_number}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100">
          <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Courses</p>
            <p className="text-sm font-black text-[#0B3C5D]">{teacher.assigned_courses?.length || 0}</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Batches</p>
            <p className="text-sm font-black text-[#0B3C5D]">{teacher.assigned_batches?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-1">
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-blue-50 rounded-xl transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function TeacherModal({
  teacher, onClose, onSuccess
}: {
  teacher: Teacher | null;
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [form, setForm] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    phone_number: teacher?.phone_number || '',
    subject_specialization: teacher?.subject_specialization || '',
    account_status: teacher?.account_status || 'Active',
  });
  const [password] = useState(generateSecurePassword());
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSuccess({ ...form, password });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-[#0B3C5D] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{teacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
            <p className="text-white/60 text-xs mt-0.5">Assign courses and batches after creation</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input required type="text" placeholder="e.g. Prof. Sarah Ahmad"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm"
                value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input required type="email" placeholder="teacher@school.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
              <input required type="tel" placeholder="+92 300 0000000"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm"
                value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Specialization</label>
              <input required type="text" placeholder="e.g. Mathematics, Physics"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm"
                value={form.subject_specialization} onChange={e => setForm({ ...form, subject_specialization: e.target.value })} />
            </div>
          </div>

          {!teacher && (
            <div className="bg-[#0B3C5D]/5 border border-[#0B3C5D]/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Auto Password</span>
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-xs text-[#0B3C5D] font-bold hover:underline">
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
              <code className="block bg-white border border-[#0B3C5D]/20 px-4 py-2 rounded-xl font-mono text-[#0B3C5D] font-bold text-center">
                {showPwd ? password : '•'.repeat(password.length)}
              </code>
              <p className="text-[10px] text-slate-400">This password will be emailed to the teacher.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#0B3C5D] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
              {loading ? 'Saving...' : teacher ? 'Update Teacher' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
