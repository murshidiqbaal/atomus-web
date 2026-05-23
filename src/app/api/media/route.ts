import { NextRequest } from "next/server";
import { getDrive } from "@/lib/google";

export const runtime = "nodejs";

/**
 * Proxies Google Drive media assets as local first-party network images.
 * This completely resolves Google cookie blocking, CORS, and auth/consent issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  if (!fileId) {
    return new Response("Missing media file id parameter", { status: 400 });
  }

  try {
    const drive = getDrive();

    // 1. Get file metadata to check mimeType
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType",
    });

    const mimeType = meta.data.mimeType || "application/octet-stream";

    // 2. Fetch the file content stream from Google Drive
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // 3. Stream the file directly to the client as first-party network image response
    const download = searchParams.get("download");
    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (download === "true") {
      // Determine file extension from mimeType
      let ext = "jpg";
      if (mimeType.includes("png")) ext = "png";
      else if (mimeType.includes("gif")) ext = "gif";
      else if (mimeType.includes("webp")) ext = "webp";
      else if (mimeType.includes("pdf")) ext = "pdf";

      headers["Content-Disposition"] = `attachment; filename="student_profile.${ext}"`;
    }

    return new Response(res.data as any, {
      headers,
    });
  } catch (error: any) {
    console.error("Failed to proxy Drive file:", error);
    return new Response(`Failed to load media: ${error.message}`, { status: 502 });
  }
}
