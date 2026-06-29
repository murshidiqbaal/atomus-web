import { supabase } from "@/lib/supabase";

export interface ParentActivityLog {
  id: string;
  parent_id: string;
  parent_name: string;
  device_platform: 'Android' | 'iOS' | 'Unknown';
  app_version: string;
  login_date: string;
  opened_at: string;
  last_seen_at: string;
  session_duration_minutes: number;
}

export interface ActivityLogsResponse {
  logs: ParentActivityLog[];
  count: number;
}

export interface ActivityMetrics {
  today_active: number;
  weekly_active: number;
  monthly_active: number;
  avg_session_duration: number;
}

export const activityService = {
  async getLogs(params: {
    search?: string;
    date?: string;
    campusId?: string;
    courseId?: string;
    activeToday?: boolean;
    page: number;
    limit: number;
  }): Promise<ActivityLogsResponse> {
    const { search, date, campusId, courseId, activeToday, page, limit } = params;

    // 1. Resolve parent IDs by campus and course first if specified
    let parentIds: string[] | null = null;
    if (campusId || courseId) {
      let query = supabase.from('students').select('parent_id, batches!inner(campus_id)');
      if (campusId) {
        query = query.eq('batches.campus_id', campusId);
      }
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching filtered students:', error);
        return { logs: [], count: 0 };
      }
      
      if (data) {
        parentIds = data.map(d => d.parent_id).filter(Boolean) as string[];
      } else {
        parentIds = [];
      }
    }

    // 2. Query activity logs
    let logQuery = supabase
      .from('parent_app_activity_logs')
      .select('*', { count: 'exact' });

    if (search) {
      logQuery = logQuery.ilike('parent_name', `%${search}%`);
    }

    if (date) {
      logQuery = logQuery.eq('login_date', date);
    }

    if (activeToday) {
      const todayStr = new Date().toISOString().split('T')[0];
      logQuery = logQuery.eq('login_date', todayStr);
    }

    if (parentIds !== null) {
      if (parentIds.length === 0) {
        return { logs: [], count: 0 };
      }
      logQuery = logQuery.in('parent_id', parentIds);
    }

    // Order by last_seen_at desc
    logQuery = logQuery.order('last_seen_at', { ascending: false });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    logQuery = logQuery.range(from, to);

    const { data, count, error } = await logQuery;
    if (error) {
      console.error('Error fetching parent activity logs:', error);
      throw error;
    }

    return {
      logs: (data || []) as ParentActivityLog[],
      count: count || 0
    };
  },

  async getMetrics(): Promise<ActivityMetrics> {
    const { data, error } = await supabase.rpc('get_parent_activity_metrics');
    if (error) {
      console.error('Error fetching parent activity metrics:', error);
      throw error;
    }
    return data as ActivityMetrics;
  }
};
