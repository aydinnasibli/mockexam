'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import UserSettings from '@/lib/models/UserSettings';

export interface UserSettingsData {
  targetExamDate: string | null;
  targetExamType: string | null;
}

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const { userId } = await auth();
  if (!userId) return null;
  await dbConnect();
  const doc = await UserSettings.findOne({ userId }).lean();
  if (!doc) return { targetExamDate: null, targetExamType: null };
  return {
    targetExamDate: doc.targetExamDate ?? null,
    targetExamType: doc.targetExamType ?? null,
  };
}

export async function saveUserSettings(
  data: UserSettingsData,
): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const { targetExamDate, targetExamType } = data;

  if (targetExamDate) {
    const d = new Date(targetExamDate);
    if (isNaN(d.getTime())) return { error: 'Invalid date' };
  }
  if (targetExamType && !['sat', 'ielts', 'toefl'].includes(targetExamType)) {
    return { error: 'Invalid exam type' };
  }

  await dbConnect();
  const update: Record<string, string | null | undefined> = {};
  if (targetExamDate !== undefined) update.targetExamDate = targetExamDate ?? undefined;
  if (targetExamType !== undefined) update.targetExamType = targetExamType ?? undefined;

  await UserSettings.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true },
  );

  return { ok: true };
}
