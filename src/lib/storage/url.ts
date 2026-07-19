import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "./r2";

/**
 * Constructs the public access URL for a given R2 storage key.
 */
export function generatePublicUrl(key: string): string {
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  if (!publicUrlBase) {
    throw new Error("Missing R2_PUBLIC_URL environment variable.");
  }

  const base = publicUrlBase.endsWith("/") ? publicUrlBase.slice(0, -1) : publicUrlBase;
  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;

  const url = `${base}/${normalizedKey}`;
  console.log(`[R2] Public URL Generated: ${url}`);
  return url;
}

/**
 * Generates a presigned GET URL for secure temporary file downloads/views.
 */
export async function generateSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const s3 = r2Client.initialize();
  const bucketName = process.env.R2_BUCKET_NAME;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
