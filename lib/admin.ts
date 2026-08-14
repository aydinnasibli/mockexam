// Resolves the caller's admin role from the Clerk session.
import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Roles } from '@/types/globals';

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
