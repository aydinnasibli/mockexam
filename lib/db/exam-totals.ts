import 'server-only';
import { revalidatePath } from 'next/cache';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams, questions } from '@/lib/db/schema';
import { buildModuleSchedule, totalScheduledSeconds } from '@/lib/domain/exam-timing';
import { captureException } from '@/lib/infra/observability';

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
 */
export async function syncExamTotals(examId: string): Promise<void> {
  try {
    const [exam] = await db
      .select({ modules: exams.modules })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    if (!exam) return;

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
     */
    if (totalQuestions === 0) return;

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
  } catch (err) {
    // Best-effort: a stale headline number must never fail the write that
    // prompted it. It is still reported, because silent drift is the bug.
    void captureException(err, { tags: { action: 'syncExamTotals' }, extra: { examId } });
  }
}

/**
 * Invalidate every cached surface that renders an exam.
 *
 * `revalidatePath('/exams')` alone was called from all six mutation sites and
 * only ever invalidated the catalog. The detail page is `revalidate = 3600`
 * with `generateStaticParams`, and Next builds its cache tag from the LITERAL
 * path — its own source logs "this has no effect" when a dynamic route is
 * passed without a `type`. So a reprice left `/exams/<id>` advertising the old
 * price for up to an hour while checkout charged the new one, a deactivation
 * left a working Buy button, and a delete kept serving.
 *
 * Pass `examId` for a single exam; omit it for a bulk operation (seed, resync)
 * and every parameterisation of the route is invalidated instead.
 */
export function revalidateExam(examId?: string): void {
  revalidatePath('/exams');
  revalidatePath('/admin/exams');
  if (examId) {
    revalidatePath(`/exams/${examId}`);
  } else {
    // The `'page'` type is REQUIRED for a dynamic route; without it the call
    // is silently a no-op.
    revalidatePath('/exams/[id]', 'page');
  }
}
