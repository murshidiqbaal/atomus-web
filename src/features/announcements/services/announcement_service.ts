import { supabase } from "@/lib/supabase";
import { Announcement, AnnouncementStats } from "../types";

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getStats(): Promise<AnnouncementStats> {
    const { data, error } = await supabase
      .from('announcements')
      .select('is_active, is_popup, start_date');

    if (error) throw error;

    const now = new Date();
    const stats: AnnouncementStats = {
      total: data.length,
      active: data.filter(a => a.is_active).length,
      popup: data.filter(a => a.is_popup).length,
      scheduled: data.filter(a => new Date(a.start_date) > now).length,
    };

    return stats;
  }
};
