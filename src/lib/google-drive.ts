/**
 * lib/google-drive.ts
 *
 * Production-ready Google Drive helper for the Atomus Admin Panel.
 *
 * Auth priority:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON  (full JSON blob)
 *   2. GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY  (individual fields)
 *
 * Never writes to disk. Never falls back to local storage.
 * All uploads are in-memory (Buffer → Readable stream → Drive API).
 *
 * Environment variables used:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — full service-account JSON as a single string
 *   GOOGLE_CLIENT_EMAIL           — service-account client email
 *   GOOGLE_PRIVATE_KEY            — service-account private key (\\n auto-fixed to \n)
 *   GOOGLE_DRIVE_FOLDER_ID        — default parent folder ID (optional per-call override)
 */

import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface DriveUploadInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  folderId: string;
}

export interface DriveUploadResult {
  success: true;
  driveFileId: string;
  imageUrl: string;
  thumbnailUrl: string;
  webViewLink: string;
  fileName: string;
  message: string;
}

export interface DriveUploadError {
  success: false;
  error: string;
}

// --------------------------------------------------------------------------
// Auth — module-level singleton (cached across hot-reloads in dev)
// --------------------------------------------------------------------------

let _drive: drive_v3.Drive | null = null;

/**
 * Returns a memoised authenticated Drive v3 client.
 * Throws a clear Error if no credentials are configured.
 * Never exposes credentials to the console.
 */
export function getDriveClient(): drive_v3.Drive {
  if (_drive) return _drive;

  const SCOPES = ["https://www.googleapis.com/auth/drive"];

  // --- Strategy 1: GOOGLE_SERVICE_ACCOUNT_JSON ---
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(rawJson);
    } catch {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Please paste the full service-account JSON."
      );
    }
    // Normalise escaped newlines — common when pasted as a single-line env var
    if (credentials.private_key?.includes("\\n")) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    _drive = google.drive({ version: "v3", auth });
    return _drive;
  }

  // --- Strategy 2: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY ---
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    const normalizedKey = privateKey.includes("\\n")
      ? privateKey.replace(/\\n/g, "\n")
      : privateKey;
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: normalizedKey },
      scopes: SCOPES,
    });
    _drive = google.drive({ version: "v3", auth });
    return _drive;
  }

  throw new Error(
    "Google Drive credentials not configured. " +
      "Set GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY."
  );
}

// --------------------------------------------------------------------------
// makePublic
// --------------------------------------------------------------------------

/**
 * Grants public (anyone/reader) access to a Drive file.
 * Drive permissions are per-file, not inherited from the parent folder.
 */
export async function makePublic(fileId: string): Promise<void> {
  console.log(`[Drive] Making public — file ID: ${fileId}`);
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });
}

// --------------------------------------------------------------------------
// getPublicUrl
// --------------------------------------------------------------------------

/**
 * Returns a proxied URL that streams the Drive file through the Next.js
 * /api/media route to avoid Google cookie-blocking and CORS issues.
 */
export function getPublicUrl(fileId: string): string {
  return `/api/media?id=${fileId}`;
}

/**
 * Returns the Google Drive thumbnail URL for a given file ID.
 */
export function getThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

/**
 * Returns the Google Drive web view link for a given file ID.
 */
export function getWebViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// --------------------------------------------------------------------------
// uploadFile
// --------------------------------------------------------------------------

/**
 * Uploads a file buffer directly to Google Drive.
 *
 * Flow:
 *   Buffer → Readable stream → Drive API → make public → return URLs
 *
 * Never saves to disk. Never attempts a local fallback.
 * If Drive upload fails, throws — caller must return a proper error JSON response.
 */
export async function uploadFile(
  input: DriveUploadInput
): Promise<DriveUploadResult> {
  console.log(
    `[Drive] Uploading to Google Drive... (file: ${input.fileName}, folder: ${input.folderId})`
  );

  const drive = getDriveClient();

  const created = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [input.folderId],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields: "id, name",
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Google Drive returned no file ID after upload.");
  }

  console.log(`[Drive] Drive Upload Success — Drive File ID: ${fileId}`);

  await makePublic(fileId);

  const imageUrl = getPublicUrl(fileId);
  const thumbnailUrl = getThumbnailUrl(fileId);
  const webViewLink = getWebViewLink(fileId);

  console.log(`[Drive] Public URL: ${imageUrl}`);

  return {
    success: true,
    driveFileId: fileId,
    imageUrl,
    thumbnailUrl,
    webViewLink,
    fileName: created.data.name ?? input.fileName,
    message: "Announcement image uploaded successfully.",
  };
}

// --------------------------------------------------------------------------
// deleteFile
// --------------------------------------------------------------------------

/**
 * Best-effort delete of a Drive file by ID.
 * Returns true on success, false on failure.
 * Never throws — a missing old file must never block other operations.
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId, supportsAllDrives: true });
    console.log(`[Drive] Deleted file: ${fileId}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Drive] Failed to delete file ${fileId}: ${msg}`);
    return false;
  }
}

// --------------------------------------------------------------------------
// updateFile
// --------------------------------------------------------------------------

/**
 * Replaces a Drive file's content by:
 *   1. Uploading the new file to the same folder
 *   2. Deleting the old file (best-effort, fire-and-forget)
 *   3. Returning the new file's metadata
 *
 * If oldFileId is null/empty, only the upload step is performed.
 */
export async function updateFile(
  input: DriveUploadInput,
  oldFileId: string | null | undefined
): Promise<DriveUploadResult> {
  // Upload new file first so we always have a result even if delete fails
  const result = await uploadFile(input);

  if (oldFileId && oldFileId !== result.driveFileId) {
    void deleteFile(oldFileId); // fire-and-forget; non-critical
  }

  return result;
}
