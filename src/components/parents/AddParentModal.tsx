'use client';

import React, { useState, useEffect } from 'react';
import { Student } from '@/lib/types';
import { parentRepository } from '@/lib/repositories/parent_repository';
import { generateSecurePassword } from '@/lib/utils/password_utils';

interface AddParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (parentData: any) => void;
}

export const AddParentModal: React.FC<AddParentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    studentIds: [] as string[],
  });
  
  const [students, setStudents] = useState<Student[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchStudents = async () => {
        const data = await parentRepository.searchStudents('');
        setStudents(data);
      };
      fetchStudents();
      setGeneratedPassword(generateSecurePassword());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Linking students logic
    const selectedStudents = students.filter(s => formData.studentIds.includes(s.id));
    
    const newParent = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      linkedStudents: selectedStudents,
      username: formData.email,
      status: 'Active' as const,
    };

    onSuccess({ ...newParent, password: generatedPassword });
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-[16px] shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h2 className="text-xl font-bold text-primary">Add New Parent</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/70">Parent Name</label>
            <input 
              required
              type="text" 
              placeholder="Full Name"
              className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/70">Email Address</label>
              <input 
                required
                type="email" 
                placeholder="email@example.com"
                className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/70">Phone Number</label>
              <input 
                required
                type="tel" 
                placeholder="+92 3XX XXXXXXX"
                className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/70">Link Students</label>
            <select 
              multiple
              className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all min-h-[100px]"
              value={formData.studentIds}
              onChange={e => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({...formData, studentIds: values});
              }}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
              ))}
            </select>
            <p className="text-[11px] text-foreground/50">Hold Ctrl/Cmd to select multiple students</p>
          </div>

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Auto-Generated Password</span>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-primary font-medium hover:underline"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="bg-white border border-primary/20 px-3 py-1.5 rounded font-mono text-primary flex-1 text-center">
                {showPassword ? generatedPassword : '••••••••••••'}
              </code>
              <button 
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedPassword)}
                className="bg-white border border-primary/20 p-1.5 rounded hover:bg-primary/5 text-primary transition-colors"
                title="Copy Password"
              >
                📋
              </button>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Create Parent Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
