import { createUploadHandler } from "../_handler";

export const POST = createUploadHandler({
  folderKey: "payment_qrs",
  validationKind: "image",
  fileNamePrefix: "payment-qr",
});

export const runtime = "nodejs";
