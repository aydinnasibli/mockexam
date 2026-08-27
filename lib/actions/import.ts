'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { and, eq, gte, notInArray, sql } from 'drizzle-orm';
import { txDb } from '@/lib/infra/db';
import { exams as examsTable, questions as questionsTable } from '@/lib/db/schema';
import { computeExamTotals } from '@/lib/domain/exam-modules';
import { auth } from '@clerk/nextjs/server';
import { checkRole } from '@/lib/infra/admin';
import { limited } from '@/lib/infra/rate-limit';
import { validateModules } from '@/lib/domain/exam-modules';
import { isExamType, isExamVariant } from '@/lib/domain/exam-types';
import { validateQuestion } from '@/lib/domain/question-validation';
import {
  isAllowedMediaUrl,
  INVALID_IMAGE_URL_MESSAGE,
  INVALID_AUDIO_URL_MESSAGE,
} from '@/lib/shared/media';
import { captureException } from '@/lib/infra/observability';
import { syncExamTotals, revalidateExam } from '@/lib/db/exam-totals';

/**
 * Import payload schema.
 *
 * Everything an importer can set is bounded here: field lengths, array sizes,
 * enum membership, and numeric ranges. `modules` is deliberately left loose at
 * this layer — it is handed to `validateModules()`, the same validator the
 * admin create/edit form uses, so the two paths cannot drift apart.
 */
const MAX_QUESTIONS = 500;

const questionSchema = z.object({
  moduleIndex:     z.number().int().min(0).max(99).optional(),
  order:           z.number().int().min(0).max(9999).optional(),
  type:            z.enum(['mcq', 'open', 'matching', 'writing']).optional(),
  blockId:         z.string().max(120).optional(),
  passage:         z.string().max(20_000).optional(),
  // Same host rule as imageUrl — see INVALID_AUDIO_URL_MESSAGE.
  audioUrl:        z.string().max(2_000).refine(isAllowedMediaUrl, INVALID_AUDIO_URL_MESSAGE).optional(),
  // Rendered with next/image, which throws on a host outside remotePatterns —
  // so the host is constrained here rather than at render time.
  imageUrl:        z.string().max(2_000).refine(isAllowedMediaUrl, INVALID_IMAGE_URL_MESSAGE).optional(),
  stem:            z.string().max(5_000).optional(),
  options:         z.array(z.string().max(2_000)).max(10).optional(),
  openAnswers:     z.array(z.string().max(500)).max(50).optional(),
  correctIndex:    z.number().int().min(-1).max(9).optional(),
  matchItems:      z.array(z.string().max(2_000)).max(20).optional(),
  correctMatching: z.array(z.number().int().min(0).max(19)).max(20).optional(),
  explanation:     z.string().max(10_000).optional(),
  writingTaskType: z.enum(['task1', 'task2', 'integrated', 'independent', 'general']).optional(),
  minWords:        z.number().int().min(0).max(10_000).optional(),
  maxWords:        z.number().int().min(0).max(10_000).optional(),
  rubric:          z.string().max(10_000).optional(),
});

const importSchema = z.object({
  examId:      z.string().regex(/^[a-z0-9-]{1,64}$/, 'examId yalnız kiçik hərf, rəqəm və tire (-) içərə bilər (maks. 64 simvol).'),
  title:       z.string().trim().min(1).max(200),
  type:        z.string().refine(isExamType, 'Yanlış imtahan növü.'),
  // IELTS only: Academic and General Training grade Reading on different band
  // tables. Absent means Academic, which is right for every other exam type.
  variant:     z.string().refine(isExamVariant, 'Yanlış imtahan variantı.').optional(),
  description: z.string().max(5_000).optional(),
  tag:         z.string().trim().max(50).optional(),
  price:       z.number().min(0).max(10_000).optional(),
  features:    z.array(z.string().max(200)).max(20).optional(),
  isActive:    z.boolean().optional(),
  modules:     z.array(z.unknown()).min(1),
  questions:   z.array(questionSchema).max(MAX_QUESTIONS),
});

export type ImportPayload = z.input<typeof importSchema>;

