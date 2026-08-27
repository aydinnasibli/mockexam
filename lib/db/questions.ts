import 'server-only';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { questions } from '@/lib/db/schema';

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
  const [q] = await db
    .select({
      stem:         questions.stem,
      options:      questions.options,
      correctIndex: questions.correctIndex,
      explanation:  questions.explanation,
      passage:      questions.passage,
      moduleIndex:  questions.moduleIndex,
    })
    .from(questions)
    .where(and(
      eq(questions.examId, examId),
      eq(questions.type, 'mcq'),
      gte(questions.correctIndex, 0),
      // Mongo expressed "has a second option" as `'options.1': {$exists: true}`.
      // Said directly: the question must offer a choice at all, not a single
      // lettered answer the panel would render as a non-question.
      sql`cardinality(${questions.options}) >= 2`,
    ))
    .orderBy(asc(questions.moduleIndex), asc(questions.order))
    .limit(1);

  if (!q) return null;

  return {
    stem:         q.stem,
    options:      q.options ?? [],
    correctIndex: q.correctIndex,
    explanation:  q.explanation ?? '',
    passage:      q.passage ?? '',
    moduleIndex:  q.moduleIndex,
  };
}
