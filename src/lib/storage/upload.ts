import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2";

/**
 * Uploads a file buffer directly to Cloudflare R2 bucket.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  const s3 = r2Client.initialize();
  const bucketName = process.env.R2_BUCKET_NAME;

  console.log(`[R2] Uploading object to key: ${key}`);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  console.log(`[R2] Upload Success: ${key}`);
  return key;
}
