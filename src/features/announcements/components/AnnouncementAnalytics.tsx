'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Announcement } from '../types';

interface AnalyticsProps {
  announcements: Announcement[];
}

export function AnnouncementAnalytics({ announcements }: AnalyticsProps) {
  // Process data for charts
  const typeData = announcements.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.type);
    if (existing) existing.value++;
    else acc.push({ name: curr.type, value: 1 });
    return acc;
  }, []);

  const audienceData = announcements.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.target_audience);
    if (existing) existing.value++;
    else acc.push({ name: curr.target_audience, value: 1 });
    return acc;
  }, []);

  const COLORS = ['#0B3C5D', '#D4AF37', '#6366F1', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Distribution by Type */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
        <h4 className="text-lg font-black text-[#0B3C5D] mb-8">Announcements by Type</h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="value" fill="#0B3C5D" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution by Audience */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
        <h4 className="text-lg font-black text-[#0B3C5D] mb-8">Target Audience Split</h4>
        <div className="h-[300px] w-full flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={audienceData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {audienceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 pr-8">
            {audienceData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs font-bold text-slate-500">{item.name}</span>
                <span className="text-xs font-black text-[#0B3C5D] ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
