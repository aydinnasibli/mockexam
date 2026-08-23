import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWritingCriterion {
  criterion: string;
  score: number;
  comment: string;
}

export interface IAnswerRecord {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;    // -1 = unanswered, 0-3 = selected option
  userAnswerText?: string; // Text answer user provided for open/writing questions
  correctIndex: number;
  isCorrect: boolean;
  /** Marks available / earned. Only `matching` is ever worth more than 1. */
  marks: number;
  earnedMarks: number;
  timeSeconds: number;
  // Writing-specific fields
  writingScore?: number;       // 0-9 band score for writing
  writingWordCount?: number;
  writingCriteria?: IWritingCriterion[];
  aiFeedback?: string;         // Overall AI feedback paragraph
  writingPending?: boolean;    // true = essay saved but not yet graded (retry pending)
}

export interface IModuleScore {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
  pending?: boolean;           // true = writing module still awaiting AI grading
  band?: number;               // IELTS section band (0–9)
}

export interface IExamResult extends Document {
  userId: string;
  examId: string;
  examTitle: string;
  examTag: string;
  examType?: string;         // 'ielts' | 'sat' | ... — drives authentic score display
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  totalQuestions: number;
  score: number;             // normalised percentage (fallback + cross-exam average)
  overallBand?: number;      // IELTS overall band (0–9)
  totalScaled?: number;      // SAT total (400–1600)
  rwScaled?: number;         // SAT Reading & Writing (200–800)
  mathScaled?: number;       // SAT Math (200–800)
  answers: IAnswerRecord[];
  moduleScores: IModuleScore[];
  /**
   * When a grader last claimed this result's pending essays, or absent when
   * none holds it.
   *
   * The review page auto-grades on load and the rate limit allows several calls
   * per student per five minutes, so two tabs — or one refresh during a
   * ninety-second grader call — would otherwise run `evaluateWriting` on the
   * same essay concurrently. The answer is the same either way; the bill is
   * not. Claiming the document first means exactly one caller proceeds.
   *
   * A timestamp rather than a boolean because the claim has to expire: a
   * serverless instance killed mid-grade would otherwise hold a lock nothing
   * ever releases, and the essay would stay pending for ever.
   * See WRITING_CLAIM_TTL_MS in lib/actions/results.ts.
   */
  writingGradingAt?: Date;
  createdAt: Date;
}

const WritingCriterionSchema = new Schema<IWritingCriterion>({
  criterion: { type: String, required: true },
  score:     { type: Number, required: true },
  comment:   { type: String, required: true },
}, { _id: false });

const AnswerRecordSchema = new Schema<IAnswerRecord>({
  questionId:      { type: String, required: true },
  moduleIndex:     { type: Number, required: true },
  userAnswer:      { type: Number, required: true },
  userAnswerText:  { type: String, default: '' },
  correctIndex:    { type: Number, required: true },
  // Marks available / earned. Only `matching` is ever worth more than 1, so
  // these default to a plain single mark for every attempt saved before
  // per-item marking shipped.
  marks:           { type: Number, default: 1 },
  earnedMarks:     { type: Number, default: 0 },
  isCorrect:       { type: Boolean, required: true },
  timeSeconds:     { type: Number, required: true, default: 0 },
  writingScore:    { type: Number },
  writingWordCount:{ type: Number },
  writingCriteria: { type: [WritingCriterionSchema], default: undefined },
  aiFeedback:      { type: String },
  writingPending:  { type: Boolean },
}, { _id: false });

const ModuleScoreSchema = new Schema<IModuleScore>({
  moduleIndex:  { type: Number, required: true },
  moduleName:   { type: String, required: true },
  correct:      { type: Number, required: true },
  total:        { type: Number, required: true },
  scorePercent: { type: Number, required: true },
  pending:      { type: Boolean },
  band:         { type: Number },
}, { _id: false });

const ExamResultSchema = new Schema<IExamResult>(
  {
    // No field-level `index: true` on either: both are covered as prefixes of
    // the compound indexes declared below. See the note there.
    userId:          { type: String, required: true },
    examId:          { type: String, required: true },
    examTitle:       { type: String, required: true },
    examTag:         { type: String, required: true },
    examType:        { type: String },
    attemptNumber:   { type: Number, required: true },
    startedAt:       { type: Date,   required: true },
    completedAt:     { type: Date,   required: true },
    durationSeconds: { type: Number, required: true, min: 0 },
    totalQuestions:  { type: Number, required: true, min: 0 },
    score:           { type: Number, required: true, min: 0, max: 100 },
    overallBand:     { type: Number },
    totalScaled:     { type: Number },
    rwScaled:        { type: Number },
    mathScaled:      { type: Number },
    answers:         { type: [AnswerRecordSchema], default: [] },
    moduleScores:    { type: [ModuleScoreSchema],  default: [] },
    writingGradingAt:{ type: Date, default: undefined },
  },
  { timestamps: true }
);

