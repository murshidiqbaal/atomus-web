import { S3Client } from "@aws-sdk/client-s3";

class CloudflareR2Client {
  private client: S3Client | null = null;

  initialize(): S3Client {
    if (this.client) return this.client;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!accountId) throw new Error("Missing R2_ACCOUNT_ID environment variable.");
    if (!accessKeyId) throw new Error("Missing R2_ACCESS_KEY_ID environment variable.");
    if (!secretAccessKey) throw new Error("Missing R2_SECRET_ACCESS_KEY environment variable.");
    if (!bucketName) throw new Error("Missing R2_BUCKET_NAME environment variable.");
    if (!publicUrl) throw new Error("Missing R2_PUBLIC_URL environment variable.");

    this.client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: "auto",
    });

    console.log("[R2] Cloudflare R2 Client Initialized");
    return this.client;
  }
}

export const r2Client = new CloudflareR2Client();
