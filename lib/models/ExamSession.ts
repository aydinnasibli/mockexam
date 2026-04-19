import mongoose, { Schema } from 'mongoose';

const ExamSessionSchema = new Schema({
  userId:       { type: String, required: true },
  examId:       { type: String, required: true },
  startedAt:    { type: Date,   required: true },
  totalSeconds: { type: Number, required: true },
});

ExamSessionSchema.index({ userId: 1, examId: 1 }, { unique: true });
// Auto-delete sessions 7 days after they were created
ExamSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.models.ExamSession ?? mongoose.model('ExamSession', ExamSessionSchema);
