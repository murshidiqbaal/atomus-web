import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth/server_auth";
import { fileStorageService } from "@/services/FileStorageService";

export const runtime = "nodejs";

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
      const ext = originalFileName.split(".").pop()?.toLowerCase() ?? "";
      if (ext !== "apk" && ext !== "ipa" && ext !== "zip") {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${mimeType}. Upload an .apk or .ipa file.`,
          },
          { status: 415 },
        );
      }
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

  const ext = originalFileName.split(".").pop()?.toLowerCase() || "apk";
  const timestamp = Date.now();
  const fileName = `app_${timestamp}.${ext}`;

  // ── R2 Storage upload (delegated to centralized FileStorageService) ────────
  try {
    const result = await fileStorageService.uploadDocument(
      buffer,
      "document",
      undefined,
      ext,
      mimeType
    );

    return NextResponse.json(
      {
        fileId: result.storageKey,
        imageUrl: result.imageUrl,
        fileName,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
