import { supabase } from "../supabase";
import { AppDownload } from "../types";

export interface AppDownloadPatch {
  download_url?: string;
  version?: string;
  min_os?: string;
  file_size?: string | null;
  is_active?: boolean;
  drive_file_id?: string | null;
  storage_key?: string | null;
}

export interface IAppDownloadsRepository {
  getAll(): Promise<AppDownload[]>;
  getByPlatform(platform: "android" | "ios"): Promise<AppDownload | null>;
  updateDownload(platform: "android" | "ios", patch: AppDownloadPatch): Promise<AppDownload>;
}

function mapDownload(item: any): AppDownload {
  if (!item) return item;
  return {
    ...item,
    storage_key: item.storage_key ?? item.drive_file_id,
    drive_file_id: item.storage_key ?? item.drive_file_id,
  };
}

export class SupabaseAppDownloadsRepository implements IAppDownloadsRepository {
  async getAll(): Promise<AppDownload[]> {
    const { data, error } = await supabase
      .from("app_downloads")
      .select("*")
      .order("platform");
    if (error) throw error;
    return (data ?? []).map(mapDownload);
  }

  async getByPlatform(platform: "android" | "ios"): Promise<AppDownload | null> {
    const { data, error } = await supabase
      .from("app_downloads")
      .select("*")
      .eq("platform", platform)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDownload(data) : null;
  }

  async updateDownload(platform: "android" | "ios", patch: AppDownloadPatch): Promise<AppDownload> {
    const updates: Record<string, unknown> = {};
    if (patch.download_url !== undefined) updates.download_url = patch.download_url;
    if (patch.version      !== undefined) updates.version      = patch.version;
    if (patch.min_os       !== undefined) updates.min_os       = patch.min_os;
    if (patch.file_size    !== undefined) updates.file_size    = patch.file_size;
    if (patch.is_active    !== undefined) updates.is_active    = patch.is_active;
    
    if (patch.storage_key !== undefined) {
      updates.storage_key = patch.storage_key;
      updates.storage_provider = "cloudflare_r2";
    } else if (patch.drive_file_id !== undefined) {
      updates.storage_key = patch.drive_file_id;
      updates.storage_provider = "cloudflare_r2";
    }

    const { data, error } = await supabase
      .from("app_downloads")
      .update(updates)
      .eq("platform", platform)
      .select("*")
      .single();
    if (error) throw error;
    return mapDownload(data);
  }
}

export const appDownloadsRepository = new SupabaseAppDownloadsRepository();
export default appDownloadsRepository;
