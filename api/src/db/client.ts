// Database client with all schemas
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../lib/env';
import * as schema from './schema';

export const db = drizzle(env.DATABASE_URL, { schema });

// Export schema for convenience
export * from './schema';
