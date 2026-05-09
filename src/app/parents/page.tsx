'use client';

import React, { useState, useEffect } from 'react';
import { Parent, Student } from '@/lib/types';
import { parentRepository } from '@/lib/repositories/parent_repository';
import { authRepository } from '@/lib/repositories/auth_repository';
import { ParentTable } from '@/components/parents/ParentTable';
import { AddParentModal } from '@/components/parents/AddParentModal';

export default function ParentManagementPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    setIsLoading(true);
    const data = await parentRepository.getParents();
    setParents(data);
    setIsLoading(false);
  };

  const handleAddParent = async (parentData: any) => {
    try {
      const newParent = await parentRepository.addParent(parentData);
      setParents([newParent, ...parents]);
      
      // Simulate sending credentials
      const result = await authRepository.sendCredentials(parentData.email, parentData.password);
      
      if (result.success) {
        showNotification('success', `Parent account created and credentials sent to ${parentData.email}`);
      } else {
        showNotification('error', `Account created but failed to send email. Password: ${parentData.password}`);
      }
    } catch (error) {
      showNotification('error', 'Failed to create parent account.');
    }
  };

  const handleResetPassword = async (parent: Parent) => {
    if (confirm(`Are you sure you want to reset password for ${parent.name}?`)) {
      const newPassword = await authRepository.resetPassword(parent.email);
      const result = await authRepository.sendCredentials(parent.email, newPassword);
      
      if (result.success) {
        showNotification('success', `New password generated and sent to ${parent.email}`);
      } else {
        showNotification('error', `Password reset but email failed. New password: ${newPassword}`);
      }
    }
  };

  const handleDeleteParent = async (id: string) => {
    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      await parentRepository.deleteParent(id);
      setParents(parents.filter(p => p.id !== id));
      showNotification('success', 'Parent account deleted successfully.');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredParents = parents.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.linkedStudents.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span className="text-xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-sm font-bold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Parent Account Management</h1>
          <p className="text-foreground/60 mt-1">Create and manage parent login credentials and student links.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex-1 md:flex-none bg-surface text-primary border border-border px-5 py-2.5 rounded-lg font-bold hover:bg-muted transition-all shadow-sm">
            Bulk Create
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            + New Parent Account
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-border/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Search by parent name, email or student..." 
              className="w-full border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary bg-transparent font-medium">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Disabled</option>
          </select>
        </div>
        <div className="text-sm text-foreground/50 font-medium">
          Total Parents: <span className="text-primary font-bold">{parents.length}</span>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-border p-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground/40 font-medium italic">Loading parent accounts...</p>
        </div>
      ) : (
        <ParentTable 
          parents={filteredParents}
          onView={(p) => console.log('View', p)}
          onEdit={(p) => console.log('Edit', p)}
          onResetPassword={handleResetPassword}
          onDelete={handleDeleteParent}
          onStatusChange={(id, status) => console.log('Status', id, status)}
        />
      )}

      {/* Empty State */}
      {!isLoading && filteredParents.length === 0 && (
        <div className="bg-surface rounded-xl border border-border p-16 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-bold text-foreground">No parents found</h3>
          <p className="text-foreground/50 max-w-xs mx-auto mt-2">Try adjusting your search or add a new parent account to get started.</p>
        </div>
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
