import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadFile, deleteFile, generatePublicUrl, generateSignedUrl } from "@/lib/storage";

/**
 * High-level service orchestrating file storage operations.
 * Non-announcements are stored on Cloudflare R2, while announcements
 * are converted to WebP and stored in Supabase Storage ('announcements' bucket).
 */
export class FileStorageService {
  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    return await uploadFile(buffer, key, mimeType);
  }

  async deleteFile(key: string): Promise<boolean> {
    return await deleteFile(key);
  }

  async replaceFile(
    oldKey: string | null | undefined,
    buffer: Buffer,
    newKey: string,
    mimeType: string
  ): Promise<string> {
    const key = await this.uploadFile(buffer, newKey, mimeType);
    if (oldKey) {
      void this.deleteFile(oldKey);
    }
    return key;
  }

  generatePublicUrl(key: string): string {
    return generatePublicUrl(key);
  }

  async generateSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return await generateSignedUrl(key, expiresIn);
  }

  // Cloudflare R2 Upload (for Students, Parents, Teachers, Gallery, Assignments, etc.)
  private async uploadToR2(
    buffer: Buffer,
    folderType: string,
    entityId: string | undefined,
    extension: string,
    mimeType: string
  ) {
    const id = entityId || uuidv4();
    const folderMapping: Record<string, string> = {
      student: "students",
      parent: "parents",
      teacher: "teachers",
      gallery: "gallery",
      assignment: "assignments",
      document: "documents",
      report: "reports",
      certificate: "certificates",
      "question-paper": "question-papers",
      "study-material": "study-materials"
    };

    const folder = folderMapping[folderType.toLowerCase()] || "documents";
    const prefix = folderType.toLowerCase();
    const key = `${folder}/${prefix}_${id}.${extension}`;

    await this.uploadFile(buffer, key, mimeType);
    const publicUrl = this.generatePublicUrl(key);

    console.log(`[R2] Public URL Generated: ${publicUrl}`);

    return {
      success: true,
      storageKey: key,
      imageUrl: publicUrl,
      publicUrl,
      mimeType,
      size: buffer.byteLength,
      storageProvider: "cloudflare_r2",
    };
  }

  async uploadImage(
    buffer: Buffer,
    folderType: string,
    entityId: string | undefined,
    extension: string,
    mimeType: string
  ) {
    return await this.uploadToR2(buffer, folderType, entityId, extension, mimeType);
  }

  async uploadDocument(
    buffer: Buffer,
    folderType: string,
    entityId: string | undefined,
    extension: string,
    mimeType: string
  ) {
    return await this.uploadToR2(buffer, folderType, entityId, extension, mimeType);
  }

  // Supabase Storage WebP Upload (for Announcements only)
  async uploadAnnouncementImage(
    buffer: Buffer,
    announcementId?: string
  ) {
    const id = announcementId || uuidv4();
    console.log(`[Supabase Storage] Converting announcement image to WebP (ID: ${id})`);

    // 1. Convert buffer to WebP using sharp
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `announcement_${id}.webp`;
    console.log(`[Supabase Storage] Uploading ${fileName} to bucket 'announcements'`);

    // 2. Upload to Supabase 'announcements' bucket using admin client to bypass RLS
    const { data, error } = await supabaseAdmin.storage
      .from("announcements")
      .upload(fileName, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      console.error("[Supabase Storage] Upload failed:", error.message);
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    // 3. Generate public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("announcements")
      .getPublicUrl(fileName);

    console.log(`[Supabase Storage] Upload success. Public URL: ${publicUrl}`);

    return {
      success: true,
      storageKey: fileName,
      imageUrl: publicUrl,
      publicUrl,
      mimeType: "image/webp",
      size: webpBuffer.byteLength,
      storageProvider: "supabase",
    };
  }

  // Supabase Storage Deletion (for Announcements only)
  async deleteAnnouncementImage(fileName: string): Promise<boolean> {
    try {
      console.log(`[Supabase Storage] Deleting object ${fileName} from bucket 'announcements'`);
      const { data, error } = await supabaseAdmin.storage
        .from("announcements")
        .remove([fileName]);

      if (error) {
        console.warn("[Supabase Storage] Delete warning:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[Supabase Storage] Delete error:", err);
      return false;
    }
  }
}

export const fileStorageService = new FileStorageService();
export default fileStorageService;
