/**
 * `users` as the parent every user-owned table references.
 *
 * Two things break once `user_id` is a foreign key, and both would break in
 * production rather than in review:
 *   - the migration itself, on a database already holding user ids that have
 *     no `users` row to point at;
 *   - any write path inserting a user-owned row for an account the Clerk
 *     webhook has not reached yet.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';

const EXAM = 'ielts-fk';
const session = { userId: 'user_first_write' };

vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  return { db, txDb: () => ({ db, close: async () => {} }) };
});
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId, sessionClaims: { metadata: { role: 'admin' } } }),
}));
vi.mock('@/lib/infra/rate-limit', () => ({
  isRateLimited: async () => false,
  limited: async () => false,
  clientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/infra/observability', () => ({
  captureException: async () => {},
  captureMessage: async () => {},
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); },
}));

const { db, resetDb, seedExam, migrationTags, migrationSql, runMigration } = await import('@/test/pg');
const { users, purchases } = await import('@/lib/db/schema');
const { ensureUser } = await import('@/lib/db/users');
const { saveUserSettings } = await import('@/lib/actions/settings');
const { grantExamAccess } = await import('@/lib/actions/admin-users');

/** The SQLSTATE of a failed query, however the driver wrapped the error. */
function sqlState(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code ?? e?.cause?.code;
}

describe('the migration that introduces users', () => {
  it('adopts every user id already in the data before adding the foreign keys', async () => {
    const tags = migrationTags();
    const usersIdx = tags.findIndex(tag => migrationSql(tag).includes('CREATE TABLE "users"'));
    expect(usersIdx).toBeGreaterThan(0);

    // A database as production has it the moment before this migration runs.
    const legacy = new PGlite();
    try {
      for (const tag of tags.slice(0, usersIdx)) await runMigration(legacy, tag);
      await legacy.exec(`
        INSERT INTO exams (id, title, type, description, tag, price)
          VALUES ('ielts-legacy', 'IELTS', 'ielts', 'x', 'IELTS', 15);
        INSERT INTO purchases (user_id, exam_id, transaction_id, amount_cents, status)
          VALUES ('user_buyer', 'ielts-legacy', 'TXN-1', 1500, 'COMPLETED');
        INSERT INTO exam_results (user_id, exam_id, exam_title, exam_tag, attempt_number,
                                  started_at, completed_at, duration_seconds, total_questions, score)
          VALUES ('user_candidate', 'ielts-legacy', 'IELTS', 'IELTS', 1, now(), now(), 60, 1, 50);
        INSERT INTO user_settings (user_id) VALUES ('user_settings_only');
        INSERT INTO free_claims (user_id, exam_id) VALUES ('user_buyer', 'ielts-legacy');
      `);

      for (const tag of tags.slice(usersIdx)) await runMigration(legacy, tag);

      const { rows } = await legacy.query<{ id: string }>('SELECT id FROM users ORDER BY id');
      expect(rows.map(r => r.id)).toEqual(['user_buyer', 'user_candidate', 'user_settings_only']);

      // And from here on the constraint holds.
      const err = await legacy
        .exec(`INSERT INTO purchases (user_id, exam_id, transaction_id, amount_cents)
               VALUES ('user_ghost', 'ielts-legacy', 'TXN-2', 1500)`)
        .catch((e: unknown) => e);
      expect(sqlState(err)).toBe('23503');
    } finally {
      await legacy.close();
    }
  });
});

describe('user-owned rows', () => {
  beforeEach(async () => {
    await resetDb();
    await seedExam(EXAM);
  });

  it('cannot reference a user with no users row', async () => {
    const err = await db
      .insert(purchases)
      .values({ userId: 'user_ghost', examId: EXAM, transactionId: 'TXN', amountCents: 0 })
      .catch((e: unknown) => e);
    expect(sqlState(err)).toBe('23503');
  });

  it('saveUserSettings works for an account the webhook has not reached yet', async () => {
    session.userId = 'user_first_write';
    expect(await saveUserSettings({ targetExamDate: null, targetExamType: 'ielts' })).toEqual({ ok: true });

    const [row] = await db.select().from(users).where(eq(users.id, 'user_first_write'));
    expect(row).toMatchObject({ email: null, deletedAt: null });
  });

  it('an admin grant works for an account with no users row yet', async () => {
    session.userId = 'user_admin';
    expect(await grantExamAccess('user_granted', EXAM)).toEqual({ success: true });

    const [row] = await db.select().from(users).where(eq(users.id, 'user_granted'));
    expect(row).toBeDefined();
  });

  it('ensureUser never revives a deleted account', async () => {
    const deletedAt = new Date(Date.UTC(2026, 0, 1));
    await db.insert(users).values({ id: 'user_gone', deletedAt });

    await ensureUser('user_gone');

    const [row] = await db.select().from(users).where(eq(users.id, 'user_gone'));
    expect(row.deletedAt?.getTime()).toBe(deletedAt.getTime());
  });
});
