import { supabase } from "@/lib/supabase";
import { Announcement, AnnouncementStats } from "../types";
import { convertToWebP } from "@/lib/utils/image_utils";

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

  async uploadPoster(file: File): Promise<string> {
    // Convert to WebP and compress
    const webpBlob = await convertToWebP(file, 0.7);
    
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.webp`;
    const filePath = `posters/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(filePath, webpBlob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('announcements')
      .getPublicUrl(filePath);

    return data.publicUrl;
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
