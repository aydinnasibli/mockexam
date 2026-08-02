import { auth, currentUser } from '@clerk/nextjs/server';
import DashboardShell from './DashboardShell';

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
