'use client';

import React, { useState, useEffect } from 'react';
import { Parent } from '@/lib/types';
import { parentRepository } from '@/lib/repositories/parent_repository';
import { authRepository } from '@/lib/repositories/auth_repository';
import { ParentTable } from '@/components/parents/ParentTable';
import { AddParentModal } from '@/components/parents/AddParentModal';
import { Plus, Search, Users, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';

export default function ParentManagementPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchParents(); }, []);

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      const data = await parentRepository.getParents();
      setParents(data);
    } catch {
      setParents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParent = async (parentData: any) => {
    try {
      // 1. Create Supabase Auth account
      await authRepository.createParentAccount(
        parentData.email,
        parentData.phone,
        parentData.password,
        parentData.name
      );

      // 2. Insert into parents table
      const newParent = await parentRepository.addParent(parentData);
      setParents(prev => [newParent, ...prev]);

      // 3. Send credentials email
      const emailResult = await authRepository.sendCredentials(
        parentData.email,
        parentData.phone,
        parentData.password,
        parentData.linkedStudents?.[0]?.full_name || parentData.linkedStudents?.[0]?.name || 'Student'
      );

      showNotification(
        'success',
        emailResult.success
          ? `Account created & credentials emailed to ${parentData.email}. Password: ${parentData.password}`
          : `Account created. ${emailResult.message}`
      );
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to create parent account.');
    }
  };

  const handleResetPassword = async (parent: Parent) => {
    if (!confirm(`Reset password for ${parent.name}?`)) return;
    try {
      await authRepository.resetPassword(parent.email);
      showNotification('success', `Password reset link sent to ${parent.email}`);
    } catch {
      showNotification('error', 'Failed to send reset link.');
    }
  };

  const handleDeleteParent = async (id: string) => {
    if (!confirm('Delete this parent account? This action cannot be undone.')) return;
    try {
      await parentRepository.deleteParent(id);
      setParents(prev => prev.filter(p => p.id !== id));
      showNotification('success', 'Parent account deleted.');
    } catch {
      showNotification('error', 'Failed to delete account.');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const filteredParents = parents.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.linkedStudents.some(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm px-5 py-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <p className="text-sm font-bold leading-snug">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-auto opacity-50 hover:opacity-100 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Parent Accounts</h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage parent login credentials for the ATOMUS Flutter app.
            <span className="ml-2 text-xs bg-[#D4AF37]/10 text-[#D4AF37] font-black px-2 py-0.5 rounded-lg">
              Login: Phone Number + Auto-Generated Password
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#0B3C5D] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={18} />
            New Parent Account
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Parents", value: parents.length, color: "bg-blue-50 text-blue-600" },
          { label: "Active Accounts", value: parents.filter(p => p.status === 'Active').length, color: "bg-emerald-50 text-emerald-600" },
          { label: "Pending", value: parents.filter(p => p.status === 'Pending').length, color: "bg-amber-50 text-amber-600" },
          { label: "Disabled", value: parents.filter(p => p.status === 'Disabled').length, color: "bg-rose-50 text-rose-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <Users size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
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
            placeholder="Search by name, email, phone or student..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Active', 'Pending', 'Disabled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s ? 'bg-[#0B3C5D] text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading parent accounts...</p>
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No parents found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Add a parent account or adjust your search.</p>
        </div>
      ) : (
        <ParentTable
          parents={filteredParents}
          onView={p => console.log('View', p)}
          onEdit={p => console.log('Edit', p)}
          onResetPassword={handleResetPassword}
          onDelete={handleDeleteParent}
          onStatusChange={(id, status) => console.log('Status', id, status)}
        />
      )}

      {/* Modal */}
      <AddParentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddParent}
      />
    </div>
  );
}
