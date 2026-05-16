import { supabase } from "@/lib/supabase";
import { convertToWebP } from "./image_utils";

const THUMBNAIL_BUCKET = "course-thumbnails";

/**
 * Uploads a course thumbnail. Compresses to WebP first, then uploads
 * under `course/<id>/<timestamp>.webp` and returns the public URL.
 */
export async function uploadCourseThumbnail(
  courseId: string,
  file: File,
  quality: number = 0.8
): Promise<string> {
  const webp = await convertToWebP(file, quality);
  const path = `course/${courseId}/${Date.now()}.webp`;

  const { error: uploadErr } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, webp, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Deletes a previously-uploaded thumbnail by its public URL. No-op if the
 * URL doesn't belong to the bucket. Safe to call on update/delete flows.
 */
export async function deleteCourseThumbnail(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  const marker = `/${THUMBNAIL_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  const { error } = await supabase.storage.from(THUMBNAIL_BUCKET).remove([path]);
  // Swallow not-found; surface anything else.
  if (error && !/not.?found/i.test(error.message)) throw error;
}
