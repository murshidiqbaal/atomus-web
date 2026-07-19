import { supabase } from "@/lib/supabase";
import { Announcement, AnnouncementStats } from "../types";

function mapAnnouncement(item: any): Announcement {
  if (!item) return item;
  return {
    ...item,
    storage_key: item.storage_key ?? item.image_drive_id,
    image_drive_id: item.storage_key ?? item.image_drive_id,
  };
}

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAnnouncement);
  },

  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select()
      .single();

    if (error) throw error;
    return mapAnnouncement(data);
  },

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapAnnouncement(data);
  },

  /**
   * Deletes an announcement and its associated image from Supabase Storage.
   */
  async deleteAnnouncement(id: string): Promise<void> {
    // 1. Fetch the storage key before deleting the DB row
    const { data: existing } = await supabase
      .from('announcements')
      .select('storage_key')
      .eq('id', id)
      .single();

    // 2. Best-effort: delete the announcement image from Supabase Storage (non-blocking)
    const storageKey = existing?.storage_key;
    if (storageKey) {
      void fetch(`/api/upload/cleanup?id=${encodeURIComponent(storageKey)}`, {
        method: "DELETE",
      }).catch(() => {
        // Swallowed by design
      });
    }

    // 3. Delete the database row
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
