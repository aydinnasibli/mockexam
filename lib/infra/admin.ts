// Resolves the caller's admin role from the Clerk session.
import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Roles } from '@/types/globals';
import { limited, type RateLimitTier } from '@/lib/infra/rate-limit';

export async function checkRole(role: Roles): Promise<boolean> {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === role;
}

/**
 * Page-level admin guard for Server Components.
 *
 * `proxy.ts` and `app/admin/layout.tsx` both already gate these routes. This is
 * a third, independent check placed directly in each page, so that a page can
 * never render privileged data on the strength of an outer layer alone —
 * relevant because proxy-level authorization has historically been bypassable
 * (e.g. Next.js advisory GHSA-6gpp-xcg3-4w24), and because these pages read the
 * full user list, purchase records and revenue figures.
 *
 * Signed-out users go to Clerk's sign-in URL; signed-in non-admins to /dashboard.
 */
export async function requireAdminPage(): Promise<void> {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  if (sessionClaims?.metadata?.role !== 'admin') redirect('/dashboard');
}

/**
 * Server-action admin guard: role check, then a rate limit keyed on the admin.
 *
 * The role check is the security boundary; the limit is what bounds the damage
 * once that boundary has already failed — a stolen admin session, or a script
 * looping a destructive action. It is keyed on the admin's own id so one
 * compromised account cannot exhaust the budget for the others.
 *
 * `scope` names the group of actions sharing a budget. Deliberately coarse:
 * the goal is bounding a runaway caller, not distinguishing one admin verb from
 * the next.
 */
export async function requireAdminAction(
  scope: string,
  tier: RateLimitTier = 'admin',
  message = 'Forbidden',
): Promise<void> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== 'admin') throw new Error(message);
  if (await limited(tier, `admin-${scope}`, userId)) {
    throw new Error('Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.');
  }
}
