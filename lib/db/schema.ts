/**
 * The relational shape of the exam platform.
 *
 * Two rules decide where a Mongo subdocument array lands here:
 *
 *   - It becomes a TABLE if anything ever queries it on its own. `answers` is
 *     the case that matters: the writing queue filters on it, and as a nested
 *     multikey array that filter needed a partial index plus twenty lines of
 *     justification. As a table it is one partial index on a plain column.
 *
 *   - It stays JSONB if it is only ever read alongside its parent AND its
 *     identity is its position. `modules` is the clearest case — `moduleIndex`
 *     on questions, results and sessions is literally an array index, and
 *     `syncExamTotals` writes `modules.N.questions`. A child table would add a
 *     join and make that positional contract harder to hold, not easier.
 *
 * Primary keys are `text` and carry the existing 24-character Mongo ObjectId
 * hex across unchanged. The app already treats these as opaque strings
 * (`lib/db/results.ts` did `id: String(d._id)`), and those same strings are
 * embedded in every stored result's answer array — so preserving them makes the
 * backfill a pure copy with no id remapping anywhere. New rows take a uuid.
 */
import {
  pgTable, text, integer, boolean, numeric, timestamp, jsonb, bigserial,
  index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { ModuleType, ModuleLayout, ExamType } from '@/lib/domain/exam-types';
import type { ExamVariant } from '@/lib/domain/exam-types';
import { EXAM_TYPE_VALUES, EXAM_VARIANT_VALUES } from '@/lib/domain/exam-types';
import type { QuestionType, WritingTaskType } from '@/lib/domain/question-types';
import { QUESTION_TYPES, WRITING_TASK_TYPES } from '@/lib/domain/question-types';

/** `text` PK default for new rows; existing rows keep their ObjectId hex. */
const newId = sql`gen_random_uuid()::text`;

/**
 * Renders a string list as a SQL `IN (...)` tuple for CHECK constraints.
 *
 * This is the one place in the codebase that reaches for `sql.raw`, which
 * bypasses parameterisation — a CHECK constraint is DDL and cannot take bound
 * parameters. Every current caller passes a compile-time constant, so nothing
 * user-supplied can reach it; the assertion below is what keeps that true if a
 * future caller forgets. Rejecting anything but plain identifier characters is
 * blunt on purpose: the values here are enum members, never prose.
 */
const inList = (values: readonly string[]) => {
  for (const v of values) {
    if (!/^[a-z0-9_]+$/i.test(v)) {
      throw new Error(`inList: refusing to inline unsafe literal ${JSON.stringify(v)}`);
    }
  }
  return sql.raw(`(${values.map(v => `'${v}'`).join(', ')})`);
};

const PURCHASE_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
export type PurchaseStatus = typeof PURCHASE_STATUSES[number];

/* ------------------------------------------------------------------ exams */

/**
 * One module's authored definition. Stored as an ordered JSONB array on the
 * exam; the index into that array IS the `moduleIndex` used everywhere else.
 */
export interface ExamModule {
  name: string;
  type: ModuleType;
  durationMinutes: number;
  questions: number;
  breakAfterMinutes: number;
  isAdaptive: boolean;
  instructions: string;
  layout: ModuleLayout;
}

export const exams = pgTable('exams', {
  // `examId` was already a stable natural key authored by an admin and used as
  // the public route segment, so it is the primary key outright. No ObjectId
  // for this table ever reaches Postgres.
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').$type<ExamType>().notNull(),
  /*
   * Academic vs General Training. Read only for IELTS, where the two editions
   * convert raw Reading scores on different band tables — see
   * `lib/domain/scoring.ts`. Every other exam type has one edition, so the
   * default is simply never consulted.
   */
  variant: text('variant').$type<ExamVariant>().notNull().default('academic'),
  description: text('description').notNull(),
  tag: text('tag').notNull(),
  // numeric, not a float: this is money and it is read by checkout.
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  features: text('features').array().notNull().default(sql`'{}'`),
  modules: jsonb('modules').$type<ExamModule[]>().notNull().default(sql`'[]'::jsonb`),
  // Both auto-computed from the live question bank by `syncExamTotals`.
  totalQuestions: integer('total_questions').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  // Partial: the catalog only ever asks for active exams, so inactive ones
  // need not sit in the index at all.
  index('exams_active_idx').on(t.isActive).where(sql`${t.isActive}`),
  check('exams_type_check', sql`${t.type} IN ${inList(EXAM_TYPE_VALUES)}`),
  check('exams_price_check', sql`${t.price} >= 0`),
  check('exams_variant_check', sql`${t.variant} IN ${inList(EXAM_VARIANT_VALUES)}`),
]);

/* -------------------------------------------------------------- questions */

export const questions = pgTable('questions', {
  id: text('id').primaryKey().default(newId),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  moduleIndex: integer('module_index').notNull(),
  order: integer('order').notNull().default(0),
  type: text('type').$type<QuestionType>().notNull().default('mcq'),
  // Questions sharing a blockId within a module render as one screen.
  blockId: text('block_id').notNull().default(''),
  passage: text('passage').notNull().default(''),
  audioUrl: text('audio_url').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  stem: text('stem').notNull(),
  // Native arrays rather than jsonb: these are flat string lists that are read
  // whole, and text[] keeps them typed and indexable without a cast.
  options: text('options').array().notNull().default(sql`'{}'`),
  openAnswers: text('open_answers').array().notNull().default(sql`'{}'`),
  correctIndex: integer('correct_index').notNull().default(-1),
  matchItems: text('match_items').array().notNull().default(sql`'{}'`),
  correctMatching: integer('correct_matching').array().notNull().default(sql`'{}'`),
  explanation: text('explanation').notNull().default(''),
  writingTaskType: text('writing_task_type').$type<WritingTaskType>(),
  minWords: integer('min_words'),
  maxWords: integer('max_words'),
  rubric: text('rubric').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  /*
   * THE fix for the orphaned-question-id bug.
   *
   * `importExamFromJson` used to delete an exam's questions and insert fresh
   * ones, minting new ObjectIds — so every result filed before a re-import
   * pointed at ids that no longer existed, and the review page rendered each
   * question as unanswered and wrong beneath the band the candidate actually
   * earned.
   *
   * This unique key gives the importer an ON CONFLICT target, so a re-import
   * UPDATES the question sitting in that slot and its id survives. The answer
   * snapshot on `examAnswers` covers the remaining case where a slot genuinely
   * disappears.
   */
  uniqueIndex('questions_slot_key').on(t.examId, t.moduleIndex, t.order),
  check('questions_module_index_check', sql`${t.moduleIndex} >= 0`),
  check('questions_type_check', sql`${t.type} IN ${inList(QUESTION_TYPES)}`),
  check(
    'questions_writing_task_type_check',
    sql`${t.writingTaskType} IS NULL OR ${t.writingTaskType} IN ${inList(WRITING_TASK_TYPES)}`,
  ),
]);

/* ----------------------------------------------------------- exam results */

export interface ModuleScore {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
  pending?: boolean;
  band?: number;
}

export const examResults = pgTable('exam_results', {
  id: text('id').primaryKey().default(newId),
  userId: text('user_id').notNull(),
  // RESTRICT, not CASCADE: a filed attempt is a record of something a candidate
  // paid for and sat. `deleteExam` guarded this with a countDocuments() check
  // the application had to remember to run; now the database enforces it.
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'restrict' }),
  // Deliberate snapshots — an exam renamed or retagged later must not rewrite
  // the history of attempts already sat under the old name.
  examTitle: text('exam_title').notNull(),
  examTag: text('exam_tag').notNull(),
  examType: text('exam_type'),
  attemptNumber: integer('attempt_number').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  // Normalised percentage — the cross-exam fallback and average.
  score: numeric('score', { precision: 5, scale: 2 }).notNull(),
  overallBand: numeric('overall_band', { precision: 3, scale: 1 }),  // IELTS 0–9
  totalScaled: integer('total_scaled'),                              // SAT 400–1600
  rwScaled: integer('rw_scaled'),                                    // SAT 200–800
  mathScaled: integer('math_scaled'),                                // SAT 200–800
  // Small, always read whole with the result, never filtered on. Stays JSONB.
  moduleScores: jsonb('module_scores').$type<ModuleScore[]>().notNull().default(sql`'[]'::jsonb`),
  /*
   * When a grader last claimed this result's pending essays.
   *
   * A timestamp rather than a boolean because the claim must expire — an
   * instance killed mid-grade would otherwise hold a lock nothing releases.
   * In Postgres the claim is a single atomic statement:
   *   UPDATE exam_results SET writing_grading_at = now()
   *    WHERE id = $1 AND (writing_grading_at IS NULL OR writing_grading_at < $2)
   *    RETURNING id;
   * An empty result means another caller holds it. No read-then-write.
   */
  writingGradingAt: timestamp('writing_grading_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  // One row per attempt. Its prefixes also answer every per-user and
  // per-user-per-exam read, which is why no narrower index is declared.
  uniqueIndex('exam_results_attempt_key').on(t.userId, t.examId, t.attemptNumber),
  // The dashboard list: filter by user, sort by recency, served by the index.
  index('exam_results_user_recent_idx').on(t.userId, t.completedAt.desc()),
  // Required by the RESTRICT foreign key check above, and by the admin
  // per-exam attempt count.
  index('exam_results_exam_idx').on(t.examId),
  check('exam_results_score_check', sql`${t.score} >= 0 AND ${t.score} <= 100`),
  check('exam_results_duration_check', sql`${t.durationSeconds} >= 0`),
  check('exam_results_total_questions_check', sql`${t.totalQuestions} >= 0`),
]);

