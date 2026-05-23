import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "teachers",
  validationKind: "image",
  fileNamePrefix: "teacher",
});

export const runtime = "nodejs";
