import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExamSession extends Document {
  userId: string;
  examId: string;
  startedAt: Date;
  totalSeconds: number;
  playedAudioUrls: string[];
}

const ExamSessionSchema = new Schema<IExamSession>({
  userId:           { type: String, required: true },
  examId:           { type: String, required: true },
  startedAt:        { type: Date,   required: true },
  totalSeconds:     { type: Number, required: true },
  // Tracks which audio URLs have been played — enforced server-side
  playedAudioUrls:  { type: [String], default: [] },
});

ExamSessionSchema.index({ userId: 1, examId: 1 }, { unique: true });
// Auto-delete sessions 7 days after they were created
ExamSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ExamSessionModel: Model<IExamSession> =
  (mongoose.models.ExamSession as Model<IExamSession>) ||
  mongoose.model<IExamSession>('ExamSession', ExamSessionSchema);

export default ExamSessionModel;
