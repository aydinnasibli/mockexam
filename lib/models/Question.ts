import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'mcq' | 'open' | 'matching' | 'writing';
export type WritingTaskType = 'task1' | 'task2' | 'integrated' | 'independent' | 'general';

export interface IQuestion extends Document {
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
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
    examId:          { type: String, required: true, index: true },
    moduleIndex:     { type: Number, required: true, min: 0 },
    order:           { type: Number, required: true, default: 0 },
    type:            { type: String, required: true, enum: ['mcq', 'open', 'matching', 'writing'], default: 'mcq' },
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

QuestionSchema.index({ examId: 1, moduleIndex: 1, order: 1 });

const QuestionModel: Model<IQuestion> =
  (mongoose.models.Question as Model<IQuestion>) ||
  mongoose.model<IQuestion>('Question', QuestionSchema);

export default QuestionModel;
