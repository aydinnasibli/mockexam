'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import UserSettings from '@/lib/models/UserSettings';
import { isExamType } from '@/lib/exam-types';
import { captureException } from '@/lib/observability';

export interface UserSettingsData {
  targetExamDate: string | null;
  targetExamType: string | null;
}

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    await dbConnect();
    const doc = await UserSettings.findOne({ userId }).lean();
    if (!doc) return { targetExamDate: null, targetExamType: null };
    return {
      targetExamDate: doc.targetExamDate ?? null,
      targetExamType: doc.targetExamType ?? null,
    };
  } catch (err) {
    // Read-only preference; never let it take down the dashboard render.
    void captureException(err, { tags: { action: 'getUserSettings' } });
    return null;
  }
}

/** The schema stores the target date as 'YYYY-MM-DD'; the form is an <input type="date">. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveUserSettings(
  data: UserSettingsData,
): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const { targetExamDate, targetExamType } = data;

  if (targetExamDate) {
    // Format first: `new Date()` accepts plenty of strings the schema does not,
    // and the dashboard countdown parses whatever is stored here.
    if (!ISO_DATE_RE.test(targetExamDate)) return { error: 'Invalid date' };
    if (Number.isNaN(new Date(targetExamDate).getTime())) return { error: 'Invalid date' };
  }
  if (targetExamType && !isExamType(targetExamType)) {
    return { error: 'Invalid exam type' };
  }

  // Mongoose strips `undefined` values out of an update, so `$set: { field:
  // undefined }` was a no-op — clearing a target date or type silently did
  // nothing and the dashboard kept counting down. Cleared fields go to $unset.
  const $set: Record<string, string> = {};
  const $unset: Record<string, ''> = {};

  if (targetExamDate) $set.targetExamDate = targetExamDate;
  else if (targetExamDate !== undefined) $unset.targetExamDate = '';

  if (targetExamType) $set.targetExamType = targetExamType;
  else if (targetExamType !== undefined) $unset.targetExamType = '';

  const update = {
    ...(Object.keys($set).length ? { $set } : {}),
    ...(Object.keys($unset).length ? { $unset } : {}),
  };
  // Nothing to write — never send an empty update document to the driver.
  if (Object.keys(update).length === 0) return { ok: true };

  try {
    await dbConnect();
    await UserSettings.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, returnDocument: 'after' },
    );
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'saveUserSettings' } });
    return { error: 'Server xətası.' };
  }
}
