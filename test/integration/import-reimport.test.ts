/**
 * `importExamFromJson` — re-import, slot assignment and atomicity.
 *
 * The bug these were written against: step 4 refused any payload whose `examId`
 * already existed, which made the `ON CONFLICT (exam_id, module_index, order)
 * DO UPDATE` below it unreachable. A fresh exam has nothing to conflict with,
 * so the one mechanism that keeps question ids stable across an import never
 * ran on the only path it was written for — while its comment, its schema
 * counterpart and `claim-sql.test.ts` all described it as THE fix for the
 * orphaned-question-id bug that hit 1,064 of 1,310 answers on ielts-academic-1.
 *
 * Two more faults sat in the same function: the exam and its bank were written
 * as separate statements, so a mid-way failure stranded the exam row and — via
 * that same existence check — bricked the id permanently; and `order` fell back
 * to the question's GLOBAL position while `templates/EXAMPLE.json` authors it
 * per module, so a mixed payload could put two questions in one slot and crash
 * with an opaque 21000.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

vi.mock('@/lib/infra/db', async () => {
  const { db } = await import('@/test/pg');
  return { db, txDb: () => ({ db, close: async () => {} }) };
});
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: 'user_admin', sessionClaims: { metadata: { role: 'admin' } } }),
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

const { db, resetDb } = await import('@/test/pg');
const { questions, exams, examResults, examAnswers } = await import('@/lib/db/schema');
const { importExamFromJson } = await import('@/lib/actions/import');

const EXAM = 'ielts-reimport';

type Q = { stem: string; moduleIndex?: number; order?: number };

const payload = (qs: Q[], extra: Record<string, unknown> = {}) => ({
  examId: EXAM,
  title: 'IELTS Reimport',
  type: 'ielts',
  description: 'x',
  tag: 'IELTS',
  price: 15,
  modules: [
    { name: 'Reading', type: 'reading', durationMinutes: 60, questions: 0, breakAfterMinutes: 0, isAdaptive: false, instructions: '', layout: 'single' },
    { name: 'Writing', type: 'writing', durationMinutes: 60, questions: 0, breakAfterMinutes: 0, isAdaptive: false, instructions: '', layout: 'single' },
  ],
  questions: qs.map(q => ({
    moduleIndex: q.moduleIndex ?? 0,
    ...(q.order === undefined ? {} : { order: q.order }),
    type: 'mcq' as const,
    stem: q.stem, options: ['a', 'b'], correctIndex: 0,
  })),
  ...extra,
});

/** `importExamFromJson` ends in `redirect()`, which throws by design. */
async function runImport(body: unknown): Promise<{ error: string } | 'redirected'> {
  try {
    const r = await importExamFromJson(body);
    return r ?? 'redirected';
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT')) return 'redirected';
    throw err;
  }
}

const bank = () =>
  db.select().from(questions).where(eq(questions.examId, EXAM)).orderBy(questions.moduleIndex, questions.order);

beforeEach(async () => { await resetDb(); });

describe('importExamFromJson — first import', () => {
  it('creates the exam and its bank', async () => {
    expect(await runImport(payload([{ stem: 'Q1' }, { stem: 'Q2' }]))).toBe('redirected');
    expect(await bank()).toHaveLength(2);
  });

  it('defaults a new exam to inactive so an admin reviews it first', async () => {
    await runImport(payload([{ stem: 'Q1' }]));
    const [e] = await db.select().from(exams).where(eq(exams.id, EXAM));
    expect(e.isActive).toBe(false);
  });

  it('assigns `order` per module, not by position in the payload', async () => {
    await runImport(payload([
      { stem: 'R1', moduleIndex: 0 },
      { stem: 'R2', moduleIndex: 0 },
      { stem: 'W1', moduleIndex: 1 },
      { stem: 'W2', moduleIndex: 1 },
    ]));
    const rows = await bank();
    expect(rows.map(r => [r.moduleIndex, r.order])).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });
});

