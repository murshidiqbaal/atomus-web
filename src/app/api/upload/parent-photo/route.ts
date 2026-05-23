import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "parents",
  validationKind: "image",
  fileNamePrefix: "parent",
});

export const runtime = "nodejs";
