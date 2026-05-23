import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "posters",
  validationKind: "image-large",
  fileNamePrefix: "poster",
});

export const runtime = "nodejs";