export interface WritingCriterion {
  criterion: string;
  score: number;
  comment: string;
}

/**
 * One answer on a filed attempt.
 *
 * Was `ExamResult.answers[]` — a multikey subdocument array inside the heaviest
 * document in the system. Splitting it out is what turns the writing queue from
 * a partial multikey index needing a page of justification into one partial
 * index on a boolean column.
 */
export const examAnswers = pgTable('exam_answers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  resultId: text('result_id').notNull().references(() => examResults.id, { onDelete: 'cascade' }),
  /*
   * A SOFT link, deliberately nullable with ON DELETE SET NULL.
   *
   * The review page must never again depend on this resolving. What was asked
   * is snapshotted below; this column exists only so an intact bank can still
   * be linked back to for explanations and re-grading.
   */
  questionId: text('question_id').references(() => questions.id, { onDelete: 'set null' }),
  moduleIndex: integer('module_index').notNull(),
  userAnswer: integer('user_answer').notNull(),      // -1 = unanswered
  userAnswerText: text('user_answer_text').notNull().default(''),
  correctIndex: integer('correct_index').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  // Marks available / earned. Only `matching` is ever worth more than one.
  marks: integer('marks').notNull().default(1),
  earnedMarks: integer('earned_marks').notNull().default(0),
  timeSeconds: integer('time_seconds').notNull().default(0),
  writingScore: numeric('writing_score', { precision: 3, scale: 1 }),
  writingWordCount: integer('writing_word_count'),
  // Nests one level deeper than this row and is only ever read with it.
  writingCriteria: jsonb('writing_criteria').$type<WritingCriterion[]>(),
  aiFeedback: text('ai_feedback'),
  // NOT NULL with a default, unlike the Mongo field which was absent when
  // false — so the partial index below has a total predicate to work with.
  writingPending: boolean('writing_pending').notNull().default(false),

  /*
   * What the candidate was actually asked, copied at submit time.
   *
   * The review page renders from these, never from a join onto the live bank.
   * A re-import, an edit, or an outright deletion of the question can no longer
   * turn a filed attempt into a page of fabricated wrong answers — which is the
   * failure the review page used to have no defence against.
   */
  qStem: text('q_stem').notNull().default(''),
  qOptions: text('q_options').array().notNull().default(sql`'{}'`),
  qPassage: text('q_passage').notNull().default(''),
}, t => [
  index('exam_answers_result_idx').on(t.resultId),
  /*
   * The writing queue: every answer still waiting on the grader.
   *
   * Partial, so it holds only the handful of essays actually pending — an entry
   * appears when an essay is filed and leaves the moment it is scored. The
   * callers join up to `exam_results` for the `completedAt` sort, and the
   * matched set is tiny by construction, so that sort is free.
   */
  index('exam_answers_writing_queue_idx').on(t.resultId).where(sql`${t.writingPending}`),
]);

