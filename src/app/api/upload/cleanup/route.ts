import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { deleteDriveFile } from "@/lib/uploadToDrive";

export const runtime = "nodejs";

export async function DELETE(request: Request): Promise<Response> {
  const auth = await getServerAuth();
  if (!auth.authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=<drive_file_id>" }, { status: 400 });
  }

  // 1. Delete local file if it was uploaded locally (starts with "local-")
  if (id.startsWith("local-")) {
    try {
      const parts = id.split("-");
      // Format: local-[folderKey]-[fileName]
      const folderKey = parts[1];
      const fileName = parts.slice(2).join("-");
      
      const filePath = path.join(process.cwd(), "public", "uploads", folderKey, fileName);
      await fs.unlink(filePath);
      return NextResponse.json({ deleted: true });
    } catch (err: any) {
      console.warn("Failed to delete local file:", err.message);
      return NextResponse.json({ deleted: false });
    }
  }

  // 2. Fallback: Delete from Google Drive
  const ok = await deleteDriveFile(id);
  return NextResponse.json({ deleted: ok });
}
