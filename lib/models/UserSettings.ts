import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSettings extends Document {
  userId: string;
  targetExamDate?: string;  // 'YYYY-MM-DD'
  targetExamType?: string;  // 'sat' | 'ielts' | 'toefl'
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId:         { type: String, required: true, unique: true },
    targetExamDate: { type: String },
    targetExamType: { type: String, enum: ['sat', 'ielts', 'toefl'] },
  },
  { timestamps: true }
);

const UserSettings: Model<IUserSettings> =
  (mongoose.models.UserSettings as Model<IUserSettings>) ||
  mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);

export default UserSettings;
