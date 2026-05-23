import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { DRIVE_FOLDERS, type DriveFolderKey } from "@/lib/driveFolders";
import { buildFileName } from "@/lib/google/fileName";
import { uploadFileToDrive } from "@/lib/uploadToDrive";
import { validateUploadedFile, type ValidationKind } from "@/lib/google/validate";

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
 *  4. Uploads to the configured personal Google Drive folder using OAuth2 and returns the public URL.
 *
 * Each `/api/upload/<surface>/route.ts` is a one-liner around this factory.
 */
export function createUploadHandler(opts: UploadHandlerOptions) {
  return async function POST(request: Request): Promise<Response> {
    const auth = await getServerAuth();
    if (!auth.authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data request body." },
        { status: 400 },
      );
    }

    const file = form.get("file") as File | null;
    const v = validateUploadedFile(file, opts.validationKind);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: v.status });
    }

    const folderId = DRIVE_FOLDERS[opts.folderKey];
    if (!folderId) {
      return NextResponse.json(
        { error: `Drive folder for "${opts.folderKey}" is not configured.` },
        { status: 500 },
      );
    }

    try {
      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const fileName = buildFileName(opts.fileNamePrefix, v.fileName);

      const result = await uploadFileToDrive({
        buffer,
        mimeType: v.mimeType,
        fileName,
        folderId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Drive upload failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  };
}
