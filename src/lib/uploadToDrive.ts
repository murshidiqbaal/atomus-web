import { Readable } from "node:stream";
import { getDrive } from "./google";

export interface UploadInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  folderId: string;
}

export interface UploadResult {
  fileId: string;
  imageUrl: string;
  fileName: string;
}

/**
 * Uploads a single file to the given Drive folder, marks it world-readable,
 * and returns a `uc?id=…` URL suitable for `<img src>` / `<Image>`.
 */
export async function uploadFileToDrive(input: UploadInput): Promise<UploadResult> {
  const drive = getDrive();

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
    throw new Error("Drive returned no fileId after upload.");
  }

  // Create reader/anyone permission so anyone can view the image/PDF
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  return {
    fileId,
    imageUrl: `/api/media?id=${fileId}`,
    fileName: created.data.name ?? input.fileName,
  };
}

/**
 * Best-effort delete. Returns true on success, false on failure (we don't
 * want a missing-old-photo to block a profile-update flow).
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  try {
    const drive = getDrive();
    await drive.files.delete({ fileId, supportsAllDrives: true });
    return true;
  } catch {
    return false;
  }
}
