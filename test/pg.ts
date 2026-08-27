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
  'exams',
] as const;

let migrated = false;

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
  const dir = fileURLToPath(new URL('../drizzle/', import.meta.url));
  const journal = JSON.parse(
    readFileSync(`${dir}meta/_journal.json`, 'utf8'),
  ) as { entries: { idx: number; tag: string }[] };

  for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
    const ddl = readFileSync(`${dir}${entry.tag}.sql`, 'utf8');
    for (const statement of ddl.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
  migrated = true;
}

/** Empty every table, so each test starts from a known state. */
export async function resetDb(): Promise<void> {
  await applyMigration();
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
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
