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
  /** Storage key (mapped for backward compatibility) */
  driveFileId?: string;
  /** Storage key (mapped for backward compatibility) */
  fileId: string;
  /** Public URL of the uploaded image */
  imageUrl: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  fileName: string;
  success?: boolean;
  message?: string;
}

/**
 * Centralized upload helper that redirects legacy frontend upload endpoint calls
 * to the new `/api/upload` partitioned storage API using `folderType`.
 */
export async function uploadToDrive(
  file: File | Blob,
  endpoint: DriveUploadEndpoint,
): Promise<DriveUploadResult> {
  const form = new FormData();
  const fileName = file instanceof File ? file.name : "upload";
  form.append("file", file, fileName);

  // Map legacy endpoint to backend folderType parameter
  let folderType = "document";
  if (endpoint === "/api/upload/student-photo") {
    folderType = "student";
  } else if (endpoint === "/api/upload/teacher-photo") {
    folderType = "teacher";
  } else if (endpoint === "/api/upload/parent-photo") {
    folderType = "parent";
  } else if (endpoint === "/api/upload/announcement") {
    folderType = "announcement";
  } else if (endpoint === "/api/upload/poster") {
    folderType = "gallery";
  } else if (endpoint === "/api/upload/certificate") {
    folderType = "certificate";
  } else if (endpoint === "/api/upload/payment-qr") {
    folderType = "document";
  }

  form.append("folderType", folderType);

  // Route to the centralized /api/upload endpoint (except for app-binary which remains separate)
  const targetUrl = endpoint === "/api/upload/app-binary" ? endpoint : "/api/upload";

  const res = await fetch(targetUrl, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Upload failed (${res.status}).`;
    throw new Error(msg);
  }

  const result = data as any;
  return {
    driveFileId: result.storageKey,
    fileId: result.storageKey,
    imageUrl: result.imageUrl || result.publicUrl,
    fileName: result.storageKey || fileName,
    success: result.success,
  };
}

/**
 * Best-effort delete of a storage file by its key/id.
 */
export async function cleanupDriveFile(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  try {
    await fetch(`/api/upload/cleanup?id=${encodeURIComponent(fileId)}`, { method: "DELETE" });
  } catch {
    // swallowed by design
  }
}
