import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExamResult extends Document {
  userId: string;
  examId: string;
  examTitle: string;
  examTag: string;
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  totalQuestions: number;
  score: number; // 0–100 percentage
  createdAt: Date;
}

const ExamResultSchema = new Schema<IExamResult>(
  {
    userId:          { type: String, required: true, index: true },
    examId:          { type: String, required: true, index: true },
    examTitle:       { type: String, required: true },
    examTag:         { type: String, required: true },
    attemptNumber:   { type: Number, required: true },
    startedAt:       { type: Date,   required: true },
    completedAt:     { type: Date,   required: true },
    durationSeconds: { type: Number, required: true, min: 0 },
    totalQuestions:  { type: Number, required: true, min: 0 },
    score:           { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

ExamResultSchema.index({ userId: 1, examId: 1 });
ExamResultSchema.index({ userId: 1, completedAt: -1 });

const ExamResult: Model<IExamResult> =
  (mongoose.models.ExamResult as Model<IExamResult>) ||
  mongoose.model<IExamResult>('ExamResult', ExamResultSchema);

export default ExamResult;
