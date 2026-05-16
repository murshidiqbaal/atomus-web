'use client';

import React from 'react';
import { Megaphone, Activity, MousePointer2, CalendarClock } from 'lucide-react';
import { AnnouncementStats } from '../types';

interface DashboardProps {
  stats: AnnouncementStats;
}

export function AnnouncementDashboard({ stats }: DashboardProps) {
  const cards = [
    {
      label: 'Total Announcements',
      value: stats.total,
      icon: Megaphone,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Active Now',
      value: stats.active,
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Popup Messages',
      value: stats.popup,
      icon: MousePointer2,
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Scheduled',
      value: stats.scheduled,
      icon: CalendarClock,
      color: 'bg-amber-50 text-amber-600',
      borderColor: 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className={`bg-white rounded-3xl p-6 border ${card.borderColor} shadow-sm transition-all hover:shadow-md group`}
        >
          <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
            <card.icon size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            <h3 className="text-3xl font-black text-[#0B3C5D] mt-1">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
