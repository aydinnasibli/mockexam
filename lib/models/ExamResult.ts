import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnswerRecord {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;    // -1 = unanswered, 0-3 = selected option
  userAnswerText?: string; // Text answer user provided for open questions
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
}

export interface IModuleScore {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
}

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
  score: number;
  answers: IAnswerRecord[];
  moduleScores: IModuleScore[];
  createdAt: Date;
}

const AnswerRecordSchema = new Schema<IAnswerRecord>({
  questionId:   { type: String, required: true },
  moduleIndex:  { type: Number, required: true },
  userAnswer:   { type: Number, required: true },
  userAnswerText: { type: String, default: '' },
  correctIndex: { type: Number, required: true },
  isCorrect:    { type: Boolean, required: true },
  timeSeconds:  { type: Number, required: true, default: 0 },
}, { _id: false });

const ModuleScoreSchema = new Schema<IModuleScore>({
  moduleIndex:  { type: Number, required: true },
  moduleName:   { type: String, required: true },
  correct:      { type: Number, required: true },
  total:        { type: Number, required: true },
  scorePercent: { type: Number, required: true },
}, { _id: false });

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
    answers:         { type: [AnswerRecordSchema], default: [] },
    moduleScores:    { type: [ModuleScoreSchema],  default: [] },
  },
  { timestamps: true }
);

ExamResultSchema.index({ userId: 1, examId: 1 });
ExamResultSchema.index({ userId: 1, completedAt: -1 });
ExamResultSchema.index({ userId: 1, examId: 1, attemptNumber: 1 }, { unique: true });

const ExamResult: Model<IExamResult> =
  (mongoose.models.ExamResult as Model<IExamResult>) ||
  mongoose.model<IExamResult>('ExamResult', ExamResultSchema);

export default ExamResult;
