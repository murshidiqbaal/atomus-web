import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { deleteFile } from "@/lib/google-drive";

export const runtime = "nodejs";

/**
 * DELETE /api/upload/cleanup?id=<driveFileId>
 *
 * Best-effort deletion of a Google Drive file by its ID.
 * All file IDs are treated as Drive file IDs — there is no local file fallback.
 * Never writes to or reads from the local file system.
 */
export async function DELETE(request: Request): Promise<Response> {
  const auth = await getServerAuth();
  if (!auth.authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=<drive_file_id>" }, { status: 400 });
  }

  const ok = await deleteFile(id);
  return NextResponse.json({ deleted: ok });
}
