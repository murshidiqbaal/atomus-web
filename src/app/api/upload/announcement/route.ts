import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "announcements",
  validationKind: "image-large",
  fileNamePrefix: "announcement",
});

export const runtime = "nodejs";
