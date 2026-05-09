'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Key, Pencil, Trash2 } from 'lucide-react';
import { Parent } from '@/lib/types';
import { StatusBadge } from '../ui/StatusBadge';

const PasswordCell = ({ password }: { password?: string }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs font-bold text-foreground/70 uppercase tracking-tighter">
        Pass: <span className="text-accent font-mono">{show ? (password || 'N/A') : '••••••••'}</span>
      </p>
      <button 
        onClick={() => setShow(!show)} 
        className="p-1 rounded-md hover:bg-muted text-foreground/40 hover:text-primary transition-all"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
};

interface ParentTableProps {
  parents: Parent[];
  onView: (parent: Parent) => void;
  onEdit: (parent: Parent) => void;
  onResetPassword: (parent: Parent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: any) => void;
}

export const ParentTable: React.FC<ParentTableProps> = ({ 
  parents, 
  onView, 
  onEdit, 
  onResetPassword, 
  onDelete,
  onStatusChange
}) => {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground/60">Parent Info</th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground/60">Linked Students</th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground/60">Credentials</th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground/60">Account Status</th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-foreground/60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parents.map((parent) => (
              <tr key={parent.id} className="hover:bg-muted/30 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                      {parent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{parent.name}</p>
                      <p className="text-xs text-foreground/50">{parent.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1">
                    {parent.linkedStudents.map((student) => (
                      <span key={student.id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold border border-accent/20">
                        {student.name} ({student.class})
                      </span>
                    ))}
                    {parent.linkedStudents.length === 0 && (
                      <span className="text-xs text-foreground/30 italic">No students linked</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground/70 uppercase tracking-tighter">User: <span className="text-primary">{parent.username}</span></p>
                    <PasswordCell password={parent.password} />
                  </div>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={parent.status} />
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => onResetPassword(parent)}
                      className="p-2 text-foreground/40 hover:text-primary transition-all rounded-xl hover:bg-primary/5"
                      title="Reset Password"
                    >
                      <Key size={18} />
                    </button>
                    <button 
                      onClick={() => onEdit(parent)}
                      className="p-2 text-foreground/40 hover:text-primary transition-all rounded-xl hover:bg-primary/5"
                      title="Edit Parent"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(parent.id)}
                      className="p-2 text-foreground/40 hover:text-rose-500 transition-all rounded-xl hover:bg-rose-50"
                      title="Delete Account"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
