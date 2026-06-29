import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/downloads
 *
 * Public endpoint — no auth required.
 * Returns the current app download configuration for both platforms
 * so the frontend HTML page can fetch and update the download buttons
 * dynamically without redeploying the HTML.
 *
 * Response shape:
 * {
 *   android: { download_url, version, min_os, file_size, is_active },
 *   ios:     { download_url, version, min_os, file_size, is_active }
 * }
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data, error } = await supabase
      .from("app_downloads")
      .select("platform, download_url, version, min_os, file_size, is_active");

    if (error) {
      console.error("[/api/downloads] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to load download config" }, { status: 500 });
    }

    const result: Record<string, any> = {};
    for (const row of (data ?? [])) {
      result[row.platform] = {
        download_url: row.download_url,
        version:      row.version,
        min_os:       row.min_os,
        file_size:    row.file_size,
        is_active:    row.is_active,
      };
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        // Allow the public HTML page to call this from any origin
        "Access-Control-Allow-Origin": "*",
        // Cache for 60 seconds so rapid page loads don't hammer Supabase
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    console.error("[/api/downloads] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
