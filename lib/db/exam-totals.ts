import 'server-only';
import dbConnect from '@/lib/infra/mongodb';
import ExamModel from '@/lib/models/Exam';
import QuestionModel from '@/lib/models/Question';
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
    await dbConnect();

    const exam = await ExamModel.findOne({ examId }).select('modules').lean();
    if (!exam) return;

    const rows = await QuestionModel.aggregate<{ _id: number; n: number }>([
      { $match: { examId } },
      { $group: { _id: '$moduleIndex', n: { $sum: 1 } } },
    ]);

    const moduleCount = exam.modules.length;
    const counts = new Array<number>(moduleCount).fill(0);
    for (const r of rows) {
      if (Number.isInteger(r._id) && r._id >= 0 && r._id < moduleCount) counts[r._id] = r.n;
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

    await ExamModel.updateOne(
      { examId },
      {
        $set: {
          totalQuestions,
          durationMinutes: Math.round(scheduledSeconds / 60),
          // Per-module counts too. The headline being right while the module
          // table still showed the authored estimate would just move the lie:
          // the public exam page renders `mod.questions` per row, and derives
          // each section's pace from it.
          ...Object.fromEntries(counts.map((n, i) => [`modules.${i}.questions`, n])),
        },
      },
    );
  } catch (err) {
    // Best-effort: a stale headline number must never fail the write that
    // prompted it. It is still reported, because silent drift is the bug.
    void captureException(err, { tags: { action: 'syncExamTotals' }, extra: { examId } });
  }
}
