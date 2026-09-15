/**
 * Copy every Clerk account into `users`.
 *
 *   node --env-file=.env.local scripts/sync-clerk-users.mjs              # dry run
 *   node --env-file=.env.local scripts/sync-clerk-users.mjs --confirm    # write
 *
 * WHEN TO RUN IT
 *   Once, straight after applying the migration that created `users`. That
 *   migration can only adopt ids already present in the data, so emails, names,
 *   and accounts that never bought or saved anything all come from here. From
 *   then on the webhook keeps the table current; a missed delivery is best fixed
 *   by replaying it from the Clerk Dashboard, but re-running this is always safe.
 *
 * WHAT IT DOES
 *   Reads every account from Clerk's Backend API, then upserts them with the
 *   same guards as the webhook (`upsertUserFromClerk` in lib/db/users.ts): a
 *   deleted account's tombstone is never touched, and a profile Clerk reports
 *   as older than the stored one is left alone. Idempotent.
 *
 * WHAT IT NEVER DOES
 *   Delete. Stored ids Clerk does not know are REPORTED, not removed. They are
 *   usually accounts deleted before the webhook existed — but they are also
 *   exactly what running this with the wrong instance's key looks like, and a
 *   script that deleted on that evidence would erase every candidate's results.
 *   For the same reason it refuses to write when most stored ids are unknown to
 *   Clerk; `--force` overrides that once you have checked.
 *
 * Reads CLERK_SECRET_KEY, and DIRECT_URL (falling back to DATABASE_URL).
 */
import { neon } from '@neondatabase/serverless';

const CONFIRM = process.argv.includes('--confirm');
const FORCE = process.argv.includes('--force');

const CLERK_API = 'https://api.clerk.com/v1';
const PAGE_SIZE = 500; // The Backend API's maximum.
const MAX_ATTEMPTS = 5;

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is not defined');
const DATABASE_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DIRECT_URL / DATABASE_URL is not defined');

const sql = neon(DATABASE_URL);

/** GET from the Clerk Backend API, waiting out rate limits. */
async function clerk(path) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${CLERK_API}${path}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const seconds = Number(res.headers.get('retry-after')) || 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Clerk GET ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }
}

/** Mirrors `userRowFromClerk` in lib/db/users.ts — change the two together. */
function rowFromClerk(u) {
  const primary = (u.email_addresses ?? []).find(e => e.id === u.primary_email_address_id);
  return {
    id: u.id,
    email: primary?.email_address ?? null,
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    image_url: u.image_url || null,
    clerk_created_at: new Date(u.created_at).toISOString(),
    clerk_updated_at: new Date(u.updated_at).toISOString(),
  };
}

/**
 * Every Clerk account, keyed by id.
 *
 * Oldest first, so an account created during the run lands on a later page
 * instead of shifting the pages before it. A deletion during the run can still
 * shift one account across a page boundary: keying by id absorbs a duplicate,
 * and the count check in `main` reports a possible gap.
 */
async function fetchClerkUsers() {
  const byId = new Map();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await clerk(`/users?limit=${PAGE_SIZE}&offset=${offset}&order_by=%2Bcreated_at`);
    for (const u of page) byId.set(u.id, rowFromClerk(u));
    if (page.length < PAGE_SIZE) return byId;
  }
}

const time = value => (value == null ? null : new Date(value).getTime());

async function main() {
  const [{ present }] = await sql`SELECT to_regclass('public.users') IS NOT NULL AS present`;
  if (!present) throw new Error('No users table. Apply the migrations first: npm run db:migrate');

  const clerkUsers = await fetchClerkUsers();
  const { total_count: clerkTotal } = await clerk('/users/count');
  const stored = await sql`SELECT id, clerk_updated_at, deleted_at FROM users`;
  const storedById = new Map(stored.map(row => [row.id, row]));

  const toInsert = [];
  const toUpdate = [];
  let current = 0;
  let tombstoned = 0;
  for (const row of clerkUsers.values()) {
    const existing = storedById.get(row.id);
    if (!existing) toInsert.push(row);
    else if (existing.deleted_at) tombstoned++;
    else if (existing.clerk_updated_at == null || time(existing.clerk_updated_at) < time(row.clerk_updated_at)) toUpdate.push(row);
    else current++;
  }
  const unknown = stored.filter(row => !row.deleted_at && !clerkUsers.has(row.id)).map(row => row.id);

  console.log(`Clerk accounts read:          ${clerkUsers.size} (Clerk reports ${clerkTotal})`);
  console.log(`  new rows:                   ${toInsert.length}`);
  console.log(`  profiles to update:         ${toUpdate.length}`);
  console.log(`  already current:            ${current}`);
  console.log(`  deleted here, left alone:   ${tombstoned}`);
  console.log(`Stored ids unknown to Clerk:  ${unknown.length}`);
  for (const id of unknown.slice(0, 20)) console.log(`  ${id}`);
  if (unknown.length > 20) console.log(`  … and ${unknown.length - 20} more`);

  if (clerkUsers.size !== clerkTotal) {
    console.warn('\nAccounts changed while this ran. Re-run to pick up any that moved between pages.');
  }

  const mostlyUnknown = stored.length > 0 && unknown.length > stored.length / 2;
  if (mostlyUnknown) {
    console.warn(
      '\nMost stored users are unknown to this Clerk instance. Check that CLERK_SECRET_KEY ' +
      'belongs to the same environment as the database (sk_live_ for production).',
    );
  }

  if (!CONFIRM) {
    console.log('\nDry run: nothing written. Re-run with --confirm to apply.');
    return;
  }
  if (mostlyUnknown && !FORCE) {
    throw new Error('Refusing to write. Pass --force once you have confirmed the Clerk instance.');
  }

  const rows = [...toInsert, ...toUpdate];
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    const chunk = JSON.stringify(rows.slice(i, i + PAGE_SIZE));
    // The webhook's guards, restated in SQL: never a tombstone, never an older profile.
    await sql`
      INSERT INTO users (id, email, first_name, last_name, image_url, clerk_created_at, clerk_updated_at)
      SELECT id, email, first_name, last_name, image_url, clerk_created_at, clerk_updated_at
        FROM json_populate_recordset(NULL::users, ${chunk}::json)
      ON CONFLICT (id) DO UPDATE SET
        email            = excluded.email,
        first_name       = excluded.first_name,
        last_name        = excluded.last_name,
        image_url        = excluded.image_url,
        clerk_created_at = excluded.clerk_created_at,
        clerk_updated_at = excluded.clerk_updated_at,
        updated_at       = now()
      WHERE users.deleted_at IS NULL
        AND (users.clerk_updated_at IS NULL OR users.clerk_updated_at <= excluded.clerk_updated_at)`;
  }
  console.log(`\nWrote ${rows.length} rows.`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
