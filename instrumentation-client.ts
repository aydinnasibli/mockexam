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
    // so that "view in PostHog" links and the toolbar resolve correctly.
    //
    // NOT NEXT_PUBLIC_POSTHOG_HOST: that is the *ingest* host
    // (eu.i.posthog.com), which is where events go, not where the dashboard
    // lives. Pointing ui_host at ingest sends every "view in PostHog" link to a
    // host that serves no UI.
    ui_host: 'https://eu.posthog.com',

    // App Router: posthog-js cannot observe client-side route changes on its
    // own, so <PostHogPageView> in the root layout captures them instead.
    capture_pageview: false,
    capture_pageleave: true,

    // Error tracking — the Sentry replacement.
    capture_exceptions: true,

    // Session replay.
    //
    // Masking is scoped, not global. `maskTextSelector: '*'` (PostHog's
    // "maximum privacy" preset) was the previous setting and blanked every
    // string on every page — nav, buttons, prices, error toasts — which makes a
    // replay impossible to read and therefore useless for diagnosing drop-off.
    //
    // Instead: all inputs are masked everywhere (so nothing a student types
    // ever leaves the browser), and `data-ph-mask` blanks the text of the exam
    // surfaces specifically — question stems, passages and essays. Marketing,
    // checkout and dashboard stay legible.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask], [data-ph-mask] *',
    },

    persistence: 'localStorage+cookie',
    // Honour the browser's Do Not Track signal.
    respect_dnt: true,
  });

  // Local development is not a user session. Without this, every `npm run dev`
  // page load files a replay and a pageview against the production project and
  // dilutes the real numbers.
  if (process.env.NODE_ENV === 'development') {
    posthog.opt_out_capturing();
  }
}
