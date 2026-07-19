export type DriveUploadEndpoint =
  | "/api/upload/student-photo"
  | "/api/upload/teacher-photo"
  | "/api/upload/parent-photo"
  | "/api/upload/poster"
  | "/api/upload/certificate"
  | "/api/upload/announcement"
  | "/api/upload/payment-qr"
  | "/api/upload/app-binary";

export interface DriveUploadResult {
  /** Drive file ID (canonical field name) */
  driveFileId?: string;
  /** Drive file ID (legacy alias — same value as driveFileId) */
  fileId: string;
  /** Proxied image URL via /api/media?id=<fileId> */
  imageUrl: string;
  /** Google Drive thumbnail URL */
  thumbnailUrl?: string;
  /** Google Drive web view link */
  webViewLink?: string;
  /** Sanitised filename as stored in Drive */
  fileName: string;
  /** Whether the upload succeeded (present on new responses) */
  success?: boolean;
  /** Human-readable success message */
  message?: string;
}

/**
 * POSTs a single file as `multipart/form-data` to one of the Drive upload
 * routes and returns the Drive file metadata. Throws an `Error` with the
 * server's message on non-2xx so callers can show a single toast.
 */
export async function uploadToDrive(
  file: File | Blob,
  endpoint: DriveUploadEndpoint,
): Promise<DriveUploadResult> {
  const form = new FormData();
  // Blobs need a filename for FormData to be parsed correctly server-side.
  const fileName = file instanceof File ? file.name : "upload";
  form.append("file", file, fileName);

  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Upload failed (${res.status}).`;
    throw new Error(msg);
  }

  // Normalise: ensure legacy `fileId` field is always populated
  const result = data as DriveUploadResult;
  if (!result.fileId && result.driveFileId) {
    result.fileId = result.driveFileId;
  }

  return result;
}

/**
 * Best-effort delete of a Drive file by its id. Never throws — orphan
 * cleanup is non-critical and we don't want it to block the calling flow.
 */
export async function cleanupDriveFile(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  try {
    await fetch(`/api/upload/cleanup?id=${encodeURIComponent(fileId)}`, { method: "DELETE" });
  } catch {
    // swallowed by design
  }
}
