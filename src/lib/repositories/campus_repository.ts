import { supabase } from "../supabase";
import { Campus } from "../types";

export interface CampusInput {
  name: string;
  location?: string | null;
  isActive?: boolean;
}

function mapCampusRow(row: any): Campus {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
    courseCount: row.campus_courses?.[0]?.count ?? undefined,
  };
}

export interface ICampusRepository {
  getCampuses(opts?: { activeOnly?: boolean }): Promise<Campus[]>;
  getCampusById(id: string): Promise<Campus | null>;
  addCampus(input: CampusInput): Promise<Campus>;
  updateCampus(id: string, patch: Partial<CampusInput>): Promise<Campus>;
  deleteCampus(id: string): Promise<void>;

  // M:N course linking
  getCourseIdsByCampus(campusId: string): Promise<string[]>;
  setCampusCourses(campusId: string, courseIds: string[]): Promise<void>;
  linkCourse(campusId: string, courseId: string): Promise<void>;
  unlinkCourse(campusId: string, courseId: string): Promise<void>;
}

export class SupabaseCampusRepository implements ICampusRepository {
  async getCampuses(opts: { activeOnly?: boolean } = {}): Promise<Campus[]> {
    let q = supabase
      .from("campuses")
      .select("*, campus_courses(count)")
      .order("name", { ascending: true });

    if (opts.activeOnly) q = q.eq("is_active", true);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapCampusRow);
  }

  async getCampusById(id: string): Promise<Campus | null> {
    const { data, error } = await supabase
      .from("campuses")
      .select("*, campus_courses(count)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCampusRow(data) : null;
  }

  async addCampus(input: CampusInput): Promise<Campus> {
    const { data, error } = await supabase
      .from("campuses")
      .insert([{
        name: input.name.trim(),
        location: input.location?.trim() || null,
        is_active: input.isActive ?? true,
      }])
      .select("*")
      .single();
    if (error) throw error;
    return mapCampusRow(data);
  }

  async updateCampus(id: string, patch: Partial<CampusInput>): Promise<Campus> {
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined)     updates.name = patch.name.trim();
    if (patch.location !== undefined) updates.location = patch.location?.trim() || null;
    if (patch.isActive !== undefined) updates.is_active = patch.isActive;

    const { data, error } = await supabase
      .from("campuses")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapCampusRow(data);
  }

  async deleteCampus(id: string): Promise<void> {
    const { error } = await supabase.from("campuses").delete().eq("id", id);
    if (error) throw error;
  }

  async getCourseIdsByCampus(campusId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("campus_courses")
      .select("course_id")
      .eq("campus_id", campusId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.course_id);
  }

  /**
   * Replace the campus's course assignments with exactly `courseIds`.
   * Uses a diff: inserts the missing rows, deletes the removed ones.
   */
  async setCampusCourses(campusId: string, courseIds: string[]): Promise<void> {
    const current = new Set(await this.getCourseIdsByCampus(campusId));
    const next = new Set(courseIds);

    const toAdd = [...next].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("campus_courses")
        .insert(toAdd.map((course_id) => ({ campus_id: campusId, course_id })));
      if (error) throw error;
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("campus_courses")
        .delete()
        .eq("campus_id", campusId)
        .in("course_id", toRemove);
      if (error) throw error;
    }
  }

  async linkCourse(campusId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from("campus_courses")
      .insert([{ campus_id: campusId, course_id: courseId }]);
    // Ignore unique-violation so the call is effectively idempotent.
    if (error && (error as any).code !== "23505") throw error;
  }

  async unlinkCourse(campusId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from("campus_courses")
      .delete()
      .eq("campus_id", campusId)
      .eq("course_id", courseId);
    if (error) throw error;
  }
}

export const campusRepository = new SupabaseCampusRepository();
