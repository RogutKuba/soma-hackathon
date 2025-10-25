import { env } from '@/lib/env';
import { Mistral } from '@mistralai/mistralai';

export const mistral = new Mistral({
  apiKey: env.MISTRAL_API_KEY,
});
