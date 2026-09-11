import 'server-only';
import { cache } from 'react';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams, type Exam, type ExamModule } from '@/lib/db/schema';
import type { ExamVariant } from '@/lib/domain/exam-types';

/** Shape exposed to all public-facing pages — no database internals. */
export interface PublicExam {
  id: string;
  title: string;
  type: string;
  /** Academic vs General Training. Only affects grading for IELTS. */
  variant: ExamVariant;
  description: string;
  tag: string;
  price: number;
  durationMinutes: number;
  totalQuestions: number;
  features: string[];
  /** Whether the exam is on sale. Owners keep access to one that is not. */
  isActive: boolean;
  updatedAt: Date;
  modules: Array<{
    name: string;
    type: string;
    durationMinutes: number;
    questions: number;
    breakAfterMinutes: number;
    isAdaptive: boolean;
    instructions: string;
    layout: 'single' | 'block';
  }>;
}

function serialize(m: ExamModule) {
  return {
    name:              m.name,
    type:              m.type,
    durationMinutes:   m.durationMinutes,
    questions:         m.questions,
    breakAfterMinutes: m.breakAfterMinutes,
    isAdaptive:        m.isAdaptive ?? false,
    instructions:      m.instructions ?? '',
    layout:            m.layout === 'block' ? ('block' as const) : ('single' as const),
  };
}

/**
 * `price` is stored as `numeric`, which the Postgres driver hands back as a
 * STRING — numeric is arbitrary precision and has no lossless JS number to
 * decode into, so the driver refuses to guess. Every caller of `PublicExam`
 * treats price as a number (checkout multiplies it into `amountCents`), so the
 * conversion belongs here, once, at the boundary.
 */
function toPublicExam(e: Exam): PublicExam {
  return {
    id:              e.id,
    title:           e.title,
    type:            e.type,
    variant:         e.variant,
    description:     e.description,
    tag:             e.tag,
    price:           Number(e.price),
    durationMinutes: e.durationMinutes,
    totalQuestions:  e.totalQuestions,
    features:        e.features,
    isActive:        e.isActive,
    updatedAt:       e.updatedAt,
    modules:         e.modules.map(serialize),
  };
}

/*
 * All three readers are wrapped in React's `cache()`, which memoises per
 * request (or per prerender).
 *
 * Every one of them is called more than once while rendering a single page:
 * `generateMetadata` and the page body both resolve the same exam, and /exams
 * queries the catalog once for its canonical-URL decision and again for the
 * list itself. Next dedupes `fetch`, but these are database calls, so without
 * this each duplicate was a second round-trip.
 */

/** Returns all active exams, newest first. */
export const getActiveExams = cache(async function getActiveExams(): Promise<PublicExam[]> {
  const rows = await db
    .select()
    .from(exams)
    .where(eq(exams.isActive, true))
    .orderBy(desc(exams.createdAt));
  return rows.map(toPublicExam);
});

/**
 * `getActiveExams` for a page that PRERENDERS, tolerating an unreachable
 * database only while the build runs.
 *
 * CI builds with `DATABASE_URL` set to a placeholder that resolves to nothing
 * (see `.github/workflows/ci.yml`), so a static page that queries the catalog
 * has to survive the query failing or the build cannot finish. A bare
 * `.catch(() => [])` buys that — and quietly sells something far more
 * expensive, because these pages carry `revalidate = 3600`: one blip during a
 * background revalidation renders "Sınaqlar hazırlanır." over an empty register
 * and Next stores that as a perfectly good page for the next hour.
 *
 * Letting the error through at request time is what we actually want. A failed
 * ISR revalidation leaves the last good copy in place and retries; a failed
 * cold render is a 500, which is honest and, unlike an empty catalog, not
 * cached.
 *
 * `NEXT_PHASE` is set to `PHASE_PRODUCTION_BUILD` by `next build` and by
 * nothing else, so the two cases are genuinely distinguishable. `next build`
 * sets it before it forks the static-render workers and those inherit
 * `process.env`, so it is visible where the prerendering actually happens.
 *
 * Use this from the RENDER body of every page that prerenders the catalog. A
 * page that reaches for `getActiveExams().catch(() => [])` on its own gets the
 * CI build it wanted and the poisoned hour it did not.
 *
 * `generateStaticParams` uses it as well. It only ever runs during a build, so
 * it always takes the tolerant branch — and an empty param list is safe there,
 * because it defers every page to first request rather than caching anything
 * wrong. See `buildCatalog` below for why it must not read the catalog itself.
 */
