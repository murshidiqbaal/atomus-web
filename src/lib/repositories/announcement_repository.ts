import { supabase } from "../supabase";
import { Announcement } from "../types";

export class SupabaseAnnouncementRepository {
  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Announcement[];
  }

  async createAnnouncement(payload: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title: payload.title,
        content: payload.content,
        priority: payload.priority,
        audience: payload.audience,
        is_published: payload.is_published,
        scheduled_at: payload.scheduled_at || null,
        published_at: payload.is_published ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Announcement;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title: updates.title,
        content: updates.content,
        priority: updates.priority,
        audience: updates.audience,
        is_published: updates.is_published,
        scheduled_at: updates.scheduled_at,
        published_at: updates.is_published ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  }

  async publishAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}

export const announcementRepository = new SupabaseAnnouncementRepository();
