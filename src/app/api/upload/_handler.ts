import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { DRIVE_FOLDERS, type DriveFolderKey } from "@/lib/driveFolders";
import { buildFileName } from "@/lib/google/fileName";
import { validateUploadedFile, type ValidationKind } from "@/lib/google/validate";
import { uploadFile } from "@/lib/google-drive";

export interface UploadHandlerOptions {
  folderKey: DriveFolderKey;
  validationKind: ValidationKind;
  fileNamePrefix: string;
}

/**
 * Creates a `POST` handler that:
 *  1. Admin-gates the request.
 *  2. Parses `multipart/form-data` (`file` field).
 *  3. Validates type + size for the given kind.
 *  4. Uploads directly to Google Drive (memory-only, no disk writes).
 *  5. Returns { success, driveFileId, imageUrl, thumbnailUrl, message }.
 *
 * NEVER saves to disk. NEVER attempts a local fallback.
 * If Drive credentials are missing or the upload fails, returns a proper
 * JSON error response immediately.
 *
 * Each `/api/upload/<surface>/route.ts` is a one-liner around this factory.
 */
export function createUploadHandler(opts: UploadHandlerOptions) {
  return async function POST(request: Request): Promise<Response> {
    const auth = await getServerAuth();
    if (!auth.authed) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Expected multipart/form-data request body." },
        { status: 400 },
      );
    }

    const file = form.get("file") as File | null;
    const v = validateUploadedFile(file, opts.validationKind);
    if (!v.ok) {
      return NextResponse.json({ success: false, error: v.message }, { status: v.status });
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const fileName = buildFileName(opts.fileNamePrefix, v.fileName);

    // Resolve the Drive folder ID for this surface
    const folderId = DRIVE_FOLDERS[opts.folderKey];
    if (!folderId) {
      return NextResponse.json(
        { success: false, error: `Drive folder for "${opts.folderKey}" is not configured.` },
        { status: 500 },
      );
    }

    // Upload directly to Google Drive — no local fallback, no disk writes
    try {
      const result = await uploadFile({
        buffer,
        mimeType: v.mimeType,
        fileName,
        folderId,
      });

      console.log(`[Drive] Supabase Saved — returning Drive result for: ${fileName}`);

      return NextResponse.json(
        {
          success: true,
          driveFileId: result.driveFileId,
          // Legacy key alias so existing callers using `fileId` keep working
          fileId: result.driveFileId,
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl,
          webViewLink: result.webViewLink,
          fileName: result.fileName,
          message: result.message,
        },
        { status: 200 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google Drive upload failed.";
      console.error(`[Drive] Upload failed for ${fileName}:`, message);
      return NextResponse.json({ success: false, error: "Google Drive upload failed." }, { status: 502 });
    }
  };
}
