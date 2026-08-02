import mongoose, { Schema, Document, Model } from 'mongoose';
import { EXAM_TYPE_VALUES, type ExamType } from '@/lib/exam-types';

export interface IUserSettings extends Document {
  userId: string;
  targetExamDate?: string;  // 'YYYY-MM-DD'
  targetExamType?: ExamType;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId:         { type: String, required: true, unique: true },
    targetExamDate: { type: String },
    targetExamType: { type: String, enum: EXAM_TYPE_VALUES },
  },
  { timestamps: true }
);

const UserSettings: Model<IUserSettings> =
  (mongoose.models.UserSettings as Model<IUserSettings>) ||
  mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);

export default UserSettings;
