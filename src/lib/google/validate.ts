export type ValidationKind = "image" | "image-large" | "certificate";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const CERT_TYPES = new Set([
  ...IMAGE_TYPES,
  "application/pdf",
]);

const LIMITS: Record<ValidationKind, { types: Set<string>; maxBytes: number; label: string }> = {
  "image":        { types: IMAGE_TYPES, maxBytes: 5  * 1024 * 1024, label: "5 MB" },
  "image-large":  { types: IMAGE_TYPES, maxBytes: 10 * 1024 * 1024, label: "10 MB" },
  "certificate":  { types: CERT_TYPES,  maxBytes: 10 * 1024 * 1024, label: "10 MB" },
};

export type ValidationOk = { ok: true; mimeType: string; size: number; fileName: string };
export type ValidationErr = { ok: false; status: number; message: string };
export type ValidationResult = ValidationOk | ValidationErr;

export function validateUploadedFile(file: File | null, kind: ValidationKind): ValidationResult {
  if (!file) {
    return { ok: false, status: 400, message: "No file in request (expected field 'file')." };
  }
  const limit = LIMITS[kind];
  const mimeType = (file.type || "").toLowerCase();

  if (!limit.types.has(mimeType)) {
    return {
      ok: false,
      status: 415,
      message: `Unsupported file type: ${mimeType || "unknown"}. Allowed: ${Array.from(limit.types).join(", ")}.`,
    };
  }
  if (file.size > limit.maxBytes) {
    return {
      ok: false,
      status: 413,
      message: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${limit.label}.`,
    };
  }
  return { ok: true, mimeType, size: file.size, fileName: file.name || "upload" };
}