export async function importExamFromJson(
  parsedJson: unknown,
): Promise<{ error: string } | undefined> {
  let examId: string;

  try {
    if (!(await checkRole('admin'))) return { error: 'Forbidden' };
    // Rewrites an entire question bank per call, so it gets the heavy tier
    // rather than the ordinary console budget.
    const { userId: adminId } = await auth();
    if (adminId && await limited('adminHeavy', 'import', adminId)) {
      return { error: 'Çox tez-tez idxal etdiniz. Bir az gözləyin.' };
    }

    // 1. Validate the whole payload up front.
    const parsed = importSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
      return { error: `JSON faylı keçərsizdir — ${where}${issue?.message ?? 'naməlum xəta'}` };
    }
    const data = parsed.data;
    examId = data.examId;

    // 2. Validate modules through the same validator used by createExam.
    const modulesResult = validateModules(data.modules);
    if ('error' in modulesResult) return modulesResult;

    // 3. Per-question checks that depend on the module list or on other fields.
    for (const [i, q] of data.questions.entries()) {
      const label = `Sual #${i + 1}`;
      const qType = q.type ?? 'mcq';

      const moduleIndex = q.moduleIndex ?? 0;
      if (moduleIndex >= modulesResult.length) {
        return { error: `${label}: moduleIndex ${moduleIndex} mövcud deyil (imtahanda ${modulesResult.length} modul var).` };
      }

      // Gradability is checked by the same validator the admin form now uses,
      // so the two write paths cannot drift apart again.
      const invalid = validateQuestion({ ...q, type: qType }, label);
      if (invalid) return { error: invalid };
    }

    /*
     * 4. Assign each question its slot, and refuse a payload that puts two
     *    questions in one.
     *
     * `order` falls back PER MODULE, not to the question's position in the
     * payload. `templates/EXAMPLE.json` authors `order` as 0-based within each
     * module, so a global fallback disagreed with the documented convention the
     * moment a payload mixed explicit orders with omitted ones — and two
     * questions could land in the same slot. Postgres then raised
     *   21000: ON CONFLICT DO UPDATE command cannot affect row a second time
     * which reached the admin as an opaque "internal server error".
     */
    const nextOrderByModule = new Map<number, number>();
    const takenSlots = new Map<string, number>();
    const questionsToInsert: (typeof questionsTable.$inferInsert)[] = [];

    for (const [i, q] of data.questions.entries()) {
      const moduleIndex = q.moduleIndex ?? 0;
      const fallback = nextOrderByModule.get(moduleIndex) ?? 0;
      const order = q.order ?? fallback;
      nextOrderByModule.set(moduleIndex, Math.max(fallback, order + 1));

      const slot = `${moduleIndex}:${order}`;
      const clash = takenSlots.get(slot);
      if (clash !== undefined) {
        return {
          error: `Sual #${i + 1}: modul ${moduleIndex} / sıra ${order} artıq Sual #${clash} tərəfindən tutulub. `
               + 'Hər sualın “order” dəyəri öz modulu daxilində unikal olmalıdır.',
        };
      }
      takenSlots.set(slot, i + 1);

      questionsToInsert.push({
        examId,
        moduleIndex,
        blockId:         q.blockId?.trim() ?? '',
        order,
        type:            q.type ?? 'mcq',
        passage:         q.passage ?? '',
        audioUrl:        q.audioUrl ?? '',
        imageUrl:        q.imageUrl ?? '',
        stem:            q.stem ?? '',
        options:         q.options ?? [],
        openAnswers:     q.openAnswers ?? [],
        correctIndex:    q.correctIndex ?? -1,
        matchItems:      q.matchItems ?? [],
        correctMatching: q.correctMatching ?? [],
        explanation:     q.explanation ?? '',
        // Writing-specific fields
        ...(q.type === 'writing' && {
          writingTaskType: q.writingTaskType,
          minWords:        q.minWords,
          maxWords:        q.maxWords,
          rubric:          q.rubric ?? '',
        }),
      });
    }

    const { totalQuestions, durationMinutes } = computeExamTotals(modulesResult);

    /*
     * 5. Write the exam and its bank as ONE unit.
     *
     * These were separate statements, so a failure partway left the exam row
     * behind — and because the importer used to REFUSE any id that already
     * existed, that stranded row made every retry impossible. The id was
     * effectively bricked until an admin deleted the exam, which cascades the
     * whole question bank.
     *
     * This is the second legitimate use of `txDb()` in the codebase (see
     * `repackModuleOrders`): several statements that must not be observable
     * apart, and no read-then-decide in between.
     */
    const { db: tx, close } = txDb();
    try {
      await tx.transaction(async trx => {
        /*
         * Re-importing an exam UPDATES it rather than being refused.
         *
         * The refusal used to make the whole slot-preserving upsert below
         * unreachable: a fresh exam has no rows to conflict with, so the one
         * mechanism that keeps question ids stable across an import never ran
         * on the only path it was written for. Admins were told instead to
         * delete the exam — which cascades the bank, and which `deleteExam`
         * refuses outright once anyone has sat or bought the paper.
         *
         * `isActive` is deliberately absent from the update set: a re-import of
         * a LIVE exam must not silently take it off sale, and the insert path
         * still defaults new exams to inactive for review. An importer that
         * genuinely wants to flip it passes the field explicitly.
         */
        await trx
          .insert(examsTable)
          .values({
            id:              examId,
            title:           data.title,
            type:            data.type,
            variant:         data.variant ?? 'academic',
            description:     data.description ?? '',
            tag:             data.tag || data.type.toUpperCase(),
            // numeric columns take a string; the driver will not narrow a float for us.
            price:           String(data.price ?? 0),
            features:        data.features ?? [],
            modules:         modulesResult,
            totalQuestions,
            durationMinutes,
            isActive:        data.isActive ?? false, // new exams start inactive for review
          })
          .onConflictDoUpdate({
            target: examsTable.id,
            set: {
              title:           data.title,
              type:            data.type,
              variant:         data.variant ?? 'academic',
              description:     data.description ?? '',
              tag:             data.tag || data.type.toUpperCase(),
              price:           String(data.price ?? 0),
              features:        data.features ?? [],
              modules:         modulesResult,
              totalQuestions,
              durationMinutes,
              updatedAt:       new Date(),
              ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
            },
          });

        if (questionsToInsert.length > 0) {
          /*
           * UPSERT on the slot key, never delete-then-insert.
           *
           * This is the fix for the orphaned-question-id bug. The old path
           * deleted every question and inserted fresh
           * ones, minting new ids — so each re-import orphaned
           * `answers[].questionId` on every result already filed, and the
           * review page rendered those attempts as entirely unanswered and
           * wrong beneath the band the candidate had actually earned. It
           * reached 1,064 of 1,310 answers on ielts-academic-1.
           *
           * Conflicting on (exam_id, module_index, order) means a re-import
           * UPDATES the question occupying that slot and its id survives, so
           * filed results stay joinable.
           */
          await trx
            .insert(questionsTable)
            .values(questionsToInsert)
            .onConflictDoUpdate({
              target: [questionsTable.examId, questionsTable.moduleIndex, questionsTable.order],
              set: {
                type:            sql`excluded.type`,
                blockId:         sql`excluded.block_id`,
                passage:         sql`excluded.passage`,
                audioUrl:        sql`excluded.audio_url`,
                imageUrl:        sql`excluded.image_url`,
                stem:            sql`excluded.stem`,
                options:         sql`excluded.options`,
                openAnswers:     sql`excluded.open_answers`,
                correctIndex:    sql`excluded.correct_index`,
                matchItems:      sql`excluded.match_items`,
                correctMatching: sql`excluded.correct_matching`,
                explanation:     sql`excluded.explanation`,
                writingTaskType: sql`excluded.writing_task_type`,
                minWords:        sql`excluded.min_words`,
                maxWords:        sql`excluded.max_words`,
                rubric:          sql`excluded.rubric`,
                updatedAt:       new Date(),
              },
            });
        }

        /*
         * Retire every slot the incoming bank does not fill.
         *
         * An upsert only touches the slots it writes, so without this a shorter
         * re-import would leave the tail of the previous bank in place.
         *
         * Keyed on the EXACT set of authored slots, not on the highest one.
         * `order > max(order)` looked equivalent and is not: a payload with a
         * gap — orders 0 and 5, say — would retire 6 and up while silently
         * leaving the old questions at 1 through 4 in the paper, so the exam ran
         * six questions where the author declared two. Slot uniqueness is
         * validated above; contiguity deliberately is not, since an author may
         * legitimately renumber, and this makes that safe.
         *
         * `exam_answers.question_id` is ON DELETE SET NULL, so a filed attempt
         * keeps its answer rows and its snapshot; only the link is dropped, and
         * `buildReviewItems` renders those from the snapshot.
         */
        const authoredOrders = new Map<number, number[]>();
        for (const q of questionsToInsert) {
          const list = authoredOrders.get(q.moduleIndex) ?? [];
          list.push(q.order ?? 0);
          authoredOrders.set(q.moduleIndex, list);
        }

        for (let m = 0; m < modulesResult.length; m++) {
          const orders = authoredOrders.get(m);
          const scope = and(
            eq(questionsTable.examId, examId),
            eq(questionsTable.moduleIndex, m),
          );
          // A module the payload left empty is cleared outright; `notInArray`
          // with an empty list is not a safe way to express that.
          await trx.delete(questionsTable).where(
            orders && orders.length > 0
              ? and(scope, notInArray(questionsTable.order, orders))
              : scope,
          );
        }

        // Any module dropped from the paper entirely.
        await trx.delete(questionsTable).where(and(
          eq(questionsTable.examId, examId),
          gte(questionsTable.moduleIndex, modulesResult.length),
        ));
      });
    } finally {
      await close();
    }

    // `computeExamTotals` above wrote the DECLARED totals; replace them with
    // the ones this bank actually produces.
    await syncExamTotals(examId);
  } catch (err) {
    void captureException(err, { tags: { action: 'importExamFromJson' } });
    return { error: 'Fayl yüklənərkən daxili server xətası baş verdi.' };
  }

  // Next.js redirect must be outside try-catch to function correctly
  revalidateExam(examId);
  redirect(`/admin/exams/${examId}/questions`); // Redirect straight to the questions view
}
