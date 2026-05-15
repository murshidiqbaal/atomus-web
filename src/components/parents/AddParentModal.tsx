'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Eye, EyeOff, Copy, RefreshCw, CheckCircle2, AlertCircle, User, Phone, Mail, Link } from 'lucide-react';
import { parentRepository } from '@/lib/repositories/parent_repository';
import { generateParentPassword } from '@/lib/utils/password_utils';

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

  const [students, setStudents] = useState<any[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [passwordSource, setPasswordSource] = useState<'formula' | 'manual'>('formula');
  const [manualPassword, setManualPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      parentRepository.searchStudents('').then(setStudents);
      setFormData({ name: '', email: '', phone: '', studentIds: [] });
      setGeneratedPassword('');
      setShowPassword(false);
      setCopied(false);
      setStudentSearch('');
      setPasswordSource('formula');
      setManualPassword('');
    }
  }, [isOpen]);

  // Re-generate password whenever phone or first linked student changes
  const recomputePassword = useCallback(() => {
    if (passwordSource !== 'formula') return;
    if (formData.studentIds.length === 0 || !formData.phone) {
      setGeneratedPassword('');
      return;
    }
    const firstStudentId = formData.studentIds[0];
    const student = students.find(s => s.id === firstStudentId);
    const studentName = student?.full_name || student?.name || '';
    const password = generateParentPassword(studentName, formData.phone);
    setGeneratedPassword(password);
  }, [formData.studentIds, formData.phone, students, passwordSource]);

  useEffect(() => {
    recomputePassword();
  }, [recomputePassword]);

  const handleCopy = () => {
    const pwd = passwordSource === 'formula' ? generatedPassword : manualPassword;
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const finalPassword = passwordSource === 'formula' ? generatedPassword : manualPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalPassword) {
      alert('Password is required. Please link a student and enter a phone number.');
      return;
    }
    setIsLoading(true);
    const selectedStudents = students.filter(s => formData.studentIds.includes(s.id));
    const newParent = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      linkedStudents: selectedStudents,
      username: formData.phone.replace(/\D/g, ''),
      password: finalPassword,
      status: 'Active' as const,
    };
    onSuccess(newParent);
    setIsLoading(false);
    onClose();
  };

  const filteredStudents = students.filter(s =>
    (s.full_name || s.name || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#0B3C5D]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Parent Account</h2>
            <p className="text-white/60 text-xs mt-0.5">Auto-generates a password from student name + phone</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} /> Parent Full Name
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Ahmed Khan"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-sm"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} /> Gmail Address
              </label>
              <input
                required
                type="email"
                placeholder="parent@gmail.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-sm"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={12} /> Phone (Login ID)
              </label>
              <input
                required
                type="tel"
                placeholder="+92 300 1234567"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 transition-all text-sm"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-[10px] text-slate-400">Phone number = Flutter app login username</p>
            </div>
          </div>

          {/* Link Students */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Link size={12} /> Link Students
            </label>
            <input
              type="text"
              placeholder="Search students..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-[#0B3C5D] text-sm transition-all"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
            />
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">No students found</p>
              ) : (
                filteredStudents.map(s => {
                  const isSelected = formData.studentIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-sm border-b border-slate-100 last:border-0 ${
                        isSelected ? 'bg-[#0B3C5D]/5 text-[#0B3C5D]' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-medium">{s.full_name || s.name}</span>
                      {isSelected && <CheckCircle2 size={16} className="text-[#0B3C5D]" />}
                    </button>
                  );
                })
              )}
            </div>
            {formData.studentIds.length > 0 && (
              <p className="text-xs text-[#0B3C5D] font-bold">{formData.studentIds.length} student(s) linked</p>
            )}
          </div>

          {/* Auto-Generated Password */}
          <div className="bg-gradient-to-br from-[#0B3C5D]/5 to-[#D4AF37]/5 p-5 rounded-2xl border border-[#0B3C5D]/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-[#0B3C5D] uppercase tracking-wider">Auto-Generated Password</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Format: <code className="bg-white px-1 rounded text-[#D4AF37]">First3LettersOfStudent + Last5DigitsOfPhone</code>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-[#0B3C5D] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-[#0B3C5D] transition-colors"
                >
                  {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {passwordSource === 'formula' ? (
              <div className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 ${
                generatedPassword ? 'border-[#0B3C5D]/30' : 'border-slate-200'
              }`}>
                {generatedPassword ? (
                  <>
                    <code className="font-mono font-black text-[#0B3C5D] text-lg flex-1">
                      {showPassword ? generatedPassword : '•'.repeat(generatedPassword.length)}
                    </code>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <CheckCircle2 size={10} />
                      READY
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic flex items-center gap-2">
                    <AlertCircle size={16} />
                    Link a student and enter phone to generate
                  </p>
                )}
              </div>
            ) : (
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter custom password..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#0B3C5D] font-mono text-sm transition-all"
                value={manualPassword}
                onChange={e => setManualPassword(e.target.value)}
              />
            )}

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <button
                type="button"
                onClick={() => setPasswordSource(passwordSource === 'formula' ? 'manual' : 'formula')}
                className="text-[#0B3C5D] hover:underline"
              >
                {passwordSource === 'formula' ? 'Use custom password instead' : 'Use formula-based password'}
              </button>
            </div>

            {generatedPassword && passwordSource === 'formula' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  This password will be sent to <strong>{formData.email || 'parent email'}</strong>.
                  The parent uses their <strong>phone number</strong> as username and this password to log in to the Flutter app.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !finalPassword}
              className="flex-1 bg-[#0B3C5D] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create & Send Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
