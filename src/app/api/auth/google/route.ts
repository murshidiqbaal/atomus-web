import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google";
import { getServerAuth } from "@/lib/auth/server_auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.authed || auth.role !== "admin") {
      return new Response("Unauthorized: Only admins can trigger Google Drive OAuth authorization.", { status: 401 });
    }

    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return new Response(`Failed to generate Google Auth URL: ${error.message}`, { status: 500 });
  }
}
