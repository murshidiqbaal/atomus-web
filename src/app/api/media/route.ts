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

  // Fallback to direct public googleusercontent fetch
  const fallbackFetch = async () => {
    const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    const response = await fetch(publicUrl);
    if (!response.ok) {
      throw new Error(`Public fetch failed with status ${response.status}`);
    }
    const contentType = response.headers.get("Content-Type") || "image/jpeg";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    const download = searchParams.get("download");
    if (download === "true") {
      let ext = "jpg";
      if (contentType.includes("png")) ext = "png";
      else if (contentType.includes("gif")) ext = "gif";
      else if (contentType.includes("webp")) ext = "webp";
      else if (contentType.includes("pdf")) ext = "pdf";
      headers["Content-Disposition"] = `attachment; filename="student_profile.${ext}"`;
    }
    return new Response(response.body, { headers });
  };

  try {
    // Check if we have credentials before calling getDrive() to avoid throwing immediately
    const hasOAuth = !!process.env.GOOGLE_REFRESH_TOKEN;
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!hasOAuth && !hasServiceAccount) {
      return await fallbackFetch();
    }

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
    console.warn("Failed to proxy Drive file via API client, attempting public fallback:", error.message);
    try {
      return await fallbackFetch();
    } catch (fallbackError: any) {
      console.error("Public fallback also failed:", fallbackError);
      return new Response(`Failed to load media: ${error.message}`, { status: 502 });
    }
  }
}
