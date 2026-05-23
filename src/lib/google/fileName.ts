/**
 * Builds a Drive-safe filename. Format: `<prefix>_<slug>_<timestamp>.<ext>`.
 * Unsafe chars in the source name collapse to `_`. The timestamp guarantees
 * uniqueness even when two admins upload the same source file in the same
 * second.
 */
export function buildFileName(prefix: string, originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot >= 0 ? originalName.slice(dot + 1).toLowerCase() : "bin";
  const stem = (dot >= 0 ? originalName.slice(0, dot) : originalName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "file";

  return `${prefix}_${stem}_${Date.now()}.${ext}`;
}
