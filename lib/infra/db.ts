/**
 * Holds DATABASE_URL; a client-side import must fail the build, not ship the driver.
 *
 * Two ways to reach Postgres, and the choice is not stylistic.
 *
 *   `db` (HTTP) is the default for everything. Each query is one HTTPS request
 *   with no connection to open, keep alive, or lose — so nothing goes stale
 *   when a serverless instance is frozen mid-flight, there is no pool to
 *   exhaust, and a cold instance pays no handshake before its first query.
 *   This is the whole reason for leaving the Mongo driver behind, whose SDAM
 *   heartbeats and connection pool were exactly what `maxPoolSize: 10` in the
 *   old `mongodb.ts` was defending against.
 *
 *   `txDb()` (WebSocket) exists for the one thing HTTP cannot do: hold a
 *   session open across application logic. `sql.transaction([...])` batches
 *   statements atomically and covers almost every case; only a genuine
 *   read → decide in JS → write needs BEGIN/COMMIT.
 *
 * Reach for `txDb()` ONLY for that. Using it by habit re-creates the connection
 * lifecycle problem this migration exists to remove.
 */
import 'server-only';
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import * as schema from '@/lib/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

/**
 * The default handle. Stateless HTTP — safe to hold at module scope, because
 * there is no connection behind it to go stale between invocations.
 */
export const db = drizzle({ client: neon(DATABASE_URL), schema });

/**
 * An interactive-transaction handle, for read → decide → write only.
 *
 * The pool is created and closed inside the request that needs it; a
 * module-scoped pool would leak sockets across frozen instances and put back
 * the connection-limit problem. Always `await close()` in a `finally`.
 *
 *   const { db: tx, close } = txDb();
 *   try {
 *     await tx.transaction(async trx => { ... });
 *   } finally {
 *     await close();
 *   }
 */
export function txDb() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  return {
    db: drizzleWs({ client: pool, schema }),
    close: () => pool.end(),
  };
}
