/**
 * The single-play listening rule, exercised through the REAL server action.
 *
 * `lib/db/claim-sql.test.ts` asserts the SQL text of a statement it builds
 * inline, and says of itself: "If a Drizzle upgrade quietly stopped emitting
 * `WHERE` on a DO UPDATE, every call would still succeed, every type would
 * still check, and the single-play rule would silently become 'always renew'."
 *
 * It cannot actually catch that, because it never imports `markAudioPlayed` —
 * delete `setWhere` from the production action and that suite stays green.
 * These call the action itself against a real Postgres, so the rule is verified
 * where it is enforced rather than where it is restated.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

const USER = 'user_audio';
const EXAM = 'ielts-audio';
const TRACK = 'https://x.public.blob.vercel-storage.com/part1.mp3';

vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  return { db, txDb: () => ({ db, close: async () => {} }) };
});
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: USER, sessionClaims: {} }),
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

const { db, resetDb, seedExam } = await import('@/test/pg');
const { examSessions, playedAudio, purchases } = await import('@/lib/db/schema');
const { markAudioPlayed, checkAudioPlayed } = await import('@/lib/actions/audio');

const DAY = 24 * 60 * 60 * 1000;

async function startSession() {
  await db.insert(examSessions).values({
    userId: USER, examId: EXAM,
    startedAt: new Date(), totalSeconds: 1800,
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * DAY),
  });
}

beforeEach(async () => {
  await resetDb();
  await seedExam(EXAM);
  await db.insert(purchases).values({
    userId: USER, examId: EXAM, transactionId: 'txn',
    amountCents: 1500, status: 'COMPLETED',
  });
});

describe('single-play listening claim', () => {
  it('allows the first play and records the claim', async () => {
    await startSession();
    const first = await markAudioPlayed(EXAM, TRACK);
    expect(first).toEqual({ alreadyPlayed: false });

    const rows = await db.select().from(playedAudio).where(eq(playedAudio.userId, USER));
    expect(rows).toHaveLength(1);
  });

  it('REFUSES a second play — this is the rule', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);
    expect(await markAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: true });
    expect(await markAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: true });
  });

  it('does not mint a second claim row on a refused play', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);
    await markAudioPlayed(EXAM, TRACK);
    const rows = await db.select().from(playedAudio).where(eq(playedAudio.userId, USER));
    expect(rows).toHaveLength(1);
  });

  it('treats a different track as its own claim', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);
    expect(await markAudioPlayed(EXAM, TRACK + '?part=2')).toEqual({ alreadyPlayed: false });
  });

  it('renews only once the claim has actually lapsed', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);

    // Still live → refused.
    expect(await markAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: true });

    // Backdate the claim past its 24-hour window.
    await db.update(playedAudio)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(and(eq(playedAudio.userId, USER), eq(playedAudio.audioUrl, TRACK)));

    expect(await markAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: false });
  });

  it('checkAudioPlayed reports a live claim and ignores a lapsed one', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);
    expect(await checkAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: true });

    await db.update(playedAudio)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(playedAudio.userId, USER));
    expect(await checkAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: false });
  });

  it('survives a restart — deleting the session does not refund the listen', async () => {
    await startSession();
    await markAudioPlayed(EXAM, TRACK);

    // `restartExamSession` deletes the session; the claim deliberately outlives
    // it, which is what stops "play, reload, start over" beating the rule.
    await db.delete(examSessions).where(eq(examSessions.userId, USER));
    await startSession();

    expect(await markAudioPlayed(EXAM, TRACK)).toEqual({ alreadyPlayed: true });
  });

  it('refuses to claim without a live session at all', async () => {
    const result = await markAudioPlayed(EXAM, TRACK);
    expect('error' in result).toBe(true);
    expect(await db.select().from(playedAudio)).toHaveLength(0);
  });

  it('refuses to claim for an exam the user has not bought', async () => {
    await startSession();
    await db.delete(purchases).where(eq(purchases.userId, USER));
    const result = await markAudioPlayed(EXAM, TRACK);
    expect('error' in result).toBe(true);
  });
});
