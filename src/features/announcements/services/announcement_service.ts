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

  /**
   * Deletes an announcement and its associated Google Drive image.
   *
   * Flow:
   *   1. Fetch the announcement to get image_drive_id
   *   2. Delete the Drive image (best-effort, via cleanup API)
   *   3. Delete the database row
   *
   * Step 2 is fire-and-forget — a failed Drive delete will not block the DB delete.
   */
  async deleteAnnouncement(id: string): Promise<void> {
    // 1. Fetch to get the Drive file ID before deleting
    const { data: existing } = await supabase
      .from('announcements')
      .select('image_drive_id')
      .eq('id', id)
      .single();

    // 2. Best-effort: delete the Drive image (non-blocking)
    const driveId = existing?.image_drive_id;
    if (driveId) {
      void fetch(`/api/upload/cleanup?id=${encodeURIComponent(driveId)}`, {
        method: "DELETE",
      }).catch(() => {
        // Swallowed by design — Drive cleanup must never block announcement deletion
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
