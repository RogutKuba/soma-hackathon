import { env } from '@/lib/env';
import { S3Client } from '@aws-sdk/client-s3';

// Initialize R2 client (S3-compatible)
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
