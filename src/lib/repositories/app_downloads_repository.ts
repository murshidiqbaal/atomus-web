import { supabase } from "../supabase";
import { AppDownload } from "../types";

export interface AppDownloadPatch {
  download_url?: string;
  version?: string;
  min_os?: string;
  file_size?: string | null;
  is_active?: boolean;
  drive_file_id?: string | null;
}

export interface IAppDownloadsRepository {
  getAll(): Promise<AppDownload[]>;
  getByPlatform(platform: "android" | "ios"): Promise<AppDownload | null>;
  updateDownload(platform: "android" | "ios", patch: AppDownloadPatch): Promise<AppDownload>;
}

export class SupabaseAppDownloadsRepository implements IAppDownloadsRepository {
  async getAll(): Promise<AppDownload[]> {
    const { data, error } = await supabase
      .from("app_downloads")
      .select("*")
      .order("platform");
    if (error) throw error;
    return (data ?? []) as AppDownload[];
  }

  async getByPlatform(platform: "android" | "ios"): Promise<AppDownload | null> {
    const { data, error } = await supabase
      .from("app_downloads")
      .select("*")
      .eq("platform", platform)
      .maybeSingle();
    if (error) throw error;
    return data as AppDownload | null;
  }

  async updateDownload(platform: "android" | "ios", patch: AppDownloadPatch): Promise<AppDownload> {
    const updates: Record<string, unknown> = {};
    if (patch.download_url  !== undefined) updates.download_url  = patch.download_url;
    if (patch.version       !== undefined) updates.version       = patch.version;
    if (patch.min_os        !== undefined) updates.min_os        = patch.min_os;
    if (patch.file_size     !== undefined) updates.file_size     = patch.file_size;
    if (patch.is_active     !== undefined) updates.is_active     = patch.is_active;
    if (patch.drive_file_id !== undefined) updates.drive_file_id = patch.drive_file_id;

    const { data, error } = await supabase
      .from("app_downloads")
      .update(updates)
      .eq("platform", platform)
      .select("*")
      .single();
    if (error) throw error;
    return data as AppDownload;
  }
}

export const appDownloadsRepository = new SupabaseAppDownloadsRepository();
