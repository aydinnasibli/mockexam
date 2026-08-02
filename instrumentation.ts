/**
 * Server + edge instrumentation.
 *
 * `onRequestError` from @posthog/next captures errors thrown in Server
 * Components, route handlers, server actions and the proxy, linking each to the
 * originating session and user. This is the server half of what Sentry's
 * `captureRequestError` used to do.
 */
export { onRequestError } from '@posthog/next';

export async function register() {
  // Nothing runtime-specific to set up: the PostHog server client is created
  // lazily per request in lib/posthog/server.ts.
}
