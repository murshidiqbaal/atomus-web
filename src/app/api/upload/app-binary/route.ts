import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { buildFileName } from "@/lib/google/fileName";
import { uploadFileToDrive } from "@/lib/uploadToDrive";
import { DRIVE_FOLDERS } from "@/lib/driveFolders";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Next.js App Router Route Handlers on the nodejs runtime do NOT apply
// the body-size limit that affects Server Actions — the request body is
// streamed directly through Node.js http, so large files work fine as
// long as we read them with the Web Streams API (request.arrayBuffer()
// or request.formData()), which is what we do here.
//
// The limit we validate ourselves: 150 MB.
const MAX_BYTES = 150 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.android.package-archive", // .apk
  "application/octet-stream",                 // generic binary
  "application/zip",                          // .ipa
  "application/x-zip-compressed",
  "application/x-zip",
  "application/x-ios-app",
]);

export async function POST(request: NextRequest): Promise<Response> {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const auth = await getServerAuth();
  if (!auth.authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin" && auth.role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  let buffer: Buffer;
  let originalFileName: string;
  let mimeType: string;

  // ── Strategy A: multipart/form-data (browser <input type="file"> default) ──
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to parse multipart body: ${err?.message ?? "unknown error"}` },
        { status: 400 },
      );
    }

    const file = form.get("file") as File | null;
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file in request (expected field 'file')." },
        { status: 400 },
      );
    }

    mimeType = (file.type || "application/octet-stream").toLowerCase();
    originalFileName = file.name || "upload.apk";

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      // Many browsers/OSes send APK/IPA as octet-stream — allow unknown types
      // by extension check as a secondary pass
      const ext = originalFileName.split(".").pop()?.toLowerCase() ?? "";
      if (ext !== "apk" && ext !== "ipa" && ext !== "zip") {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${mimeType}. Upload an .apk or .ipa file.`,
          },
          { status: 415 },
        );
      }
      // Force a known mime
      mimeType = ext === "apk" ? "application/vnd.android.package-archive" : "application/zip";
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 150 MB.`,
        },
        { status: 413 },
      );
    }

    buffer = Buffer.from(await file.arrayBuffer());

  // ── Strategy B: raw octet-stream (curl / programmatic uploads) ─────────────
  } else if (contentType.includes("application/octet-stream") || contentType.includes("application/zip")) {
    originalFileName =
      request.headers.get("x-file-name") ??
      request.headers.get("x-filename") ??
      "upload.apk";
    mimeType = contentType.split(";")[0].trim();

    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File too large (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB). Max is 150 MB.`,
        },
        { status: 413 },
      );
    }
    buffer = Buffer.from(bytes);

  } else {
    return NextResponse.json(
      {
        error:
          "Expected multipart/form-data or application/octet-stream request body. " +
          `Received: ${contentType || "(empty)"}`,
      },
      { status: 400 },
    );
  }

  const fileName = buildFileName("app", originalFileName);

  // ── Local fallback (no Google credentials) ─────────────────────────────────
  const hasOAuth = !!process.env.GOOGLE_REFRESH_TOKEN;
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!hasOAuth && !hasServiceAccount) {
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "app_downloads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      return NextResponse.json(
        {
          fileId:   `local-app_downloads-${fileName}`,
          imageUrl: `/uploads/app_downloads/${fileName}`,
          fileName,
        },
        { status: 200 },
      );
    } catch (localErr: any) {
      return NextResponse.json(
        { error: `Local fallback upload failed: ${localErr.message}` },
        { status: 500 },
      );
    }
  }

  // ── Google Drive upload ────────────────────────────────────────────────────
  const folderId = DRIVE_FOLDERS.app_downloads;
  if (!folderId || folderId === "app_downloads_folder") {
    return NextResponse.json(
      {
        error:
          'Google Drive folder for app_downloads is not configured. ' +
          'Set GOOGLE_DRIVE_FOLDER_APP_DOWNLOADS in your environment, or configure Google credentials to use local storage.',
      },
      { status: 500 },
    );
  }

  try {
    const result = await uploadFileToDrive({ buffer, mimeType, fileName, folderId });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drive upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
