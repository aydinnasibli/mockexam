'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Renders its children only once Clerk reports a signed-in session.
 *
 * A client component on purpose, rather than Clerk's `<Show when="signed-in">`.
 * Imported into a SERVER component, `@clerk/nextjs` resolves `Show` to its async
 * server implementation, which awaits `auth()` — a request-time read of the
 * headers. In the footer, that opts every public page out of static rendering:
 * measured, every route in a build turned dynamic, the prerendered and
 * CDN-cached marketing site rendered per request for the sake of two links.
 *
 * Here the session is read in the browser, the way `Navbar` reads it. On the
 * server — and so in the prerendered HTML a crawler receives — `isLoaded` is
 * false and nothing renders.
 */
export default function SignedInOnly({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && isSignedIn ? <>{children}</> : null;
}
