/**
 * `beginExamSession` across all three states of the session row.
 *
 * The bug these were written against: the upsert assigned only `last_seen_at`
 * on conflict, so it neither filtered on expiry nor renewed `started_at` /
 * `expires_at`. Every other access goes through `liveSession`, which requires
 * `expires_at > now()` — so once a session lapsed, `peekExamSession` reported
 * none, the player showed the briefing, and pressing Start handed back the
 * EXPIRED row with an `elapsed` measured from days earlier. `remaining` was 0,
 * the player's auto-submit fired within ~50ms, and an EMPTY attempt was filed
 * against the candidate's record.
 *
 * Under Mongo the TTL monitor deleted the document, so the same upsert inserted
 * a fresh one. Moving expiry from a TTL index to a column brought back the case
 * the TTL used to erase.
 *
 * Three of these fail against the original statement; the other four are
 * regression guards proving a LIVE session is still resumed untouched — its
 * clock, its deadline and its mirrored draft all intact.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

const USER = 'user_expired';
const EXAM = 'ielts-lapsed';

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
vi.mock('@/lib/infra/analytics', () => ({
  trackEvent: async () => {},
  ANALYTICS_EVENTS: new Proxy({}, { get: (_t, k) => String(k) }),
}));
vi.mock('@/lib/infra/observability', () => ({
  captureException: async () => {},
  captureMessage: async () => {},
}));

const { db, resetDb, seedExam } = await import('@/test/pg');
const { examSessions, questions, purchases } = await import('@/lib/db/schema');
const { beginExamSession, peekExamSession } = await import('@/lib/actions/session');

const DAY = 24 * 60 * 60 * 1000;

/** An attempt started 8 days ago whose 7-day window closed yesterday. */
async function seedLapsedSession() {
  const startedAt = new Date(Date.now() - 8 * DAY);
  await db.insert(examSessions).values({
    userId: USER,
    examId: EXAM,
    startedAt,
    totalSeconds: 1800,
    moduleSchedule: [{ moduleIndex: 0, startsAt: 0, endsAt: 1800, breakEndsAt: 1800 }],
    lastSeenAt: startedAt,
    expiresAt: new Date(Date.now() - 1 * DAY),
  });
  return startedAt;
}

beforeEach(async () => {
  await resetDb();
  await seedExam(EXAM);
  await db.insert(purchases).values({
    userId: USER, examId: EXAM, transactionId: 'txn-1',
    amountCents: 1500, status: 'COMPLETED',
  });
  await db.insert(questions).values([
    { examId: EXAM, moduleIndex: 0, order: 0, stem: 'Q1', options: ['a', 'b'], correctIndex: 0 },
    { examId: EXAM, moduleIndex: 0, order: 1, stem: 'Q2', options: ['a', 'b'], correctIndex: 1 },
  ]);
});

describe('lapsed exam session', () => {
  it('is invisible to peekExamSession, so the player shows the briefing', async () => {
    await seedLapsedSession();
    const peek = await peekExamSession(EXAM);
    expect(peek).toEqual({ exists: false });
  });

  it('pressing Start restarts it, rather than returning a spent clock', async () => {
    const startedAt = await seedLapsedSession();
    const result = await beginExamSession(EXAM);

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    // A fresh attempt, not the eight-day-old one.
    expect(new Date(result.startedAt).getTime()).toBeGreaterThan(startedAt.getTime());
    expect(result.elapsed).toBeLessThan(5);

    // …so there is a real clock to sit. Previously `remaining` was 0 and the
    // player's auto-submit filed an EMPTY attempt within ~50ms of Start.
    expect(result.totalSeconds - result.elapsed).toBeGreaterThan(0);
    expect(result.stale).toBe(false);
  });

  it('renews expires_at, so every liveSession-gated call works again', async () => {
    await seedLapsedSession();
    await beginExamSession(EXAM);

    const [row] = await db
      .select()
      .from(examSessions)
      .where(and(eq(examSessions.userId, USER), eq(examSessions.examId, EXAM)));

    // getSessionClock, saveSessionProgress, getModuleQuestionContent and
    // saveExamResult all filter on this.
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not resurrect the lapsed attempt\'s draft', async () => {
    await seedLapsedSession();
    await db.update(examSessions)
      .set({ progress: { answers: [{ questionId: 'q', userAnswer: 1 }], flagged: [], currentIdx: 0, updatedAt: new Date().toISOString() } })
      .where(and(eq(examSessions.userId, USER), eq(examSessions.examId, EXAM)));

    const result = await beginExamSession(EXAM);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    // The candidate was already told the attempt was gone (peek reported none,
    // and the player cleared localStorage), so a restart starts clean.
    expect(result.progress).toBeNull();
  });

  it('still creates a session when none exists at all', async () => {
    const result = await beginExamSession(EXAM);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.elapsed).toBeLessThan(5);
    // 1 module x 30 min, both questions present, no trailing break.
    expect(result.totalSeconds).toBe(1800);
  });

  it('a session still inside its window is resumed unchanged (regression guard)', async () => {
    const startedAt = new Date(Date.now() - 60_000);
    await db.insert(examSessions).values({
      userId: USER, examId: EXAM, startedAt, totalSeconds: 1800,
      moduleSchedule: [{ moduleIndex: 0, startsAt: 0, endsAt: 1800, breakEndsAt: 1800 }],
      lastSeenAt: startedAt,
      expiresAt: new Date(Date.now() + 6 * DAY),
    });

    const result = await beginExamSession(EXAM);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    // A reload must NOT restart the clock.
    expect(new Date(result.startedAt).getTime()).toBe(startedAt.getTime());
    expect(result.elapsed).toBeGreaterThanOrEqual(59);
    expect(result.elapsed).toBeLessThan(120);

    // …and must not move the deadline or drop the draft either.
    const [row] = await db.select().from(examSessions)
      .where(and(eq(examSessions.userId, USER), eq(examSessions.examId, EXAM)));
    expect(row.startedAt.getTime()).toBe(startedAt.getTime());
    expect(row.totalSeconds).toBe(1800);
    expect(row.expiresAt.getTime()).toBeLessThan(Date.now() + 6.1 * DAY);
  });

  it('a live session keeps its mirrored draft across a reload (regression guard)', async () => {
    const startedAt = new Date(Date.now() - 60_000);
    const draft = { answers: [{ questionId: 'q1', userAnswer: 2 }], flagged: ['q1'], currentIdx: 3, updatedAt: new Date().toISOString() };
    await db.insert(examSessions).values({
      userId: USER, examId: EXAM, startedAt, totalSeconds: 1800,
      moduleSchedule: [{ moduleIndex: 0, startsAt: 0, endsAt: 1800, breakEndsAt: 1800 }],
      lastSeenAt: startedAt, progress: draft,
      expiresAt: new Date(Date.now() + 6 * DAY),
    });

    const result = await beginExamSession(EXAM);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.progress?.currentIdx).toBe(3);
    expect(result.progress?.flagged).toEqual(['q1']);
  });
});
