import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2";

/**
 * Deletes an object from Cloudflare R2 bucket.
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    const s3 = r2Client.initialize();
    const bucketName = process.env.R2_BUCKET_NAME;

    console.log(`[R2] Deleting Object: ${key}`);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    console.log(`[R2] Object Deleted: ${key}`);
    return true;
  } catch (err) {
    console.error(`[R2] Failed to delete object: ${key}`, err);
    return false;
  }
}
