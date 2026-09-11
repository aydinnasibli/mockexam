/**
 * REGRESSION — during `next build`, the catalog is read ONCE per process.
 *
 * The build hung on CI's placeholder `DATABASE_URL`. From `127.0.0.1` the Neon
 * HTTP driver derives `https://api.0.0.1/sql`, an invalid URL, so every query
 * throws before any request goes out. Inside a prerender the first such query
 * rejects normally and every later one in the same worker never settles; with a
 * dozen pages each reading the catalog, the pages behind the first read hit the
 * 60-second static-generation timeout and the build failed.
 *
 * The fix is structural — one shared read per build process — so these tests
 * pin the structure: the query count, not just the result. Asserting only "the
 * build pages get an array" would pass against the version that re-queried per
 * page, because in a test every query settles.
 *
 * The runtime cases matter as much. Memoising at module scope is correct ONLY
 * while building; a deployed server that shared one read would serve the
 * catalog as it stood at boot, forever.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const query = vi.fn();

vi.mock('@/lib/infra/db', () => {
  // select().from().where().orderBy() — the one chain `getActiveExams` builds.
  const chain = { from: () => chain, where: () => chain, orderBy: () => query() };
  return { db: { select: () => chain } };
});

/** A row with every column `toPublicExam` reads. */
function row(id: string) {
  return {
    id, title: id, type: 'ielts', variant: 'academic', description: '', tag: '',
    price: '15.00', features: [], modules: [], totalQuestions: 40, durationMinutes: 60,
    isActive: true, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

/** Fresh module per test: the snapshot lives at module scope. */
async function load() {
  vi.resetModules();
  return import('@/lib/db/exams');
}

const phase = process.env.NEXT_PHASE;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  query.mockReset();
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorLog.mockRestore();
  if (phase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = phase;
});

describe('getActiveExamsForPrerender during next build', () => {
  beforeEach(() => { process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD; });

  it('reads the catalog once, however many pages ask', async () => {
    query.mockResolvedValue([row('a'), row('b')]);
    const { getActiveExamsForPrerender } = await load();

    const results = await Promise.all([
      getActiveExamsForPrerender(),
      getActiveExamsForPrerender(),
      getActiveExamsForPrerender(),
    ]);

    expect(query).toHaveBeenCalledTimes(1);
    // One snapshot: every page is built from the same inventory.
    expect(results[0].map((e) => e.id)).toEqual(['a', 'b']);
    expect(results[1]).toBe(results[0]);
    expect(results[2]).toBe(results[0]);
  });

  it('degrades to empty on failure without retrying the read', async () => {
    query.mockRejectedValue(new Error('Failed to parse URL from https://api.0.0.1/sql'));
    const { getActiveExamsForPrerender } = await load();

    await expect(getActiveExamsForPrerender()).resolves.toEqual([]);
    await expect(getActiveExamsForPrerender()).resolves.toEqual([]);

    // The second call is the one that used to hang. It must never be made.
    expect(query).toHaveBeenCalledTimes(1);
    // Legible in the build log, and once — not once per page.
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe('getActiveExamsForPrerender at runtime', () => {
  beforeEach(() => { delete process.env.NEXT_PHASE; });

  it('reads fresh data on every call', async () => {
    query.mockResolvedValueOnce([row('before')]).mockResolvedValueOnce([row('after')]);
    const { getActiveExamsForPrerender } = await load();

    expect((await getActiveExamsForPrerender()).map((e) => e.id)).toEqual(['before']);
    // A paper published between two ISR regenerations has to appear.
    expect((await getActiveExamsForPrerender()).map((e) => e.id)).toEqual(['after']);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('lets a failure through instead of caching an empty catalog', async () => {
    query.mockRejectedValue(new Error('connection reset'));
    const { getActiveExamsForPrerender } = await load();

    // A failed ISR regeneration keeps the last good page; an empty array would
    // be stored as a good page for the next hour.
    await expect(getActiveExamsForPrerender()).rejects.toThrow('connection reset');
  });
});
