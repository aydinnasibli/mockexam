'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePostHog } from '@posthog/react';

/**
 * Binds the browser's anonymous PostHog identity to the Clerk user id.
 *
 * `lib/posthog/server.ts` resolves `getDistinctId` to the Clerk `userId`, so
 * every server-side event (purchase_completed, exam_submitted, writing_graded)
 * lands on `user_…`. The browser, meanwhile, starts life on a random anonymous
 * id. Without the identify() below those are two different people in PostHog:
 * the replay of a checkout sits on one person and the purchase event on
 * another, so no funnel that crosses client→server can ever resolve.
 *
 * Rendered as a null component inside <PostHogProvider> rather than called from
 * a sign-in handler, because this app authenticates through Clerk modals and
 * the hosted Account Portal — there is no single local sign-in callback to hang
 * it off. Reacting to Clerk's state covers every entry path, including a user
 * who arrives already signed in.
 */
export default function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  const posthog = usePostHog();

  useEffect(() => {
    // Clerk reports isLoaded=false while it resolves state; identifying then
    // would bind the anonymous id to the wrong (or no) user.
    if (!isLoaded || !posthog) return;

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
      });
      return;
    }

    // Signed out. reset() issues a fresh anonymous id so the next person on a
    // shared machine — a school or library computer, which this audience uses —
    // does not inherit the previous student's identity and replay.
    posthog.reset();
  }, [isLoaded, isSignedIn, user, posthog]);

  return null;
}
