import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { freeClaims, purchases } from '@/lib/db/schema';
import { ensureUser } from '@/lib/db/users';

/**
 * `transactionId` prefix marking a purchase created by the first-free promotion
 * rather than by a payment. Mirrors `ADMIN_GRANT_PREFIX`, so the admin purchase
 * list can tell the three provenances apart at a glance.
 */
export const FIRST_FREE_PREFIX = 'FIRST-FREE';

/**
 * Whether the promotion is running.
 *
 * An environment variable, not a database setting: "until I say otherwise" is a
 * decision made a handful of times, by one person, and an env var is auditable,
 * instantly revertible, and impossible to flip by accident from an admin screen.
 * Server-side only — deliberately NOT `NEXT_PUBLIC_`. The eligibility a browser
 * is told about is derived on the server and passed down as a prop; a client
 * that could read the flag could also lie about it.
 *
 * Unset means OFF. A promotion that gives away inventory should require someone
 * to have typed the word "true", not merely to have forgotten to say "false".
 */
export function firstExamFreeEnabled(): boolean {
  return process.env.FIRST_EXAM_FREE === 'true';
}

export type ClaimOutcome =
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'already_claimed' | 'already_owned' };

/** The exam this user took for free, if they have used their claim. */
export async function claimedExamId(userId: string): Promise<string | null> {
  if (!userId) return null;
  const [row] = await db
    .select({ examId: freeClaims.examId })
    .from(freeClaims)
    .where(eq(freeClaims.userId, userId))
    .limit(1);
  return row?.examId ?? null;
}

/** Whether this user still has their free paper available. */
export async function canClaimFree(userId: string): Promise<boolean> {
  if (!firstExamFreeEnabled() || !userId) return false;
  return (await claimedExamId(userId)) === null;
}

/**
 * Spend this user's one free paper on `examId`.
 *
 * Ordering is the whole design. The claim row is written FIRST, because that
 * insert is what arbitrates: `userId` is the primary key, so of two concurrent
 * calls exactly one gets a row back and the other gets nothing — decided by
 * Postgres, not by a count this code read a moment earlier and hoped was still
 * true. Only the winner goes on to grant access.
 *
 * The whole sequence is then made RETRY-SAFE rather than transactional, which
 * is why it can run on the HTTP driver. A caller who wins the claim and then
 * fails to write the purchase (a dropped connection, a cold start) has burned
 * their claim on a paper they cannot open — so a second attempt at the SAME
 * paper is treated as a resumption: it re-runs the idempotent grant instead of
 * being rejected. Only a claim already spent on a DIFFERENT paper is refused.
 *
 * `setWhere` on the grant is the same guard checkout uses: a COMPLETED purchase
 * is never downgraded, so a free claim cannot overwrite a paper someone paid for.
 */
export async function claimFreeExam(userId: string, examId: string): Promise<ClaimOutcome> {
  if (!firstExamFreeEnabled()) return { ok: false, reason: 'disabled' };
  if (!userId || !examId) return { ok: false, reason: 'already_claimed' };

  // Nothing to spend a free claim on if they already own this paper.
  const [owned] = await db
    .select({ examId: purchases.examId })
    .from(purchases)
    .where(and(
      eq(purchases.userId, userId),
      eq(purchases.examId, examId),
      eq(purchases.status, 'COMPLETED'),
    ))
    .limit(1);
  if (owned) return { ok: false, reason: 'already_owned' };

  await ensureUser(userId);

  // The arbitration. An empty result means someone (possibly this user, in a
  // parallel request) already holds the single row.
  const [won] = await db
    .insert(freeClaims)
    .values({ userId, examId })
    .onConflictDoNothing({ target: freeClaims.userId })
    .returning({ examId: freeClaims.examId });

  if (!won) {
    // Lost the race, or spent the claim earlier. Resumable only for the paper
    // the claim was actually made against.
    const existing = await claimedExamId(userId);
    if (existing !== examId) return { ok: false, reason: 'already_claimed' };
  }

  await db
    .insert(purchases)
    .values({
      userId,
      examId,
      transactionId: `${FIRST_FREE_PREFIX}-${userId}-${examId}`,
      amountCents: 0,
      currency: 'AZN',
      status: 'COMPLETED',
    })
    .onConflictDoUpdate({
      target: [purchases.userId, purchases.examId],
      set: {
        transactionId: `${FIRST_FREE_PREFIX}-${userId}-${examId}`,
        amountCents: 0,
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
      setWhere: ne(purchases.status, 'COMPLETED'),
    });

  return { ok: true };
}