describe('importExamFromJson — re-import', () => {
  it('updates the exam in place instead of refusing', async () => {
    await runImport(payload([{ stem: 'Q1' }]));
    const result = await runImport(payload([{ stem: 'Q1' }], { title: 'Renamed' }));

    expect(result).toBe('redirected');
    const [e] = await db.select().from(exams).where(eq(exams.id, EXAM));
    expect(e.title).toBe('Renamed');
  });

  it('PRESERVES question ids, so filed results stay joinable', async () => {
    await runImport(payload([{ stem: 'Q1' }, { stem: 'Q2' }]));
    const before = await bank();
    const idBySlot = new Map(before.map(q => [`${q.moduleIndex}:${q.order}`, q.id]));

    await runImport(payload([{ stem: 'Q1 revised' }, { stem: 'Q2 revised' }]));

    const after = await bank();
    expect(after).toHaveLength(2);
    for (const q of after) {
      expect(q.id).toBe(idBySlot.get(`${q.moduleIndex}:${q.order}`));
    }
    expect(after.map(q => q.stem)).toEqual(['Q1 revised', 'Q2 revised']);
  });

  it("does not orphan a filed attempt's answers", async () => {
    await runImport(payload([{ stem: 'Q1' }, { stem: 'Q2' }]));
    const before = await bank();

    // A candidate sits the paper.
    const [res] = await db.insert(examResults).values({
      userId: 'user_1', examId: EXAM, examTitle: 'IELTS Reimport', examTag: 'IELTS',
      attemptNumber: 1, startedAt: new Date(), completedAt: new Date(),
      durationSeconds: 60, totalQuestions: 2, score: '50.00',
    }).returning({ id: examResults.id });
    await db.insert(examAnswers).values(before.map(q => ({
      resultId: res.id, questionId: q.id, moduleIndex: q.moduleIndex,
      userAnswer: 0, correctIndex: 0, isCorrect: true,
    })));

    // …then the exam is re-imported.
    await runImport(payload([{ stem: 'Q1 revised' }, { stem: 'Q2 revised' }]));

    const answers = await db.select().from(examAnswers).where(eq(examAnswers.resultId, res.id));
    expect(answers).toHaveLength(2);
    // Every answer still resolves to a live question — this is the failure that
    // rendered whole attempts as unanswered and wrong.
    expect(answers.every(a => a.questionId !== null)).toBe(true);
    const liveIds = new Set((await bank()).map(q => q.id));
    expect(answers.every(a => liveIds.has(a.questionId!))).toBe(true);
  });

  it('does NOT take a live exam off sale', async () => {
    await runImport(payload([{ stem: 'Q1' }]));
    await db.update(exams).set({ isActive: true }).where(eq(exams.id, EXAM));

    // The payload omits `isActive` entirely.
    await runImport(payload([{ stem: 'Q1 revised' }]));

    const [e] = await db.select().from(exams).where(eq(exams.id, EXAM));
    expect(e.isActive).toBe(true);
  });

  it('honours an explicit isActive on re-import', async () => {
    await runImport(payload([{ stem: 'Q1' }]));
    await runImport(payload([{ stem: 'Q1' }], { isActive: true }));
    const [e] = await db.select().from(exams).where(eq(exams.id, EXAM));
    expect(e.isActive).toBe(true);
  });

  it('retires slots the shorter new bank no longer fills', async () => {
    await runImport(payload([{ stem: 'Q1' }, { stem: 'Q2' }, { stem: 'Q3' }]));
    expect(await bank()).toHaveLength(3);

    await runImport(payload([{ stem: 'Q1' }]));
    const rows = await bank();
    expect(rows).toHaveLength(1);
    expect(rows[0].stem).toBe('Q1');
  });

  it('clears a module that receives no questions this time', async () => {
    await runImport(payload([
      { stem: 'R1', moduleIndex: 0 },
      { stem: 'W1', moduleIndex: 1 },
    ]));
    expect(await bank()).toHaveLength(2);

    await runImport(payload([{ stem: 'R1', moduleIndex: 0 }]));
    const rows = await bank();
    expect(rows).toHaveLength(1);
    expect(rows[0].moduleIndex).toBe(0);
  });
});

describe('importExamFromJson — bad payloads', () => {
  it('rejects two questions in one slot with an actionable message', async () => {
    const result = await runImport(payload([
      { stem: 'Q1', moduleIndex: 0, order: 0 },
      { stem: 'Q2', moduleIndex: 0, order: 0 },
    ]));
    expect(result).not.toBe('redirected');
    const { error } = result as { error: string };
    expect(error).toContain('Sual #2');
    expect(error).toContain('Sual #1');
    expect(error).not.toMatch(/daxili server xətası/);
  });

  it('leaves NOTHING behind when a payload is rejected, so a retry works', async () => {
    await runImport(payload([
      { stem: 'Q1', moduleIndex: 0, order: 0 },
      { stem: 'Q2', moduleIndex: 0, order: 0 },
    ]));
    // The exam row must not be stranded — that is what used to brick the id.
    expect(await db.select().from(exams).where(eq(exams.id, EXAM))).toHaveLength(0);

    // And the corrected payload imports cleanly.
    expect(await runImport(payload([{ stem: 'Q1' }, { stem: 'Q2' }]))).toBe('redirected');
    expect(await bank()).toHaveLength(2);
  });

  it('still rejects a moduleIndex past the end of the module list', async () => {
    const result = await runImport(payload([{ stem: 'Q1', moduleIndex: 7 }]));
    expect(result).not.toBe('redirected');
    expect((result as { error: string }).error).toContain('moduleIndex 7');
  });

  it('drops questions belonging to a module that was removed', async () => {
    await runImport(payload([
      { stem: 'R1', moduleIndex: 0 },
      { stem: 'W1', moduleIndex: 1 },
    ]));
    const shrunk = payload([{ stem: 'R1', moduleIndex: 0 }]);
    shrunk.modules = [shrunk.modules[0]];
    await runImport(shrunk);

    const rows = await db.select().from(questions)
      .where(and(eq(questions.examId, EXAM), eq(questions.moduleIndex, 1)));
    expect(rows).toHaveLength(0);
  });
});

describe('importExamFromJson — slot retirement', () => {
  it('retires stale questions left in a GAP, not just past the tail', async () => {
    // Author 6 questions, then re-import only slots 0 and 5.
    await runImport(payload([0, 1, 2, 3, 4, 5].map(o => ({ stem: `Q${o}`, order: o }))));
    expect(await bank()).toHaveLength(6);

    await runImport(payload([
      { stem: 'Kept 0', order: 0 },
      { stem: 'Kept 5', order: 5 },
    ]));

    // `order > max(order)` would have retired nothing here and left the old
    // questions at 1–4 in the paper.
    const rows = await bank();
    expect(rows.map(r => r.order)).toEqual([0, 5]);
    expect(rows.map(r => r.stem)).toEqual(['Kept 0', 'Kept 5']);
  });

  it('preserves the ids of the slots it keeps', async () => {
    await runImport(payload([0, 1, 2].map(o => ({ stem: `Q${o}`, order: o }))));
    const before = new Map((await bank()).map(q => [q.order, q.id]));

    await runImport(payload([{ stem: 'Q0 v2', order: 0 }, { stem: 'Q2 v2', order: 2 }]));

    const after = await bank();
    expect(after.map(r => r.order)).toEqual([0, 2]);
    for (const q of after) expect(q.id).toBe(before.get(q.order));
  });
});
