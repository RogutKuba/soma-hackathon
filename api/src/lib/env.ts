import z from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  MISTRAL_API_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  // ANTHROPIC_API_KEY: z.string().min(1),

  R2_ENDPOINT: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_DOMAIN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