/* ---------------------------------------------------------- exam sessions */

export interface ModuleWindow {
  moduleIndex: number;
  startsAt: number;
  endsAt: number;
  breakEndsAt: number;
}

export interface SessionAnswer {
  questionId: string;
  userAnswer: number;
  userAnswerText?: string;
  timeSeconds?: number;
}

export interface SessionProgress {
  answers: SessionAnswer[];
  flagged: string[];
  currentIdx: number;
  updatedAt: string;
}

export const examSessions = pgTable('exam_sessions', {
  id: text('id').primaryKey().default(newId),
  userId: text('user_id').notNull(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  totalSeconds: integer('total_seconds').notNull(),
  // Frozen at session start so an admin editing module durations mid-attempt
  // cannot move a running candidate's deadlines.
  moduleSchedule: jsonb('module_schedule').$type<ModuleWindow[]>(),
  /*
   * The candidate's live draft, kept as JSONB on purpose.
   *
   * It is rewritten on every mirrored answer during an attempt, so one UPDATE
   * of a whole blob beats an upsert per answer — and nothing ever queries
   * inside it. It is also explicitly untrusted: `saveExamResult` re-marks
   * against the question bank at submit time regardless of what is here.
   */
  progress: jsonb('progress').$type<SessionProgress>(),
  // Bumped by the clock heartbeat and every mirrored draft. An attempt idle
  // longer than ATTEMPT_IDLE_LIMIT_SECONDS is finalised, never discarded.
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  /*
   * Replaces the 7-day Mongo TTL index. Reads MUST filter `expires_at > now()`
   * — correctness lives at read time, and the sweep is only housekeeping.
   */
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '7 days'`),
}, t => [
  uniqueIndex('exam_sessions_user_exam_key').on(t.userId, t.examId),
  index('exam_sessions_expiry_idx').on(t.expiresAt),
]);

/* -------------------------------------------------------------- purchases */

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey().default(newId),
  userId: text('user_id').notNull(),
  // RESTRICT: an exam somebody has paid for cannot be deleted out from under
  // the purchase record.
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'restrict' }),
  transactionId: text('transaction_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('AZN'),
  status: text('status').$type<PurchaseStatus>().notNull().default('COMPLETED'),
  attemptCount: integer('attempt_count').notNull().default(0),
  orderHistory: text('order_history').array().notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('purchases_user_exam_key').on(t.userId, t.examId),
  /*
   * The entitlement index. `hasExamAccess` runs on every protected page and
   * server action in the app, so this is the one index here that earns its
   * write cost.
   *
   * Partial, which is strictly better than the Mongo compound it replaces:
   * only COMPLETED rows are stored at all, so `status` never needs to be
   * compared and the index holds a fraction of the table. Both entitlement
   * reads are answered index-only, with no heap fetch —
   *   hasExamAccess: user_id + exam_id, status implied by the predicate
   *   ownedExamIds:  user_id prefix, exam_id read straight out of the index
   *
   * `exam_id` sits in the key rather than in an INCLUDE clause because Drizzle
   * has no DSL for covering columns; for a two-column key the difference is
   * a few bytes and nothing else.
   */
  index('purchases_entitlement_idx')
    .on(t.userId, t.examId)
    .where(sql`${t.status} = 'COMPLETED'`),
  check('purchases_status_check', sql`${t.status} IN ${inList(PURCHASE_STATUSES)}`),
]);

/* ------------------------------------------------------------ played audio */

/**
 * A listening track this candidate has already consumed.
 *
 * Outlives the session on purpose: it used to live on `ExamSession`, so
 * `restartExamSession` — one reload away at any point in an attempt — handed
 * the listen back and defeated the single-play rule in about four seconds.
 * `saveExamResult` clears the claim as it files a result, so a genuine retake
 * starts fresh; a restart, which leaves no record, does not.
 */
export const playedAudio = pgTable('played_audio', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  audioUrl: text('audio_url').notNull(),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  /*
   * Backstop for a claim whose attempt was never filed — NOT the mechanism
   * deciding when a track becomes available again. It must outlive the longest
   * listening module in the catalog (IELTS Listening runs 30 minutes), which is
   * why it is a day rather than the ten minutes it once was.
   *
   * Reads MUST filter `expires_at > now()`. That is a real improvement on the
   * Mongo TTL this replaces: the TTL monitor swept on a 60-second cycle, so an
   * expired claim stayed readable — and a spent track re-claimable — for up to
   * a minute after it should have lapsed.
   */
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '24 hours'`),
}, t => [
  /*
   * The unique index IS the claim. `markAudioPlayed` becomes
   *   INSERT ... ON CONFLICT DO NOTHING RETURNING id
   * where an empty result means "already played" — the guarantee comes from the
   * index rather than from catching a duplicate-key exception.
   */
  uniqueIndex('played_audio_claim_key').on(t.userId, t.examId, t.audioUrl),
  index('played_audio_expiry_idx').on(t.expiresAt),
]);

