import { defineConfig } from 'drizzle-kit';

/**
 * DIRECT_URL, not DATABASE_URL.
 *
 * The app connects through Neon's pooled endpoint (the `-pooler` host), which
 * runs PgBouncer in transaction mode. That mode is what makes it safe for
 * serverless, but it strips the session-level features migrations depend on —
 * advisory locks and DDL held open inside a transaction. Schema work therefore
 * goes over the direct endpoint; application traffic never does.
 */
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
