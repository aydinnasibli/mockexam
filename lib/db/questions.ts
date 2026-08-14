import 'server-only';
import dbConnect from '@/lib/mongodb';
import QuestionModel from '@/lib/models/Question';

/** One question from an exam's bank, printed as the public specimen. */
export interface SampleQuestion {
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  passage: string;
  /** Index into `exam.modules`, so the specimen can name the module it sits in. */
  moduleIndex: number;
}

/**
 * The question shown in the "Nümunə" panel on an exam's page.
 *
 * Deterministic — the first scorable multiple-choice question in module order —
 * so the same exam always shows the same specimen, and a rebuild never silently
 * swaps it for another. Open, matching and writing questions are skipped: the
 * panel is built around lettered options and a single correct answer.
 *
 * Returns null when the bank holds nothing suitable, and the caller then omits
 * the panel entirely rather than printing an illustration from another exam.
 */
export async function getSampleQuestion(examId: string): Promise<SampleQuestion | null> {
  await dbConnect();

  const q = await QuestionModel
    .findOne({
      examId,
      type: 'mcq',
      correctIndex: { $gte: 0 },
      'options.1': { $exists: true },
    })
    .sort({ moduleIndex: 1, order: 1 })
    .lean();

  if (!q) return null;

  return {
    stem:        q.stem,
    options:     q.options ?? [],
    correctIndex: q.correctIndex,
    explanation: q.explanation ?? '',
    passage:     q.passage ?? '',
    moduleIndex: q.moduleIndex,
  };
}
