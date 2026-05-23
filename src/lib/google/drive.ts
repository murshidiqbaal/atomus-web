import { google, type drive_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

let cachedDrive: drive_v3.Drive | null = null;

/**
 * Returns a memoized authenticated `drive("v3")` client. The service-account
 * JSON is read from `GOOGLE_SERVICE_ACCOUNT_JSON` (the entire JSON, parsed
 * once). Each of the six target folders must be shared with the JSON's
 * `client_email` at Editor level for uploads to succeed.
 */
export function getDrive(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set. Paste the full service-account JSON into the env var.",
    );
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  // Normalise escaped newlines in private_key — common when the JSON is
  // pasted into a single-line env var.
  if (credentials.private_key?.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}
