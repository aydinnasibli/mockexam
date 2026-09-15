/**
 * A real Postgres, in-process, for the layer that had no tests.
 *
 * Everything the Mongo→Neon migration rewrote — `lib/db/`, `lib/actions/`,
 * `lib/payments/` — was verified only by typecheck. The one database test
 * (`lib/db/claim-sql.test.ts`) asserts the SQL text of a statement it builds
 * itself, so it cannot observe the production code drifting away from it.
 *
 * PGlite is a WASM build of Postgres, so `ON CONFLICT ... WHERE`, partial
 * indexes, CHECK constraints, foreign keys and `now()` all behave as they do on
 * Neon. Tests here run the REAL migration file and call the REAL exported
 * functions with `@/lib/infra/db` pointed at this instance — which is the only
 * way a test can catch a missing clause in a statement the application issues.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const client = new PGlite();
export const db = drizzle({ client, schema });

/** Tables in the order they can be truncated without tripping a foreign key. */
const TABLES = [
  'exam_answers',
  'exam_results',
  'exam_sessions',
  'played_audio',
  'purchases',
  'questions',
  'user_settings',
  'free_claims',
  'exams',
  'users',
] as const;

const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle/', import.meta.url));

let migrated = false;

/** Checked-in migration tags, in journal order. */
export function migrationTags(): string[] {
  const journal = JSON.parse(
    readFileSync(`${MIGRATIONS_DIR}meta/_journal.json`, 'utf8'),
  ) as { entries: { idx: number; tag: string }[] };
  return [...journal.entries].sort((a, b) => a.idx - b.idx).map(entry => entry.tag);
}

/** The SQL of one migration file. */
export function migrationSql(tag: string): string {
  return readFileSync(`${MIGRATIONS_DIR}${tag}.sql`, 'utf8');
}

/** Apply one migration file to `target`, statement by statement. */
export async function runMigration(target: PGlite, tag: string): Promise<void> {
  for (const statement of migrationSql(tag).split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) await target.exec(trimmed);
  }
}

/**
 * Apply every checked-in migration, in journal order.
 *
 * The real migration files are used rather than `drizzle-kit push` so a test
 * exercises the schema that is actually deployed, including the constraints and
 * partial indexes the application leans on for correctness — and so a migration
 * that does not apply cleanly fails the suite rather than production.
 */
export async function applyMigration(): Promise<void> {
  if (migrated) return;
  for (const tag of migrationTags()) await runMigration(client, tag);
  migrated = true;
}

/** Empty every table, so each test starts from a known state. */
export async function resetDb(): Promise<void> {
  await applyMigration();
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}

/**
 * `db.batch` for PGlite.
 *
 * Drizzle's PGlite driver has no `batch`; the Neon HTTP driver the app runs on
 * sends one as a single transaction. This runs the same statements, in order,
 * inside a PGlite transaction, so a test still sees all-or-nothing. Install it
 * in a test's `@/lib/infra/db` mock with `Object.assign(db, { batch })`.
 */
export async function batch(
  queries: readonly { toSQL(): { sql: string; params: unknown[] } }[],
): Promise<void> {
  await client.transaction(async tx => {
    for (const query of queries) {
      const { sql: text, params } = query.toSQL();
      await tx.query(text, params);
    }
  });
}

/**
 * A bare `users` row — exactly what `ensureUser` writes — for tests that insert
 * user-owned rows directly rather than through the code that would create it.
 */
export async function seedUser(id: string): Promise<void> {
  await db.insert(schema.users).values({ id });
}

/** A minimal exam row, since almost everything else foreign-keys to one. */
export async function seedExam(
  id: string,
  overrides: Partial<typeof schema.exams.$inferInsert> = {},
): Promise<void> {
  await db.insert(schema.exams).values({
    id,
    title: `Exam ${id}`,
    type: 'ielts',
    description: 'seeded',
    tag: 'IELTS',
    price: '15.00',
    modules: [
      {
        name: 'Listening', type: 'listening', durationMinutes: 30, questions: 2,
        breakAfterMinutes: 0, isAdaptive: false, instructions: '', layout: 'single',
      },
    ],
    ...overrides,
  });
}
