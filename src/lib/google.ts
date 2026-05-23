import { google, type drive_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"];

let cachedDrive: drive_v3.Drive | null = null;

/**
 * Returns a configured OAuth2 client instance.
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Please set these in your .env.local file.",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Returns an authenticated `drive("v3")` client using personal OAuth2 credentials
 * and a persistent refresh token.
 */
export function getDrive(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive;

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "GOOGLE_REFRESH_TOKEN is not set. Please authenticate at /api/auth/google first to obtain it, then paste it in your .env.local file.",
    );
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  cachedDrive = google.drive({ version: "v3", auth: oauth2Client });
  return cachedDrive;
}
