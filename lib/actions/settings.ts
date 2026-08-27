'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { userSettings } from '@/lib/db/schema';
import { isExamType, type ExamType } from '@/lib/domain/exam-types';
import { captureException } from '@/lib/infra/observability';
import { limited } from '@/lib/infra/rate-limit';

export interface UserSettingsData {
  targetExamDate: string | null;
  targetExamType: string | null;
}

export async function getUserSettings(): Promise<UserSettingsData | null> {
  const { userId } = await auth();
  if (!userId) return null;
  // Returns null rather than an error: this is a preference read that the
  // dashboard renders around, and a throttled one must degrade, not break it.
  if (await limited('read', 'settings-get', userId)) return null;
  try {
    const [row] = await db
      .select({
        targetExamDate: userSettings.targetExamDate,
        targetExamType: userSettings.targetExamType,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (!row) return { targetExamDate: null, targetExamType: null };
    return {
      targetExamDate: row.targetExamDate ?? null,
      targetExamType: row.targetExamType ?? null,
    };
  } catch (err) {
    // Read-only preference; never let it take down the dashboard render.
    void captureException(err, { tags: { action: 'getUserSettings' } });
    return null;
  }
}

/** The column stores the target date as 'YYYY-MM-DD'; the form is an <input type="date">. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveUserSettings(
  data: UserSettingsData,
): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (await limited('write', 'settings-save', userId)) {
    return { error: 'Çox tez-tez yadda saxladınız. Bir az gözləyin.' };
  }

  const { targetExamDate, targetExamType } = data;

  if (targetExamDate) {
    // Format first: `new Date()` accepts plenty of strings the column does not,
    // and the dashboard countdown parses whatever is stored here.
    if (!ISO_DATE_RE.test(targetExamDate)) return { error: 'Invalid date' };
    if (Number.isNaN(new Date(targetExamDate).getTime())) return { error: 'Invalid date' };
  }
  if (targetExamType && !isExamType(targetExamType)) {
    return { error: 'Invalid exam type' };
  }

  /*
   * Clearing a field is just writing NULL.
   *
   * This used to need a hand-built $set/$unset pair, because Mongoose strips
   * `undefined` out of an update — so `$set: { targetExamDate: undefined }` was
   * a silent no-op and clearing a target date left the dashboard counting down
   * to it for ever. SQL has no such hole: NULL is a value like any other, and
   * `undefined` is normalised to it here at the one boundary that sees both.
   */
  const values = {
    targetExamDate: targetExamDate || null,
    targetExamType: (targetExamType || null) as ExamType | null,
  };

  try {
    // The primary key decides insert-or-update, so there is no read-then-write
    // for two tabs to race.
    await db
      .insert(userSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...values, updatedAt: new Date() },
      });
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'saveUserSettings' } });
    return { error: 'Server xətası.' };
  }
}
