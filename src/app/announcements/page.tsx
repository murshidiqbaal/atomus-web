"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone, Plus, Trash2, Edit2, Eye, Send, Clock, Users,
  AlertTriangle, Info, CheckCircle2, X, Globe, GraduationCap, UserCircle
} from "lucide-react";
import { announcementRepository } from "@/lib/repositories/announcement_repository";
import { Announcement, AnnouncementPriority, AnnouncementAudience } from "@/lib/types";

const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; color: string; bg: string; icon: any }> = {
  Normal: { label: "Normal", color: "text-slate-600", bg: "bg-slate-100", icon: Info },
  Important: { label: "Important", color: "text-amber-700", bg: "bg-amber-100", icon: AlertTriangle },
  Urgent: { label: "Urgent", color: "text-rose-700", bg: "bg-rose-100", icon: AlertTriangle },
};

const AUDIENCE_CONFIG: Record<AnnouncementAudience, { label: string; icon: any; color: string }> = {
  All: { label: "Everyone", icon: Globe, color: "text-purple-600" },
  Parents: { label: "Parents", icon: UserCircle, color: "text-blue-600" },
  Teachers: { label: "Teachers", icon: GraduationCap, color: "text-emerald-600" },
  Students: { label: "Students", icon: Users, color: "text-orange-600" },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [filterAudience, setFilterAudience] = useState<AnnouncementAudience | "All" | "">("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await announcementRepository.getAnnouncements();
      setAnnouncements(data);
    } catch {
      // Show placeholder data when DB isn't connected
      setAnnouncements([
        {
          id: "1",
          title: "Welcome to the New Term 2026",
          content: "We are excited to welcome all students and parents to the new academic term. Please ensure all fees are cleared by the end of this week.",
          priority: "Important",
          audience: "All",
          is_published: true,
          created_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        },
        {
          id: "2",
          title: "Mid-Term Examination Schedule Released",
          content: "The mid-term examination schedule has been finalized. Exams will be held from 20th May to 30th May 2026. Timetables are available at the reception.",
          priority: "Urgent",
          audience: "Students",
          is_published: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          published_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "3",
          title: "Parent-Teacher Meeting — June 5th",
          content: "A parent-teacher meeting is scheduled for June 5th, 2026. All parents are requested to attend. Individual slots can be booked at the admin office.",
          priority: "Normal",
          audience: "Parents",
          is_published: false,
          scheduled_at: new Date(Date.now() + 86400000 * 5).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await announcementRepository.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotif("success", "Announcement deleted.");
    } catch {
      showNotif("error", "Failed to delete.");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await announcementRepository.publishAnnouncement(id);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_published: true, published_at: new Date().toISOString() } : a));
      showNotif("success", "Published successfully!");
    } catch {
      showNotif("error", "Failed to publish.");
    }
  };

  const filtered = filterAudience
    ? announcements.filter(a => filterAudience === "All" ? true : a.audience === filterAudience || a.audience === "All")
    : announcements;

  const published = filtered.filter(a => a.is_published);
  const drafts = filtered.filter(a => !a.is_published);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
          notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-bold">{notification.msg}</p>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Announcements</h1>
          <p className="text-slate-500 font-medium mt-1">Broadcast notices to parents, teachers and students.</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-[#D4AF37] text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-200 active:scale-95"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total", value: announcements.length, color: "bg-blue-50 text-blue-600" },
          { label: "Published", value: announcements.filter(a => a.is_published).length, color: "bg-emerald-50 text-emerald-600" },
          { label: "Drafts / Scheduled", value: announcements.filter(a => !a.is_published).length, color: "bg-amber-50 text-amber-600" },
          { label: "Urgent", value: announcements.filter(a => a.priority === "Urgent").length, color: "bg-rose-50 text-rose-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <Megaphone size={20} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <h3 className="text-2xl font-black text-[#0B3C5D] mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Audience Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["", "All", "Parents", "Teachers", "Students"] as const).map(aud => (
          <button
            key={aud}
            onClick={() => setFilterAudience(aud)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterAudience === aud
                ? "bg-[#0B3C5D] text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {aud === "" ? "All Audiences" : AUDIENCE_CONFIG[aud as AnnouncementAudience]?.label || aud}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading announcements...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Published */}
          {published.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Send size={14} />
                Published ({published.length})
              </h2>
              <div className="space-y-4">
                {published.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    ann={ann}
                    onEdit={() => { setEditItem(ann); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(ann.id)}
                    onPublish={() => handlePublish(ann.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} />
                Drafts & Scheduled ({drafts.length})
              </h2>
              <div className="space-y-4">
                {drafts.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    ann={ann}
                    onEdit={() => { setEditItem(ann); setIsModalOpen(true); }}
                    onDelete={() => handleDelete(ann.id)}
                    onPublish={() => handlePublish(ann.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {published.length === 0 && drafts.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No announcements yet</h3>
              <p className="text-slate-400 text-sm mt-1">Create your first announcement to notify students and parents.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <AnnouncementModal
          ann={editItem}
          onClose={() => { setIsModalOpen(false); setEditItem(null); }}
          onSuccess={async (data) => {
            try {
              if (editItem) {
                const updated = await announcementRepository.updateAnnouncement(editItem.id, data);
                setAnnouncements(prev => prev.map(a => a.id === editItem.id ? updated : a));
                showNotif("success", "Updated successfully.");
              } else {
                const created = await announcementRepository.createAnnouncement(data);
                setAnnouncements(prev => [created, ...prev]);
                showNotif("success", data.is_published ? "Published!" : "Saved as draft.");
              }
            } catch {
              showNotif("error", "Failed to save announcement.");
            }
            setIsModalOpen(false);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

function AnnouncementCard({ ann, onEdit, onDelete, onPublish }: {
  ann: Announcement; onEdit: () => void; onDelete: () => void; onPublish: () => void;
}) {
  const pCfg = PRIORITY_CONFIG[ann.priority];
  const aCfg = AUDIENCE_CONFIG[ann.audience];
  const PIcon = pCfg.icon;
  const AIcon = aCfg.icon;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
      ann.priority === "Urgent" ? "border-rose-200" : ann.priority === "Important" ? "border-amber-200" : "border-slate-200"
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${pCfg.bg} ${pCfg.color}`}>
                <PIcon size={10} />
                {pCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 ${aCfg.color}`}>
                <AIcon size={10} />
                {aCfg.label}
              </span>
              {!ann.is_published && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                  <Clock size={10} />
                  {ann.scheduled_at ? "Scheduled" : "Draft"}
                </span>
              )}
              {ann.is_published && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={10} />
                  Live
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-[#0B3C5D] mb-2">{ann.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{ann.content}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!ann.is_published && (
              <button onClick={onPublish} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Publish">
                <Send size={16} />
              </button>
            )}
            <button onClick={onEdit} className="p-2 text-slate-400 hover:text-[#0B3C5D] hover:bg-blue-50 rounded-xl transition-colors">
              <Edit2 size={16} />
            </button>
            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-400 font-medium">
          <span>Created: {new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {ann.published_at && <span>Published: {new Date(ann.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          {ann.scheduled_at && !ann.is_published && <span>Scheduled: {new Date(ann.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
      </div>
    </div>
  );
}

function AnnouncementModal({ ann, onClose, onSuccess }: {
  ann: Announcement | null;
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [form, setForm] = useState({
    title: ann?.title || '',
    content: ann?.content || '',
    priority: (ann?.priority || 'Normal') as AnnouncementPriority,
    audience: (ann?.audience || 'All') as AnnouncementAudience,
    is_published: ann?.is_published || false,
    scheduled_at: ann?.scheduled_at || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onSuccess(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 bg-[#0B3C5D] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{ann ? 'Edit Announcement' : 'New Announcement'}</h2>
            <p className="text-white/60 text-xs mt-0.5">Notify parents, teachers or students instantly</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
            <input required type="text" placeholder="Announcement title..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content</label>
            <textarea required rows={5} placeholder="Write your announcement here..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/10 text-sm resize-none"
              value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] text-sm bg-white"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}>
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audience</label>
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] text-sm bg-white"
                value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}>
                <option value="All">Everyone</option>
                <option value="Parents">Parents Only</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Students">Students Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule (optional)</label>
            <input type="datetime-local"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0B3C5D] text-sm"
              value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <input type="checkbox" id="publish_now" className="w-4 h-4 accent-[#0B3C5D]"
              checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} />
            <label htmlFor="publish_now" className="text-sm font-bold text-slate-700 cursor-pointer">
              Publish immediately {form.scheduled_at ? '(override schedule)' : ''}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#D4AF37] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-amber-200 disabled:opacity-50">
              {loading ? 'Saving...' : form.is_published ? 'Publish Now' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