export async function getActiveExamsForPrerender(): Promise<PublicExam[]> {
  if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) return getActiveExams();
  buildCatalog ??= readBuildCatalog();
  return buildCatalog;
}

/**
 * The catalog as one BUILD process sees it: read once, shared by every page
 * that process prerenders.
 *
 * Module scope is safe here and only here. `next build` forks short-lived
 * workers that exit when the build does, so this never outlives the build — and
 * the runtime branch above never touches it, so a deployed server still reads
 * fresh data on every render and every ISR regeneration.
 *
 * Three reasons for reading once:
 *
 * Consistency. The homepage price rail, the catalog, seven type pages, the
 * sitemap and llms.txt all describe the same inventory. Read separately, a paper
 * published mid-build can appear on some of them and not others; read once, the
 * whole build agrees with itself.
 *
 * Cost. Each of those pages used to issue its own identical query — a dozen or
 * more per worker for one table that does not change during a build.
 *
 * And a hang. With CI's placeholder `DATABASE_URL` (host `127.0.0.1`), the Neon
 * HTTP driver derives the endpoint `https://api.0.0.1/sql`, which is not a valid
 * URL, so the query throws before any request is made. Outside Next that simply
 * rejects, every time. Inside a prerender it rejects the FIRST time — and every
 * later query in the same worker then never settles, so the pages behind it hit
 * the 60-second static-generation timeout and the build fails. That was
 * reproduced, not inferred: traced per call, with an unresolvable host (a plain
 * network error) building cleanly. One read per process never makes the second
 * call, so the build no longer depends on that behaviour.
 *
 * `generateStaticParams` goes through here too, for the same reasons: the list of
 * papers that get prerendered should be the same list those pages render from.
 */
let buildCatalog: Promise<PublicExam[]> | undefined;

function readBuildCatalog(): Promise<PublicExam[]> {
  return getActiveExams().catch((err: unknown) => {
    /*
     * `console.error`, NOT `captureException`.
     *
     * `captureException` resolves a distinct id through `auth()`, which reads
     * cookies — and a cookie read inside a statically prerendered page opts the
     * page out of static rendering entirely. Reporting the failure that way
     * would turn every page calling this from ISR into a dynamic one on the
     * builds where it fires, which is worse than the failure it reports.
     *
     * Silence is not an option either: this branch ships a build whose catalog
     * pages are empty, and that has to be legible in the build log rather than
     * discovered in production. Vercel surfaces build and ISR-regeneration logs.
     * Logged once per build process now, rather than once per page.
     */
    console.error('[exams] build-time catalog read failed; prerendering empty:', err);
    return [];
  });
}

/** Returns a single active exam by its id, or null. */
export const getExamById = cache(async function getExamById(examId: string): Promise<PublicExam | null> {
  const [e] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.isActive, true)))
    .limit(1);
  return e ? toPublicExam(e) : null;
});

/**
 * Every exam, active or not, newest first.
 *
 * The dashboard needs this rather than `getActiveExams`: a candidate who has
 * PAID for an exam must keep seeing it — and its past attempts — after an admin
 * takes it off sale. Filtering the dashboard through the active catalog made a
 * purchased exam and its whole result history disappear from the buyer's own
 * page, while `hasExamAccess` still let them in by URL. Deactivation is the
 * route `deleteExam` explicitly recommends, so this is not a rare state.
 *
 * Callers must still filter to what the viewer owns before showing anything.
 */
export const getAllExams = cache(async function getAllExams(): Promise<PublicExam[]> {
  const rows = await db
    .select()
    .from(exams)
    .orderBy(desc(exams.createdAt));
  return rows.map(toPublicExam);
});

/** Returns any exam (including inactive) — used for checkout access checks etc. */
export const getExamByIdAdmin = cache(async function getExamByIdAdmin(examId: string): Promise<PublicExam | null> {
  const [e] = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);
  return e ? toPublicExam(e) : null;
});
