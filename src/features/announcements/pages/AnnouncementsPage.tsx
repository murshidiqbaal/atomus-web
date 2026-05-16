'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Megaphone, LayoutDashboard, 
  ImageIcon, BarChart3, Loader2, AlertCircle 
} from 'lucide-react';
import { Announcement, AnnouncementStats } from '../types';
import { announcementService } from '../services/announcement_service';
import { AnnouncementDashboard } from '../components/AnnouncementDashboard';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { PosterGallery } from '../components/PosterGallery';
import { AnnouncementAnalytics } from '../components/AnnouncementAnalytics';

type TabType = 'active' | 'gallery' | 'analytics';

export function AnnouncementsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<AnnouncementStats>({ total: 0, active: 0, popup: 0, scheduled: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        announcementService.getAnnouncements(),
        announcementService.getStats()
      ]);
      setAnnouncements(data);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(id);
      fetchData();
    } catch (error) {
      alert('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await announcementService.updateAnnouncement(id, { is_active: !current });
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'active', label: 'Active Announcements', icon: Megaphone },
    { id: 'gallery', label: 'Poster Gallery', icon: ImageIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#0B3C5D] rounded-2xl flex items-center justify-center text-[#D4AF37]">
              <Megaphone size={20} />
            </div>
            <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Announcements</h1>
          </div>
          <p className="text-slate-500 font-medium">Broadcast notices, events, and important updates to your community.</p>
        </div>

        <button 
          onClick={() => { setEditingAnnouncement(null); setIsModalOpen(true); }}
          className="bg-[#D4AF37] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Create New Announcement
        </button>
      </header>

      {/* Dashboard Stats */}
      <AnnouncementDashboard stats={stats} />

      {/* Main Section */}
      <div className="space-y-6">
        {/* Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-2 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1 p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 rounded-[24px] text-sm font-black transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#0B3C5D] text-white shadow-lg' 
                    : 'text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-4 pb-2 lg:pb-0">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search announcements..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-[#0B3C5D] placeholder:text-slate-300 outline-none focus:bg-white ring-2 ring-transparent focus:ring-[#0B3C5D]/5 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-[#0B3C5D] transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 size={48} className="animate-spin text-[#0B3C5D]" />
            <p className="font-bold">Fetching latest data...</p>
          </div>
        ) : (
          <div className="min-h-[400px]">
            {activeTab === 'active' && (
              filteredAnnouncements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                  {filteredAnnouncements.map(ann => (
                    <AnnouncementCard 
                      key={ann.id} 
                      announcement={ann}
                      onEdit={(ann) => { setEditingAnnouncement(ann); setIsModalOpen(true); }}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <Megaphone size={40} />
                  </div>
                  <h3 className="text-xl font-black text-[#0B3C5D]">No Announcements Found</h3>
                  <p className="text-slate-400 font-medium mt-2">Try adjusting your search or create a new announcement.</p>
                </div>
              )
            )}

            {activeTab === 'gallery' && <PosterGallery announcements={announcements} />}
            {activeTab === 'analytics' && <AnnouncementAnalytics announcements={announcements} />}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnnouncementModal 
        isOpen={isModalOpen}
        announcement={editingAnnouncement}
        onClose={() => { setIsModalOpen(false); setEditingAnnouncement(null); }}
        onSuccess={fetchData}
      />
    </div>
  );
}
