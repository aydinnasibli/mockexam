import 'server-only';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams, questions } from '@/lib/db/schema';
import { buildModuleSchedule, totalScheduledSeconds } from '@/lib/domain/exam-timing';
import { captureException } from '@/lib/infra/observability';
import { indexNowKey, submitToIndexNow } from '@/lib/infra/indexnow';
import { absoluteUrl } from '@/lib/shared/seo';
import { EXAM_PAPER_ROUTE, EXAM_TYPE_ROUTE } from '@/lib/shared/app-routes';
import { CONTENT_TYPES, examPath, typePath, type ExamRef } from '@/lib/domain/exam-content';

/**
 * Bring an exam's advertised totals in line with the exam it actually runs.
 *
 * `computeExamTotals` sums what the modules DECLARE: the `questions` number an
 * admin typed into the module row, and every module's minutes whether or not
 * that module has a single question behind it. The player does neither. It
 * counts the real bank, and `buildModuleSchedule` skips empty modules and trims
 * a trailing break — so the catalog could promise "98 sual, 134 dəqiqə" for a
 * paper that ran 40 questions in 94 minutes. That is a claim made to someone
 * before they pay.
 *
 * Called from every path that changes the question bank or the module list, so
 * the stored numbers are the ones a candidate will meet.
 *
 * Returns the paper it synced — id and type — or `null` when there was no row
 * to read. Every caller's next move is `revalidateExam`, which needs the TYPE
 * to name the paper's URL (see `ExamRef`), and this function has already read
 * that row: handing it back is what keeps those call sites from issuing a
 * second query for a column they could have been given.
 *
 * The ref is declared OUTSIDE the `try` so that it survives the catch. Sync is
 * best-effort by design, but the identity it resolved is not a casualty of the
 * failure: returning `null` after a mid-sync error dropped the paper's URL from
 * the caller's IndexNow submission, which is the same silent-drop this file's
 * test suite exists to prevent — reached by a different route. Once the first
 * SELECT lands, the ref is known and stays known.
 */
export async function syncExamTotals(examId: string): Promise<ExamRef | null> {
  // Whatever we managed to learn before a failure. See the docblock.
  let ref: ExamRef | null = null;

  try {
    const [exam] = await db
      .select({ type: exams.type, modules: exams.modules })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    if (!exam) return null;

    ref = { id: examId, type: exam.type };

    // The one aggregation this codebase ever ran. GROUP BY on a plain column
    // rather than a pipeline stage over an embedded field.
    const rows = await db
      .select({ moduleIndex: questions.moduleIndex, n: count() })
      .from(questions)
      .where(eq(questions.examId, examId))
      .groupBy(questions.moduleIndex);

    const moduleCount = exam.modules.length;
    const counts = new Array<number>(moduleCount).fill(0);
    for (const r of rows) {
      if (Number.isInteger(r.moduleIndex) && r.moduleIndex >= 0 && r.moduleIndex < moduleCount) {
        counts[r.moduleIndex] = r.n;
      }
    }

    const totalQuestions = counts.reduce((s, n) => s + n, 0);

    /*
     * An exam whose bank is completely empty keeps its DECLARED figures.
     *
     * Those numbers are what an admin authored the paper to be, and a bank that
     * has not been filled in yet is a work in progress, not a 0-question exam.
     * Overwriting them would advertise "0 sual, 0 dəqiqə" in the catalog and —
     * because `beginExamSession` falls back to `exam.durationMinutes` when
     * nothing is scheduled — hand a zero-length clock to anyone who started it.
     * This mirrors that same fallback rather than inventing a second rule.
     *
     * The ref is still returned: nothing was written, but the paper is real and
     * its cached pages still need invalidating for whatever prompted the call.
     */
    if (totalQuestions === 0) return ref;

    // The same schedule the session is built from, so the advertised duration is
    // the one the clock will actually run.
    const scheduledSeconds = totalScheduledSeconds(buildModuleSchedule(exam.modules, counts));

    /*
     * The per-module counts go back too. The headline being right while the
     * module table still showed the authored estimate would just move the lie:
     * the public exam page renders `mod.questions` per row, and derives each
     * section's pace from it.
     *
     * Mongo addressed these one at a time (`modules.${i}.questions`). Here the
     * array is rewritten whole in the same UPDATE as the headline figures, so
     * a reader can never observe the two disagreeing.
     */
    await db
      .update(exams)
      .set({
        totalQuestions,
        durationMinutes: Math.round(scheduledSeconds / 60),
        modules: exam.modules.map((m, i) => ({ ...m, questions: counts[i] })),
        updatedAt: new Date(),
      })
      .where(eq(exams.id, examId));

    return ref;
  } catch (err) {
    // Best-effort: a stale headline number must never fail the write that
    // prompted it. It is still reported, because silent drift is the bug.
    void captureException(err, { tags: { action: 'syncExamTotals' }, extra: { examId } });
    // Not `null`: the totals may be stale, but the paper is real and its caller
    // still has to invalidate and submit its URL.
    return ref;
  }
}

