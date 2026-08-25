import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'mcq' | 'open' | 'matching' | 'writing';
export type WritingTaskType = 'task1' | 'task2' | 'integrated' | 'independent' | 'general';

export interface IQuestion extends Document {
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  /**
   * Questions sharing a blockId within a module are ONE screen.
   *
   * IELTS Listening is the reason this exists. The recording runs continuously
   * through four parts and never waits, and the real test puts the whole
   * ten-question part in front of the candidate while it plays — a form with
   * six numbered gaps IS one form, and the "you now have thirty seconds to look
   * at questions 1 to 10" pause only means something if there are ten questions
   * to look at. Rendering one question per screen against an unpausable
   * single-play track made four of the five IELTS listening question types
   * unanswerable rather than merely harder.
   *
   * Empty means the question stands alone, which is the correct behaviour for
   * TOEFL listening and for SAT, so existing banks keep working untouched.
   */
  blockId?: string;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;           // For diagram/map labeling questions
  stem: string;
  options: string[];           // MCQ: 3–5 choices. Matching: the right column (match targets).
  openAnswers?: string[];      // Valid string answers for open questions
  correctIndex: number;        // 0–N for mcq, -1 for open/matching
  matchItems?: string[];       // Left column items for matching
  correctMatching?: number[];  // Index into options for each matchItem
  explanation: string;
  // Writing-specific fields
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;             // Evaluation criteria shown to student and used by AI
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    // No field-level index: `{examId}` is already served as a prefix of the
    // compound index declared below. A standalone one only cost write
    // amplification on every question insert and update. The other models
    // (Purchase, ExamResult, Exam) all document and follow this same rule.
    examId:          { type: String, required: true },
    moduleIndex:     { type: Number, required: true, min: 0 },
    order:           { type: Number, required: true, default: 0 },
    type:            { type: String, required: true, enum: ['mcq', 'open', 'matching', 'writing'], default: 'mcq' },
    blockId:         { type: String, default: '', trim: true },
    passage:         { type: String, default: '' },
    audioUrl:        { type: String, default: '' },
    imageUrl:        { type: String, default: '' },
    stem:            { type: String, required: true, trim: true },
    options:         [{ type: String }],
    openAnswers:     [{ type: String, default: [] }],
    correctIndex:    { type: Number, default: -1 },
    matchItems:      [{ type: String }],
    correctMatching: [{ type: Number }],
    explanation:     { type: String, default: '' },
    writingTaskType: { type: String, enum: ['task1', 'task2', 'integrated', 'independent', 'general'] },
    minWords:        { type: Number, min: 0 },
    maxWords:        { type: Number, min: 0 },
    rubric:          { type: String, default: '' },
  },
  { timestamps: true }
);

/*
 * Serves `{examId}` on its own as well as the full ordered read, because a
 * compound index answers any PREFIX of its own key.
 *
 * NOTE: Mongoose creates indexes but never drops them. Removing the field-level
 * `index: true` above stops it being created on a fresh database; an existing
 * deployment keeps it until dropped by hand:
 *   db.questions.dropIndex('examId_1')
 */
QuestionSchema.index({ examId: 1, moduleIndex: 1, order: 1 });

const QuestionModel: Model<IQuestion> =
  (mongoose.models.Question as Model<IQuestion>) ||
  mongoose.model<IQuestion>('Question', QuestionSchema);

export default QuestionModel;
