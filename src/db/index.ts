import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn(
    '[db] DATABASE_URL is not set. Database operations will fail at runtime. ' +
    'Set it in .env.local or Vercel environment settings.'
  );
}

// Only initialize if URL is present; export a lazy getter so the module
// can be imported safely in environments without a DB (e.g., local dev, build).
export const db = url
  ? drizzle(neon(url), { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);
