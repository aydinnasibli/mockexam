/**
 * The one-free-paper-per-person rule, against a real Postgres.
 *
 * This rule gives away inventory, so the interesting cases are the ones where
 * it could be defeated rather than the happy path: two clicks racing, a second
 * attempt on a different paper, and a free claim landing on a paper the user
 * already paid for. All three are arbitrated by the database — `free_claims`
 * keys on `user_id`, and the grant carries `setWhere: status <> 'COMPLETED'` —
 * so they are verified here, where those constraints actually exist, and not
 * against a mock that would agree with whatever the code did.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

const USER = 'user_free';
const EXAM_A = 'ielts-free-a';
const EXAM_B = 'ielts-free-b';

vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  return { db, txDb: () => ({ db, close: async () => {} }) };
});

const { db, resetDb, seedExam, seedUser } = await import('@/test/pg');
const { freeClaims, purchases } = await import('@/lib/db/schema');
const { claimFreeExam, canClaimFree, claimedExamId } = await import('@/lib/db/free-claim');

/** The promotion reads its flag from the environment on every call. */
function promo(on: boolean) {
  if (on) process.env.FIRST_EXAM_FREE = 'true';
  else delete process.env.FIRST_EXAM_FREE;
}

async function purchaseRow(examId: string) {
  const [row] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, USER), eq(purchases.examId, examId)))
    .limit(1);
  return row;
}

beforeEach(async () => {
  await resetDb();
  await seedExam(EXAM_A);
  await seedExam(EXAM_B);
  promo(true);
});

describe('first exam free', () => {
  it('grants a COMPLETED purchase at zero cost', async () => {
    expect(await claimFreeExam(USER, EXAM_A)).toEqual({ ok: true });

    const row = await purchaseRow(EXAM_A);
    expect(row?.status).toBe('COMPLETED');
    expect(row?.amountCents).toBe(0);
    // Provenance has to be legible in the admin list; a zero-amount row with a
    // payment-shaped transaction id would be indistinguishable from a refund.
    expect(row?.transactionId).toContain('FIRST-FREE');
  });

  it('refuses a second paper once the claim is spent', async () => {
    await claimFreeExam(USER, EXAM_A);

    expect(await claimFreeExam(USER, EXAM_B)).toEqual({
      ok: false,
      reason: 'already_claimed',
    });
    expect(await purchaseRow(EXAM_B)).toBeUndefined();
  });

  it('survives concurrent claims on different papers — exactly one wins', async () => {
    // The case a "count the rows first" implementation loses: both callers read
    // zero prior claims before either writes.
    const [a, b] = await Promise.all([
      claimFreeExam(USER, EXAM_A),
      claimFreeExam(USER, EXAM_B),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);

    const claims = await db.select().from(freeClaims).where(eq(freeClaims.userId, USER));
    expect(claims).toHaveLength(1);

    // And the paper that lost must not have been granted.
    const loser = a.ok ? EXAM_B : EXAM_A;
    expect(await purchaseRow(loser)).toBeUndefined();
  });

  it('is resumable: retrying the SAME paper re-runs the grant', async () => {
    // Simulates a caller that won the claim but died before writing the
    // purchase. Without this, the claim is burned on a paper they cannot open.
    await seedUser(USER);
    await db.insert(freeClaims).values({ userId: USER, examId: EXAM_A });
    expect(await purchaseRow(EXAM_A)).toBeUndefined();

    expect(await claimFreeExam(USER, EXAM_A)).toEqual({ ok: true });
    expect((await purchaseRow(EXAM_A))?.status).toBe('COMPLETED');
  });

  it('never downgrades a paper the user already paid for', async () => {
    await seedUser(USER);
    await db.insert(purchases).values({
      userId: USER,
      examId: EXAM_A,
      transactionId: 'EPOINT-REAL-123',
      amountCents: 1500,
      status: 'COMPLETED',
    });

    expect(await claimFreeExam(USER, EXAM_A)).toEqual({
      ok: false,
      reason: 'already_owned',
    });

    const row = await purchaseRow(EXAM_A);
    expect(row?.amountCents).toBe(1500);
    expect(row?.transactionId).toBe('EPOINT-REAL-123');
    // The claim must not have been spent on a no-op.
    expect(await claimedExamId(USER)).toBeNull();
  });

  it('is off unless the flag is explicitly "true"', async () => {
    promo(false);
    expect(await claimFreeExam(USER, EXAM_A)).toEqual({ ok: false, reason: 'disabled' });
    expect(await canClaimFree(USER)).toBe(false);
    expect(await purchaseRow(EXAM_A)).toBeUndefined();
  });

  it('reports remaining eligibility', async () => {
    expect(await canClaimFree(USER)).toBe(true);
    await claimFreeExam(USER, EXAM_A);
    expect(await canClaimFree(USER)).toBe(false);
    expect(await claimedExamId(USER)).toBe(EXAM_A);
  });
});