/*
 * Every index here answers a query no other one can.
 *
 * Stated as a rule rather than a count, because the count has already drifted
 * once. A compound index serves any prefix of its own key, which is why
 * `{userId}` and `{userId, examId}` are absent: both were already answered by
 * the unique index below and cost write amplification on every attempt saved
 * for nothing. The reverse mistake is just as easy — see `{examId}` below,
 * which was dropped from this list while the query needing it stayed.
 *
 * So the test for anything added here is one sentence: name the query that
 * becomes a collection scan without it. If that sentence cannot be written,
 * the index does not belong.
 *
 *   {userId, completedAt:-1}
 *     getUserResults() and the admin user page: find({userId}) sorted by
 *     completedAt. The sort is served by the index rather than in memory.
 *
 *   {userId, examId, attemptNumber} unique
 *     Enforces one row per attempt, and its prefixes answer
 *     getExamResults({userId, examId}), getResultDetail(+attemptNumber),
 *     ExamResult.exists({userId, examId}) and the reverse scan that
 *     createResultWithNextAttempt() uses to find the current max attempt.
 *
 *   {examId}
 *     The one query that filters on examId WITHOUT a userId: the
 *     `countDocuments({examId})` guard in `deleteExam`. No index above can
 *     serve it — every one of them is prefixed on userId — so without this it
 *     is a collection scan over documents that each carry a full answer array.
 *
 *     It is declared here rather than left to drift: it existed as a
 *     field-level `index: true`, the declaration was removed while the query
 *     that needs it stayed, and the index survived on the deployed cluster
 *     doing useful work that nothing in the schema admitted to. An undeclared
 *     index doing real work is worse than a declared one — it reads as dead
 *     weight to the next person auditing this list, which is exactly how it
 *     nearly got dropped.
 *
 * NOTE: Mongoose creates indexes but never drops them, so removing a
 * declaration only stops it being created on a FRESH database — an existing
 * deployment keeps the index until it is dropped by hand. The three that were
 * redundant here have now been dropped from the live cluster:
 *   db.purchases.dropIndex('userId_1')
 *   db.examresults.dropIndex('userId_1')
 *   db.examresults.dropIndex('userId_1_examId_1')
 */
ExamResultSchema.index({ userId: 1, completedAt: -1 });
ExamResultSchema.index({ userId: 1, examId: 1, attemptNumber: 1 }, { unique: true });
ExamResultSchema.index({ examId: 1 });

/*
 * The writing queue: every result still waiting on the grader.
 *
 * `getWritingEvalProblems` and `adminRegradeAllPending` both filter on
 * `{'answers.writingPending': true}`, and nothing indexed it — so both scanned
 * the whole collection, and these are the heaviest documents stored here
 * (every answer record, every essay, in one array). Fine at today's volume and
 * linear in attempts for ever after.
 *
 * PARTIAL, not sparse. A sparse COMPOUND index indexes a document when ANY of
 * its keys exists, and `completedAt` is required — so sparse would index every
 * result ever saved and buy nothing. The partial filter is the same predicate
 * both call sites use, which is what lets the planner pick this index, and it
 * keeps the index to the handful of results actually awaiting grading: an entry
 * appears when an essay is filed and leaves the moment it is scored.
 *
 * `completedAt` rides along for the sort both callers apply. It cannot serve as
 * a sorted stream — `answers` is multikey, so one document yields many index
 * entries — but the matched set is tiny by construction, so the in-memory sort
 * over it is free. The second key earns its place by keeping the scan ordered
 * within a document rather than by avoiding the sort.
 */
ExamResultSchema.index(
  { 'answers.writingPending': 1, completedAt: 1 },
  { partialFilterExpression: { 'answers.writingPending': true } },
);

const ExamResult: Model<IExamResult> =
  (mongoose.models.ExamResult as Model<IExamResult>) ||
  mongoose.model<IExamResult>('ExamResult', ExamResultSchema);

export default ExamResult;
