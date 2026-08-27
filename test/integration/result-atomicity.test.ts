/**
 * `saveExamResult` — the result and its answers must land together or not at all.
 *
 * The bug these were written against: `createResultWithNextAttempt` inserted the
 * `exam_results` row and then inserted `exam_answers` in a SECOND statement,
 * with no transaction around the pair. A failure on the second left the attempt
 * in the database with zero answers — burning an attempt number, listing on the
 * dashboard as a filed result, and opening an empty review — while the caller
 * reported "Server xətası baş verdi", so the candidate retried and filed a
 * SECOND attempt.
 *
 * The failure is injected at the driver, not faked: the production statements
 * run against a real Postgres and only the answers INSERT is made to fail.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const USER = 'user_atomicity';
const EXAM = 'ielts-atomicity';

/** Flipped on to make the next `insert(exam_answers)` fail. */
const failAnswers = { on: false };

/*
 * The fault is injected on the TRANSACTION handle, not on the plain one.
 *
 * `createResultWithNextAttempt` does both inserts through `trx`, so patching
 * `db.insert` would never be reached — the transaction is what these tests are
 * about. Everything else passes straight through to the real PGlite instance,
 * so the rollback below is Postgres's, not a simulation of one.
 */
vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  const { getTableName } = await import('drizzle-orm');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bind = (target: any, prop: string | symbol) => {
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patchTx = (trx: any) => new Proxy(trx, {
    get(target, prop) {
      if (prop !== 'insert') return bind(target, prop);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (table: any) => {
        if (failAnswers.on && getTableName(table) === 'exam_answers') {
          throw new Error('simulated driver failure on exam_answers');
        }
        return target.insert(table);
      };
    },
  });

  const txHandle = new Proxy(db, {
    get(target, prop) {
      if (prop !== 'transaction') return bind(target, prop);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (fn: (trx: any) => Promise<unknown>) => target.transaction(trx => fn(patchTx(trx)));
    },
  });

  return { db, txDb: () => ({ db: txHandle, close: async () => {} }) };
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
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db, resetDb, seedExam } = await import('@/test/pg');
const { examResults, examAnswers, questions, purchases } = await import('@/lib/db/schema');
const { saveExamResult } = await import('@/lib/actions/results');

const submission = () => ({
  examId: EXAM,
  startedAt: new Date(Date.now() - 600_000).toISOString(),
  durationSeconds: 600,
  answers: [
    { questionId: qIds[0], userAnswer: 0, userAnswerText: '', timeSeconds: 30 },
    { questionId: qIds[1], userAnswer: 1, userAnswerText: '', timeSeconds: 45 },
  ],
});

let qIds: string[] = [];

beforeEach(async () => {
  failAnswers.on = false;
  await resetDb();
  await seedExam(EXAM);
  await db.insert(purchases).values({
    userId: USER, examId: EXAM, transactionId: 'txn', amountCents: 1500, status: 'COMPLETED',
  });
  const rows = await db.insert(questions).values([
    { examId: EXAM, moduleIndex: 0, order: 0, stem: 'Q1', options: ['a', 'b'], correctIndex: 0 },
    { examId: EXAM, moduleIndex: 0, order: 1, stem: 'Q2', options: ['a', 'b'], correctIndex: 1 },
  ]).returning({ id: questions.id });
  qIds = rows.map(r => r.id);
});

describe('saveExamResult atomicity', () => {
  it('files a result with its answers on the happy path', async () => {
    const result = await saveExamResult(submission());
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.attemptNumber).toBe(1);
    const answers = await db.select().from(examAnswers).where(eq(examAnswers.resultId, result.resultId));
    expect(answers).toHaveLength(2);
    expect(answers.every(a => a.isCorrect)).toBe(true);
  });

  it('a failed answers insert rolls the attempt back entirely', async () => {
    failAnswers.on = true;
    const result = await saveExamResult(submission());

    // The candidate is told the submission failed…
    expect('error' in result).toBe(true);
    expect((result as { error: string }).error).toBe('Server xətası baş verdi.');

    // …and that is the truth: nothing was filed, so no attempt number was burnt
    // and no empty result can appear on their dashboard.
    expect(await db.select().from(examResults).where(eq(examResults.userId, USER))).toHaveLength(0);
    expect(await db.select().from(examAnswers)).toHaveLength(0);
  });

  it('the retry then files attempt 1, not attempt 2', async () => {
    failAnswers.on = true;
    await saveExamResult(submission());        // rolled back
    failAnswers.on = false;
    const retry = await saveExamResult(submission());

    expect('error' in retry).toBe(false);
    if ('error' in retry) return;

    expect(retry.attemptNumber).toBe(1);
    const results = await db.select().from(examResults).where(eq(examResults.userId, USER));
    expect(results).toHaveLength(1);

    const answers = await db.select().from(examAnswers).where(eq(examAnswers.resultId, retry.resultId));
    expect(answers).toHaveLength(2);
  });

  it('allocates sequential attempt numbers across genuine retakes', async () => {
    const a = await saveExamResult(submission());
    const b = await saveExamResult(submission());
    const c = await saveExamResult(submission());
    expect([a, b, c].map(r => ('error' in r ? -1 : r.attemptNumber))).toEqual([1, 2, 3]);
  });

  it('still records the answer snapshot on the happy path', async () => {
    const result = await saveExamResult(submission());
    if ('error' in result) throw new Error(result.error);
    const answers = await db.select().from(examAnswers).where(eq(examAnswers.resultId, result.resultId));
    expect(answers.map(a => a.qStem).sort()).toEqual(['Q1', 'Q2']);
    expect(answers.every(a => a.qOptions.length === 2)).toBe(true);
  });
});
