import posthog from 'posthog-js';

/**
 * Client-side PostHog init — product analytics, session replay and error
 * tracking (this replaces Sentry).
 *
 * `api_host` points at our own /relay path, which next.config.ts rewrites to
 * PostHog's EU ingest. Requests therefore originate from our own domain, which
 * stops ad blockers silently dropping analytics and errors — the same job
 * Sentry's `tunnelRoute` did.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: '/relay',
    // When proxying, posthog-js still needs to know where the real instance is
    // so that "view in PostHog" links and asset URLs resolve correctly.
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',

    // App Router: posthog-js cannot observe client-side route changes on its
    // own, so <PostHogPageView> in the root layout captures them instead.
    capture_pageview: false,
    capture_pageleave: true,

    // Error tracking — the Sentry replacement.
    capture_exceptions: true,

    // Session replay. Everything textual is masked: this app renders exam
    // questions and student essays, none of which should leave the browser.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },

    persistence: 'localStorage+cookie',
    // Honour the browser's Do Not Track signal.
    respect_dnt: true,
  });
}