/* ----------------------------------------------------------- user settings */

export const userSettings = pgTable('user_settings', {
  // The Clerk user id is the natural key; there was never a second row per user.
  userId: text('user_id').primaryKey(),
  targetExamDate: text('target_exam_date'),  // 'YYYY-MM-DD'
  targetExamType: text('target_exam_type').$type<ExamType>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check(
    'user_settings_target_exam_type_check',
    sql`${t.targetExamType} IS NULL OR ${t.targetExamType} IN ${inList(EXAM_TYPE_VALUES)}`,
  ),
]);

/* ------------------------------------------------------------------ types */

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type ExamResult = typeof examResults.$inferSelect;
export type NewExamResult = typeof examResults.$inferInsert;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type NewExamAnswer = typeof examAnswers.$inferInsert;
export type ExamSession = typeof examSessions.$inferSelect;
export type NewExamSession = typeof examSessions.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type PlayedAudio = typeof playedAudio.$inferSelect;
export type NewPlayedAudio = typeof playedAudio.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

/*
 * `MODULE_TYPE_VALUES` and `MODULE_LAYOUTS` used to be re-exported from here,
 * which read as though they constrained something. They did not: `modules` is
 * JSONB, so neither value has a CHECK behind it — the enforcement is
 * `validateModules`, which both write paths go through. Both live in
 * `lib/domain/exam-types.ts`; import them from there.
 */
export { PURCHASE_STATUSES };
