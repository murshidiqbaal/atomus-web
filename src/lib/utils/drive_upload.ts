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
  fileId: string;
  imageUrl: string;
  fileName: string;
}

/**
 * POSTs a single file as `multipart/form-data` to one of the Drive upload
 * routes and returns `{ fileId, imageUrl, fileName }`. Throws an `Error`
 * with the server's message on non-2xx so callers can show a single toast.
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
  return data as DriveUploadResult;
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
