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

  // 1. Try Google Service Account JSON first
  const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    try {
      const credentials = JSON.parse(rawServiceAccount);
      if (credentials.private_key?.includes("\\n")) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      }
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      cachedDrive = google.drive({ version: "v3", auth });
      return cachedDrive;
    } catch (e: any) {
      console.warn("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON, falling back to OAuth:", e.message);
    }
  }

  // 2. Fall back to OAuth2 Refresh Token
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Neither GOOGLE_SERVICE_ACCOUNT_JSON nor GOOGLE_REFRESH_TOKEN is set. Please configure one of these variables in your .env.local file."
    );
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  cachedDrive = google.drive({ version: "v3", auth: oauth2Client });
  return cachedDrive;
}
