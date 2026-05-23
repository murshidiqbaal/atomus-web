import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "certificates",
  validationKind: "certificate",
  fileNamePrefix: "certificate",
});

export const runtime = "nodejs";
