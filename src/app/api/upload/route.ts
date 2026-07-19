import { NextRequest, NextResponse } from "next/server";
import { fileStorageService } from "@/services/FileStorageService";
import { getServerAuth } from "@/lib/auth/server_auth";

export const runtime = "nodejs";

const REJECTED_EXTENSIONS = new Set([
  "exe", "bat", "sh", "cmd", "msi", "scr", "vbs", "com", "pif", "gadget",
  "js", "vbe", "jse", "ws", "wsf", "wsc", "wsh", "ps1", "ps2", "psc1", "psc2"
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;    // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Authentication Check
  const auth = await getServerAuth();
  if (!auth.authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin" && auth.role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse Multipart/Form-Data Request Body
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data request body." },
      { status: 400 }
    );
  }

  const file = form.get("file") as File | null;
  const folderType = form.get("folderType") as string | null;
  const entityId = form.get("entityId") as string | null;

  // 3. Validation
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }

  if (!folderType) {
    return NextResponse.json({ error: "Missing folderType field." }, { status: 400 });
  }

  const normalizedFolderType = folderType.toLowerCase();

  const allowedTypes = new Set([
    "student", "parent", "teacher", "announcement", "gallery",
    "assignment", "certificate", "report", "document", "study-material"
  ]);

  if (!allowedTypes.has(normalizedFolderType)) {
    return NextResponse.json(
      { error: `Invalid folderType: "${folderType}".` },
      { status: 400 }
    );
  }

  // File Name & Extension checks
  const originalName = file.name || "upload";
  const extension = originalName.split(".").pop()?.toLowerCase() || "";

  // Reject Executable Files
  if (REJECTED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Security restriction: Executable files are not allowed." },
      { status: 400 }
    );
  }

  // Validate MIME Type & Size
  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  if (mimeType.startsWith("application/x-msdownload") || mimeType.startsWith("application/x-sh")) {
    return NextResponse.json(
      { error: "Security restriction: Executable MIME types are not allowed." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    // Secondary extension check for standard file extensions
    const ext = originalName.split(".").pop()?.toLowerCase() || "";
    if (ext !== "jpg" && ext !== "jpeg" && ext !== "png" && ext !== "webp" && ext !== "pdf" && ext !== "docx") {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Allowed formats are JPEG, PNG, WEBP, PDF, and DOCX.` },
        { status: 400 }
      );
    }
  }

  const isImage = mimeType.startsWith("image/");
  const maxAllowedSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;

  if (file.size > maxAllowedSize) {
    const limitMb = maxAllowedSize / (1024 * 1024);
    return NextResponse.json(
      { error: `File too large. Maximum size allowed is ${limitMb}MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let result;

    // 4. Delegate to Storage Services
    if (normalizedFolderType === "announcement") {
      // Announcements uploaded to Supabase Storage and converted to WebP
      result = await fileStorageService.uploadAnnouncementImage(buffer, entityId || undefined);
    } else if (isImage) {
      // Other images uploaded to Cloudflare R2
      result = await fileStorageService.uploadImage(
        buffer,
        normalizedFolderType,
        entityId || undefined,
        extension,
        mimeType
      );
    } else {
      // Documents uploaded to Cloudflare R2
      result = await fileStorageService.uploadDocument(
        buffer,
        normalizedFolderType,
        entityId || undefined,
        extension,
        mimeType
      );
    }

    console.log(`[Storage] Upload Success. Provider: ${result.storageProvider}`);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[Storage] Upload failure:", err.message);

    let status = 500;
    if (err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("access denied")) {
      status = 403;
    } else if (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("bucket missing")) {
      status = 404;
    } else if (err.message.toLowerCase().includes("auth") || err.message.toLowerCase().includes("credential")) {
      status = 401;
    }

    return NextResponse.json({ error: err.message }, { status });
  }
}
