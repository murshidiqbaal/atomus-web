import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { fileStorageService } from "@/services/FileStorageService";

export const runtime = "nodejs";

/**
 * DELETE /api/upload/cleanup?id=<storageKey>
 *
 * Deletes a file from either Cloudflare R2 or Supabase Storage.
 */
export async function DELETE(request: Request): Promise<Response> {
  const auth = await getServerAuth();
  if (!auth.authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=<storage_key>" }, { status: 400 });
  }

  let ok = false;
  if (!id.includes("/") && id.startsWith("announcement_")) {
    // Supabase Storage deletion for announcements
    ok = await fileStorageService.deleteAnnouncementImage(id);
    console.log(`[Storage] Deleting from Supabase: ${id} - Success: ${ok}`);
  } else {
    // Cloudflare R2 deletion for others
    ok = await fileStorageService.deleteFile(id);
    console.log(`[Storage] Deleting from Cloudflare R2: ${id} - Success: ${ok}`);
  }

  return NextResponse.json({ deleted: ok });
}
