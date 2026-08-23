import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * One module's timing window, in seconds from `startedAt`.
 *
 * Stored on the session rather than recomputed from the exam on every read, for
 * the same reason `totalSeconds` already is: an admin editing an exam's module
 * durations mid-attempt must not be able to move a running candidate's
 * deadlines. See `lib/domain/exam-timing.ts` for how it is built and read.
 */
export interface IModuleWindow {
  moduleIndex: number;
  startsAt: number;
  endsAt: number;
  breakEndsAt: number;
}

/**
 * One in-progress answer, mirrored to the server as the candidate works.
 *
 * Deliberately NOT graded or trusted: `saveExamResult` still marks against the
 * question bank at submit time. This exists so the work survives the browser.
 */
export interface ISessionAnswer {
  questionId: string;
  /** -1 = unanswered. Matching answers arrive as JSON in `userAnswerText`. */
  userAnswer: number;
  userAnswerText?: string;
  timeSeconds?: number;
}

/**
 * The candidate's live draft.
 *
 * Answers used to exist ONLY in the browser's localStorage. A cleared cache, a
 * dead laptop, or simply picking the exam back up on another device lost every
 * answer while the server clock kept running — and `restartExamSession`, which
 * throws the attempt away, was the only way out. Mirroring the draft here makes
 * an attempt recoverable anywhere the student signs in.
 */
export interface ISessionProgress {
  answers: ISessionAnswer[];
  flagged: string[];
  currentIdx: number;
  updatedAt: Date;
}

export interface IExamSession extends Document {
  userId: string;
  examId: string;
  startedAt: Date;
  totalSeconds: number;
  /**
   * @deprecated Superseded by the `PlayedAudio` collection, which survives a
   * restart. Retained so attempts already in flight keep their spent tracks;
   * nothing writes to it any more.
   */
  playedAudioUrls: string[];
  /**
   * Absent on sessions created before per-module timing shipped. The player
   * treats a missing schedule as the old single-clock behaviour so an attempt
   * that is already running cannot be broken mid-exam; the 7-day TTL below
   * clears the last of them out on its own.
   */
  moduleSchedule?: IModuleWindow[];
  /** Absent until the candidate's first answer is mirrored. */
  progress?: ISessionProgress;
  /**
   * Last time this attempt showed signs of life — bumped by the clock heartbeat
   * and by every mirrored draft.
   *
   * An attempt left alone for longer than `ATTEMPT_IDLE_LIMIT_SECONDS` is
   * finalised rather than resumed: the candidate's mirrored answers are graded
   * and the attempt closed. Absent on sessions predating this field, which fall
   * back to `startedAt`.
   */
  lastSeenAt?: Date;
}

const ModuleWindowSchema = new Schema<IModuleWindow>(
  {
    moduleIndex: { type: Number, required: true, min: 0 },
    startsAt:    { type: Number, required: true, min: 0 },
    endsAt:      { type: Number, required: true, min: 0 },
    breakEndsAt: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SessionAnswerSchema = new Schema<ISessionAnswer>(
  {
    questionId:     { type: String, required: true },
    userAnswer:     { type: Number, required: true, default: -1 },
    userAnswerText: { type: String, default: '' },
    timeSeconds:    { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const SessionProgressSchema = new Schema<ISessionProgress>(
  {
    answers:    { type: [SessionAnswerSchema], default: [] },
    flagged:    { type: [String], default: [] },
    currentIdx: { type: Number, default: 0, min: 0 },
    updatedAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExamSessionSchema = new Schema<IExamSession>({
  userId:           { type: String, required: true },
  examId:           { type: String, required: true },
  startedAt:        { type: Date,   required: true },
  totalSeconds:     { type: Number, required: true },
  // Tracks which audio URLs have been played — enforced server-side
  playedAudioUrls:  { type: [String], default: [] },
  moduleSchedule:   { type: [ModuleWindowSchema], default: undefined },
  progress:         { type: SessionProgressSchema, default: undefined },
  lastSeenAt:       { type: Date, default: undefined },
});

/**
 * How long an attempt may go unattended before it is closed out.
 *
 * The exam clock runs through an absence either way, so this is not about
 * time-keeping — it is about not leaving an attempt hanging indefinitely. When
 * it trips, the attempt is FINALISED from the mirrored draft, never discarded:
 * a candidate whose machine died still gets the work they had done graded.
 */
export const ATTEMPT_IDLE_LIMIT_SECONDS = 10 * 60;

ExamSessionSchema.index({ userId: 1, examId: 1 }, { unique: true });
// Auto-delete sessions 7 days after they were created
ExamSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ExamSessionModel: Model<IExamSession> =
  (mongoose.models.ExamSession as Model<IExamSession>) ||
  mongoose.model<IExamSession>('ExamSession', ExamSessionSchema);

export default ExamSessionModel;
