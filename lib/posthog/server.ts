import { createPostHog } from '@posthog/next';
import { auth } from '@clerk/nextjs/server';

/**
 * Server-side PostHog entry point for the App Router.
 *
 * `getDistinctId` binds events to the authenticated Clerk user. The client
 * supplies a distinct id via cookie, but that is spoofable — resolving it here
 * means server-side events and flag evaluations are attributed to the real
 * user. Returning null falls back to the client identity, which is what we want
 * for anonymous visitors (so their pre-signup activity still stitches together).
 */
export const { getPostHog } = createPostHog({
  // apiKey falls back to NEXT_PUBLIC_POSTHOG_KEY
  options: {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  },
  getDistinctId: async () => {
    try {
      const { userId } = await auth();
      return userId ?? null;
    } catch {
      // auth() throws outside a request scope (e.g. during build) — fall back
      // to the client identity rather than breaking the render.
      return null;
    }
  },
});
