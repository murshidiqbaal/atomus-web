import { supabase } from "../supabase";
import {
  Batch,
  Campus,
  Course,
  CourseFilters,
  CourseMode,
  CourseType,
} from "../types";
import { deleteCourseThumbnail, uploadCourseThumbnail } from "../utils/storage_utils";

// ── Row → domain mapping ─────────────────────────────────────────
function mapCourseRow(row: any): Course {
  const campuses: Campus[] = (row.campus_courses ?? [])
    .map((cc: any) => cc.campuses)
    .filter(Boolean)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      location: c.location ?? null,
      isActive: c.is_active,
      createdAt: c.created_at,
    }));

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    subjects: [], // legacy field; subject_count is provided separately
    batchCount: row.batches?.[0]?.count ?? 0,
    subjectCount: row.subjects?.[0]?.count ?? 0,
    courseType: (row.course_type as CourseType) ?? "Regular",
    classLevel: row.class_level ?? null,
    durationMonths: row.duration_months ?? null,
    feeAmount: Number(row.fee_amount ?? 0),
    mode: (row.mode as CourseMode) ?? "Offline",
    thumbnailUrl: row.thumbnail_url ?? null,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    campuses,
  };
}

function mapBatchRow(row: any): Batch {
  return {
    id: row.id,
    courseId: row.course_id,
    campusId: row.campus_id ?? null,
    name: row.name,
    timing: row.timing ?? null,
    capacity: row.capacity ?? null,
    studentCount: row.students?.[0]?.count ?? 0,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// ── Input types ──────────────────────────────────────────────────
export interface CourseInput {
  name: string;
  description?: string | null;
  courseType: CourseType;
  classLevel?: string | null;
  durationMonths?: number | null;
  feeAmount: number;
  mode: CourseMode;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  /** If provided, the M:N campus_courses links are reconciled to this set. */
  campusIds?: string[];
}

export interface BatchInput {
  courseId: string;
  campusId?: string | null;
  name: string;
  timing?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}

// ── Interface ────────────────────────────────────────────────────
const COURSE_SELECT =
  "*, batches(count), subjects(count), campus_courses(campuses(id,name,location,is_active,created_at))";

export interface ICourseRepository {
  // Existing surface (preserved for backward compatibility)
  getCourses(filters?: CourseFilters): Promise<Course[]>;
  getBatchesByCourse(courseId: string): Promise<Batch[]>;
  addCourse(course: CourseInput | any): Promise<Course>;
  addBatch(batch: BatchInput | any): Promise<Batch>;

  // New
  getCourseById(id: string): Promise<Course | null>;
  updateCourse(id: string, patch: Partial<CourseInput>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  setCourseCampuses(courseId: string, campusIds: string[]): Promise<void>;
  updateBatch(id: string, patch: Partial<BatchInput>): Promise<Batch>;
  deleteBatch(id: string): Promise<void>;
  uploadThumbnail(courseId: string, file: File): Promise<string>;
}

export class SupabaseCourseRepository implements ICourseRepository {
  // ── Reads ──────────────────────────────────────────────────────
  async getCourses(filters: CourseFilters = {}): Promise<Course[]> {
    let q = supabase
      .from("courses")
      .select(COURSE_SELECT)
      .order("created_at", { ascending: false });

    if (filters.courseType)              q = q.eq("course_type", filters.courseType);
    if (filters.mode)                    q = q.eq("mode", filters.mode);
    if (filters.classLevel)              q = q.eq("class_level", filters.classLevel);
    if (typeof filters.isActive === "boolean") q = q.eq("is_active", filters.isActive);

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim().replace(/[%_]/g, "");
      q = q.ilike("name", `%${term}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    let courses = (data ?? []).map(mapCourseRow);

    // Campus filter — applied client-side because we'd otherwise need a
    // join filter on the M:N pivot. The course count per dashboard is small.
    if (filters.campusId) {
      courses = courses.filter((c) =>
        (c.campuses ?? []).some((cp) => cp.id === filters.campusId)
      );
    }
    return courses;
  }

  async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCourseRow(data) : null;
  }

  async getBatchesByCourse(courseId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from("batches")
      .select("*, students(count)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapBatchRow);
  }

  // ── Writes: course ────────────────────────────────────────────
  async addCourse(input: CourseInput | any): Promise<Course> {
    // Allow legacy callers that pass already-snake-cased rows.
    const row = isCourseInput(input)
      ? courseInputToRow(input)
      : input;

    const { campusIds, ...rest } = (input as CourseInput).campusIds !== undefined
      ? { campusIds: (input as CourseInput).campusIds, ...row }
      : { campusIds: undefined as string[] | undefined, ...row };

    const { data, error } = await supabase
      .from("courses")
      .insert([rest])
      .select(COURSE_SELECT)
      .single();
    if (error) throw error;

    const created = mapCourseRow(data);
    if (campusIds && campusIds.length > 0) {
      await this.setCourseCampuses(created.id, campusIds);
      const refreshed = await this.getCourseById(created.id);
      return refreshed ?? created;
    }
    return created;
  }

  async updateCourse(id: string, patch: Partial<CourseInput>): Promise<Course> {
    const row = courseInputToRow(patch);
    if (Object.keys(row).length > 0) {
      const { error } = await supabase.from("courses").update(row).eq("id", id);
      if (error) throw error;
    }
    if (patch.campusIds) {
      await this.setCourseCampuses(id, patch.campusIds);
    }
    const refreshed = await this.getCourseById(id);
    if (!refreshed) throw new Error(`Course ${id} not found after update`);
    return refreshed;
  }

  async deleteCourse(id: string): Promise<void> {
    // Best-effort cleanup of the thumbnail before deleting the row.
    const existing = await this.getCourseById(id);
    if (existing?.thumbnailUrl) {
      try { await deleteCourseThumbnail(existing.thumbnailUrl); } catch { /* ignore */ }
    }
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) throw error;
  }

  async setCourseCampuses(courseId: string, campusIds: string[]): Promise<void> {
    const { data, error } = await supabase
      .from("campus_courses")
      .select("campus_id")
      .eq("course_id", courseId);
    if (error) throw error;

    const current = new Set((data ?? []).map((r: any) => r.campus_id));
    const next = new Set(campusIds);

    const toAdd    = [...next].filter((cid) => !current.has(cid));
    const toRemove = [...current].filter((cid) => !next.has(cid));

    if (toAdd.length > 0) {
      const { error: insErr } = await supabase
        .from("campus_courses")
        .insert(toAdd.map((campus_id) => ({ campus_id, course_id: courseId })));
      if (insErr) throw insErr;
    }
    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from("campus_courses")
        .delete()
        .eq("course_id", courseId)
        .in("campus_id", toRemove);
      if (delErr) throw delErr;
    }
  }

  async uploadThumbnail(courseId: string, file: File): Promise<string> {
    return uploadCourseThumbnail(courseId, file);
  }

  // ── Writes: batch ─────────────────────────────────────────────
  async addBatch(input: BatchInput | any): Promise<Batch> {
    const row = isBatchInput(input) ? batchInputToRow(input) : input;
    const { data, error } = await supabase
      .from("batches")
      .insert([row])
      .select("*, students(count)")
      .single();
    if (error) throw error;
    return mapBatchRow(data);
  }

  async updateBatch(id: string, patch: Partial<BatchInput>): Promise<Batch> {
    const { data, error } = await supabase
      .from("batches")
      .update(batchInputToRow(patch))
      .eq("id", id)
      .select("*, students(count)")
      .single();
    if (error) throw error;
    return mapBatchRow(data);
  }

  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) throw error;
  }
}

// ── helpers ─────────────────────────────────────────────────────
function isCourseInput(v: any): v is CourseInput {
  return v && typeof v === "object" && "courseType" in v;
}

function isBatchInput(v: any): v is BatchInput {
  return v && typeof v === "object" && "courseId" in v;
}

function courseInputToRow(input: Partial<CourseInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined)           row.name = input.name.trim();
  if (input.description !== undefined)    row.description = input.description?.trim() || null;
  if (input.courseType !== undefined)     row.course_type = input.courseType;
  if (input.classLevel !== undefined)     row.class_level = input.classLevel || null;
  if (input.durationMonths !== undefined) row.duration_months = input.durationMonths;
  if (input.feeAmount !== undefined)      row.fee_amount = input.feeAmount;
  if (input.mode !== undefined)           row.mode = input.mode;
  if (input.thumbnailUrl !== undefined)   row.thumbnail_url = input.thumbnailUrl;
  if (input.isActive !== undefined)       row.is_active = input.isActive;
  return row;
}

function batchInputToRow(input: Partial<BatchInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.courseId !== undefined) row.course_id = input.courseId;
  if (input.campusId !== undefined) row.campus_id = input.campusId;
  if (input.name !== undefined)     row.name = input.name.trim();
  if (input.timing !== undefined)   row.timing = input.timing?.trim() || null;
  if (input.capacity !== undefined) row.capacity = input.capacity;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export const courseRepository = new SupabaseCourseRepository();
