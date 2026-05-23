import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { deleteDriveFile } from "@/lib/uploadToDrive";

export const runtime = "nodejs";

/**
 * Deletes a Drive file. Used when an admin replaces a profile photo or
 * removes an announcement banner. Failure is non-fatal client-side — orphan
 * Drive files are tolerable.
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

  const ok = await deleteDriveFile(id);
  return NextResponse.json({ deleted: ok });
}
