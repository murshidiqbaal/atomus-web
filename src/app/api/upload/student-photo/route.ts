import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "students",
  validationKind: "image",
  fileNamePrefix: "student",
});

export const runtime = "nodejs";
