'use client';

import React from 'react';
import { 
  Calendar, Users, Eye, Edit2, Trash2, 
  MousePointer2, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { Announcement } from '../types';
import { format } from 'date-fns';

interface CardProps {
  announcement: Announcement;
  onEdit: (ann: Announcement) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
}

export function AnnouncementCard({ announcement, onEdit, onDelete, onToggleActive }: CardProps) {
  const isExpired = announcement.end_date && new Date(announcement.end_date) < new Date();
  const isScheduled = new Date(announcement.start_date) > new Date();

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full ${!announcement.is_active || isExpired ? 'opacity-75' : ''}`}>
      {/* Image Section */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {announcement.image_url ? (
          <img 
            src={announcement.image_url} 
            alt={announcement.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Calendar size={48} strokeWidth={1} />
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {announcement.is_popup && (
            <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
              <MousePointer2 size={10} />
              Popup
            </span>
          )}
          <span className={`text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 ${
            announcement.is_active && !isExpired ? 'bg-emerald-500' : 'bg-rose-500'
          }`}>
            {announcement.is_active && !isExpired ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {isExpired ? 'Expired' : announcement.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Audience Badge */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-white/90 backdrop-blur-md text-[#0B3C5D] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 border border-white/20">
            <Users size={12} />
            {announcement.target_audience}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>{announcement.type}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {format(new Date(announcement.created_at), 'dd MMM yyyy')}
            </span>
          </div>
          <h3 className="text-lg font-black text-[#0B3C5D] leading-tight mb-2 line-clamp-1">{announcement.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">{announcement.description}</p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 text-slate-400">
            <button 
              onClick={() => onEdit(announcement)}
              className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => onToggleActive(announcement.id, announcement.is_active)}
              className={`p-2 rounded-xl transition-all ${announcement.is_active ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-emerald-50 hover:text-emerald-600'}`}
              title={announcement.is_active ? 'Deactivate' : 'Activate'}
            >
              {announcement.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            </button>
            <button 
              onClick={() => onDelete(announcement.id)}
              className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <button className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs hover:gap-3 transition-all">
            Preview <Eye size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
