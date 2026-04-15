import mongoose, { Schema, Document, Model } from 'mongoose';

export type ExamType = 'sat' | 'ielts' | 'toefl' | 'dim' | 'gre';

export interface IExam extends Document {
  examId: string;        // URL-safe unique identifier (e.g. "sat-mock-1")
  title: string;
  type: ExamType;
  description: string;
  tag: string;
  price: number;         // AZN
  durationMinutes: number;
  totalQuestions: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    examId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['sat', 'ielts', 'toefl', 'dim', 'gre'],
    },
    description: { type: String, required: true },
    tag: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExamSchema.index({ type: 1 });
ExamSchema.index({ isActive: 1 });

const ExamModel: Model<IExam> =
  (mongoose.models.Exam as Model<IExam>) ||
  mongoose.model<IExam>('Exam', ExamSchema);

export default ExamModel;
