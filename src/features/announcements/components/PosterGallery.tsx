'use client';

import React from 'react';
import { ImageIcon, Search, Download, Trash2, Filter } from 'lucide-react';
import { Announcement } from '../types';

interface GalleryProps {
  announcements: Announcement[];
}

export function PosterGallery({ announcements }: GalleryProps) {
  const posters = announcements
    .filter(a => a.image_url)
    .reduce((acc: { url: string; title: string; id: string }[], curr) => {
      if (!acc.find(item => item.url === curr.image_url)) {
        acc.push({ url: curr.image_url!, title: curr.title, id: curr.id });
      }
      return acc;
    }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search posters..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#0B3C5D] transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={18} />
            Filter
          </button>
        </div>
      </div>

      {posters.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {posters.map((poster, i) => (
            <div key={i} className="group relative aspect-[4/5] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all">
              <img 
                src={poster.url} 
                alt={poster.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-end">
                <p className="text-white text-xs font-bold truncate mb-3">{poster.title}</p>
                <div className="flex items-center gap-2">
                  <button className="flex-1 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-2 rounded-xl transition-all">
                    <Download size={16} className="mx-auto" />
                  </button>
                  <button className="flex-1 bg-white/20 backdrop-blur-md hover:bg-rose-500 text-white p-2 rounded-xl transition-all">
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-200">
            <ImageIcon size={40} />
          </div>
          <h3 className="text-xl font-black text-[#0B3C5D]">No Posters Found</h3>
          <p className="text-slate-400 font-medium mt-2">Upload images while creating announcements to see them here.</p>
        </div>
      )}
    </div>
  );
}
