import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import DashboardShell from './DashboardShell';

/*
 * `noindex` for every page under the dashboard, as `/admin` and `/checkout`
 * already declare. It is defence in depth, not the main control: robots.txt
 * keeps compliant crawlers from fetching these at all — and a crawler that
 * never fetches a page never sees its meta tags either. This covers the agents
 * that ignore robots.txt, and any signed-in session a tool happens to crawl
 * through.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetched server-side so the sidebar renders with real user data on first
  // paint — no client-side pop-in. Deduped with the page's own currentUser()
  // call within the same request, so this costs no extra Clerk API roundtrip.
  const user = await currentUser();
  // There is no local /sign-in route; let Clerk resolve its own sign-in URL.
  if (!user) return (await auth()).redirectToSignIn();

  const viewer = {
    firstName: user.firstName ?? 'Tələbə',
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Tələbə',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    imageUrl: user.imageUrl,
  };

  return <DashboardShell viewer={viewer}>{children}</DashboardShell>;
}