/**
 * Invalidate every cached surface that renders an exam.
 *
 * `revalidatePath('/exams')` alone was called from all six mutation sites and
 * only ever invalidated the catalog. The detail page is `revalidate = 3600`
 * with `generateStaticParams`, and Next builds its cache tag from the LITERAL
 * path — its own source logs "this has no effect" when a dynamic route is
 * passed without a `type`. So a reprice left the paper advertising the old
 * price for up to an hour while checkout charged the new one, a deactivation
 * left a working Buy button, and a delete kept serving.
 *
 * Pass the paper for a single-exam mutation; omit it for a bulk operation
 * (seed, resync). Either way both dynamic routes are invalidated wholesale.
 *
 * The parameter is the exam's ID AND TYPE, not its id, because the IndexNow
 * ping below has to name the paper's URL and `/exams/<type>/<id>` cannot be
 * rebuilt from an id alone. Every caller already holds both — the admin
 * mutations get them back from the `RETURNING` clause of the statement they
 * were already running, and the question actions get them from
 * `syncExamTotals`, which they already await. See `pingIndexNow` for why this
 * is a parameter rather than a lookup.
 *
 * A LIST is accepted because one paper can own two URLs at once. An edit that
 * moves a paper between types leaves its old `/exams/<old type>/<id>` serving a
 * 308 to the new one, and that old URL is a change search engines have to be
 * told about — submitting only the destination leaves them re-crawling a URL
 * nothing has announced. `updateExam` passes both; every other caller passes
 * one and reads exactly as it did before.
 */
export function revalidateExam(exam?: ExamRef | readonly ExamRef[] | null): void {
  // Literal paths: not dynamic routes, so they match on the pathname tag and
  // take no `type` argument.
  revalidatePath('/exams');
  revalidatePath('/admin/exams');

  /*
   * Both dynamic routes, unconditionally.
   *
   * `'page'` is REQUIRED for a dynamic route; without it the call is silently a
   * no-op. So is a path that does not match the page's own tag — which is why
   * these patterns are constants pinned by a test rather than literals written
   * out here. See `lib/shared/app-routes.ts` for what the route group is doing
   * in them.
   *
   * Wholesale rather than targeted even though `exam` would now support a
   * targeted call. A single mutation moves more than its own paper: publishing
   * one changes the register on `/exams`, its type page, and the tab COUNTS on
   * every other type page. Invalidating eleven cached pages instead of two
   * costs nothing at this size and cannot be wrong, whereas enumerating which
   * neighbours a given edit touched can be, quietly.
   */
  revalidatePath(EXAM_TYPE_ROUTE, 'page');
  revalidatePath(EXAM_PAPER_ROUTE, 'page');

  pingIndexNow(exam);
}

/**
 * Tell Bing and friends that the catalog moved, after the response is sent.
 *
 * Inside `after()` so an admin pressing Save never waits on an outbound HTTP
 * call to Microsoft, and never sees an error if it fails. The whole thing is
 * skipped when no key is configured, so an unconfigured install pays nothing.
 *
 * The paper is PASSED IN, never looked up.
 *
 * An earlier version resolved it here with `getExamById`, which filters on
 * `is_active` — so the two mutations whose whole point is that a URL stopped
 * working, `toggleExamActive(id, false)` and `deleteExam`, were the two where
 * the lookup returned nothing and the paper's URL was silently dropped from the
 * submission. Deactivating a paper is exactly when Bing most needs to hear
 * about it. Reaching for `getExamByIdAdmin` instead would have fixed the
 * deactivation and left the delete broken, because after a delete there is no
 * row to read at any privilege level.
 *
 * A URL that now 404s is the RIGHT thing to submit: that is how a search engine
 * learns the page is gone. Which is why the identity travels with the call
 * instead of being reconstructed after the fact — the caller is the only thing
 * that still holds it once the row does not.
 *
 * `after()` throws outside a request scope — the seed script and the test suite
 * both reach here — so the call is guarded rather than assumed.
 */
function pingIndexNow(exam?: ExamRef | readonly ExamRef[] | null): void {
  if (!indexNowKey()) return;

  // One paper, several papers, or none — the bulk callers name none at all.
  const papers: readonly ExamRef[] =
    exam == null ? [] : Array.isArray(exam) ? exam : [exam as ExamRef];

  // Built by `absoluteUrl`, as the sitemap's entries are, so every URL pinged is
  // character for character the one the sitemap lists — the home page's
  // included, which is `HOME_URL` and not the bare origin.
  const urls = [
    absoluteUrl('/'),
    absoluteUrl('/exams'),
    ...CONTENT_TYPES.map((type) => absoluteUrl(typePath(type))),
    ...papers.map((paper) => absoluteUrl(examPath(paper))),
  ];

  try {
    after(() => submitToIndexNow(urls));
  } catch {
    // No request scope. Nothing to report: the cache invalidation above is the
    // part that matters, and a missed search-engine ping self-corrects on the
    // next mutation.
  }
}
