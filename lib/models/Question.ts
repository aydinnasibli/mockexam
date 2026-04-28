import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionType = 'mcq' | 'open';

export interface IQuestion extends Document {
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  passage: string;
  stem: string;
  options: string[];       // 4 items for mcq, empty for open
  openAnswers?: string[];  // Valid string answers for open questions
  correctIndex: number;    // 0–3 for mcq, -1 for open
  explanation: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    examId:       { type: String, required: true, index: true },
    moduleIndex:  { type: Number, required: true, min: 0 },
    order:        { type: Number, required: true, default: 0 },
    type:         { type: String, required: true, enum: ['mcq', 'open'], default: 'mcq' },
    passage:      { type: String, default: '' },
    stem:         { type: String, required: true, trim: true },
    options:      [{ type: String }],
    openAnswers:  [{ type: String, default: [] }],
    correctIndex: { type: Number, default: -1 },
    explanation:  { type: String, default: '' },
  },
  { timestamps: true }
);

QuestionSchema.index({ examId: 1, moduleIndex: 1, order: 1 });

const QuestionModel: Model<IQuestion> =
  (mongoose.models.Question as Model<IQuestion>) ||
  mongoose.model<IQuestion>('Question', QuestionSchema);

export default QuestionModel;
