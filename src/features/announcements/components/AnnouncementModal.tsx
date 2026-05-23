'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Announcement, AnnouncementType, TargetAudience } from '../types';
import { announcementService } from '../services/announcement_service';
import { uploadToDrive, cleanupDriveFile } from '@/lib/utils/drive_upload';
import { convertToWebP } from '@/lib/utils/image_utils';

interface ModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: AnnouncementType[] = ['Notice', 'Event', 'Exam Update', 'Holiday', 'Fee Reminder', 'General Announcement'];
const AUDIENCES: TargetAudience[] = ['All', 'Parents', 'Teachers', 'Specific Batch', 'Specific Course'];

export function AnnouncementModal({ announcement, isOpen, onClose, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'General Announcement' as AnnouncementType,
    target_audience: 'All' as TargetAudience,
    image_url: '' as string | null,
    image_drive_id: null as string | null,
    is_popup: false,
    is_active: true,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    course_id: '',
    batch_id: '',
  });

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        target_audience: announcement.target_audience,
        image_url: announcement.image_url,
        image_drive_id: announcement.image_drive_id ?? null,
        is_popup: announcement.is_popup,
        is_active: announcement.is_active,
        start_date: new Date(announcement.start_date).toISOString().slice(0, 16),
        end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().slice(0, 16) : '',
        course_id: announcement.course_id || '',
        batch_id: announcement.batch_id || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'General Announcement',
        target_audience: 'All',
        image_url: null,
        image_drive_id: null,
        is_popup: false,
        is_active: true,
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        course_id: '',
        batch_id: '',
      });
    }
  }, [announcement, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await convertToWebP(file, 0.85).catch(() => file);
      const result = await uploadToDrive(compressed, '/api/upload/announcement');
      const previousDriveId = formData.image_drive_id;
      setFormData(prev => ({ ...prev, image_url: result.imageUrl, image_drive_id: result.fileId }));
      if (previousDriveId && previousDriveId !== result.fileId) {
        void cleanupDriveFile(previousDriveId);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        course_id: formData.course_id || null,
        batch_id: formData.batch_id || null,
      };

      if (announcement) {
        await announcementService.updateAnnouncement(announcement.id, payload);
      } else {
        await announcementService.createAnnouncement(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B3C5D]/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#0B3C5D]">{announcement ? 'Edit Announcement' : 'Create Announcement'}</h2>
            <p className="text-slate-400 font-medium text-sm mt-0.5">Define your message and target audience.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Content */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Annual Sports Meet 2026"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-bold placeholder:text-slate-300 outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide detailed information..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-medium placeholder:text-slate-300 outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-bold outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all appearance-none cursor-pointer"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Audience</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-bold outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all appearance-none cursor-pointer"
                    value={formData.target_audience}
                    onChange={e => setFormData({ ...formData, target_audience: e.target.value as TargetAudience })}
                  >
                    {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    type="datetime-local"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-bold outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">End Date (Optional)</label>
                  <input 
                    type="datetime-local"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[#0B3C5D] font-bold outline-none ring-2 ring-transparent focus:ring-[#0B3C5D]/10 focus:bg-white transition-all"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-12 h-6 rounded-full transition-all relative ${formData.is_popup ? 'bg-purple-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_popup ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.is_popup}
                    onChange={e => setFormData({ ...formData, is_popup: e.target.checked })}
                  />
                  <div>
                    <span className="text-sm font-black text-[#0B3C5D] block">Dashboard Popup</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Show as priority popup</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <div>
                    <span className="text-sm font-black text-[#0B3C5D] block">Active Status</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Visible to audience</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column: Poster/Image */}
            <div className="space-y-6">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Poster / Image</label>
              
              <div 
                className={`relative aspect-[4/5] rounded-[32px] border-4 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-slate-50 ${
                  formData.image_url ? 'border-emerald-500/20' : 'border-slate-100 hover:border-[#0B3C5D]/20'
                }`}
              >
                {formData.image_url ? (
                  <>
                    <img src={formData.image_url} alt="Poster" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const idToClean = formData.image_drive_id;
                        setFormData({ ...formData, image_url: null, image_drive_id: null });
                        if (idToClean) void cleanupDriveFile(idToClean);
                      }}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-2xl text-rose-500 shadow-xl hover:scale-110 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <div className="p-10 text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 size={48} className="text-[#0B3C5D] animate-spin" />
                        <p className="text-sm font-bold text-slate-500">Uploading poster...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-white rounded-[24px] shadow-xl flex items-center justify-center mb-6 mx-auto text-[#0B3C5D]">
                          <Upload size={32} />
                        </div>
                        <h4 className="text-lg font-black text-[#0B3C5D]">Upload Poster</h4>
                        <p className="text-xs text-slate-400 font-medium mt-2 max-w-[200px] mx-auto">
                          Drag and drop or click to upload. 
                          <span className="block mt-1">Recommended size: 1080x1350px</span>
                        </p>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleImageUpload}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-[#D4AF37]/5 rounded-3xl p-5 border border-[#D4AF37]/10 flex gap-4">
                <AlertCircle className="text-[#D4AF37] shrink-0" size={20} />
                <div>
                  <h5 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Design Tip</h5>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Use vibrant colors and minimal text for posters. High-contrast images perform better in the mobile app feed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-4 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-2xl text-slate-500 font-black text-sm hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="bg-[#0B3C5D] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {announcement ? 'Update Announcement' : 'Launch Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
