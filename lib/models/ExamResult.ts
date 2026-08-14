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
  },
  { timestamps: true }
);

/*
 * Two indexes, not four.
 *
 * A compound index serves any prefix of its own key, so `{userId}` and
 * `{userId, examId}` were both already answered by the unique index below —
 * they only cost write amplification and storage on every attempt saved.
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
 * NOTE: Mongoose creates indexes but never drops them. Removing these two
 * declarations stops them being created on a fresh database; an existing
 * deployment keeps them until they are dropped by hand:
 *   db.examresults.dropIndex('userId_1')
 *   db.examresults.dropIndex('userId_1_examId_1')
 */
ExamResultSchema.index({ userId: 1, completedAt: -1 });
ExamResultSchema.index({ userId: 1, examId: 1, attemptNumber: 1 }, { unique: true });

const ExamResult: Model<IExamResult> =
  (mongoose.models.ExamResult as Model<IExamResult>) ||
  mongoose.model<IExamResult>('ExamResult', ExamResultSchema);

export default ExamResult;
